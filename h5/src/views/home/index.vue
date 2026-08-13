<template>
  <div class="home page">
    <van-sticky>
      <van-nav-bar :title="`记事项`">
        <template #right>
          <span class="home__date">{{ todayLabel }}</span>
        </template>
      </van-nav-bar>
    </van-sticky>

    <!-- 新建事项 -->
    <div class="home__create card">
      <van-field
        ref="creatorField"
        v-model="newTitle"
        placeholder="添加一个事项，如「喝水」「背单词」"
        :border="false"
        @keyup.enter="onCreate"
      >
        <template #button>
          <van-button size="small" type="primary" round @click="onCreate">添加</van-button>
        </template>
      </van-field>
    </div>

    <!-- 事项列表 -->
    <section class="home__section">
      <div class="home__section-title">
        我的事项 <span class="home__hint">点击即记录一次</span>
      </div>
      <van-empty v-if="!todo.items.length" description="还没有事项，先在上面添加一个吧" />
      <div v-else class="home__items">
        <button
          v-for="item in todo.items"
          :key="item.id"
          class="todo-chip"
          :style="{ '--chip': item.color }"
          @click="onTap(item)"
        >
          <span class="todo-chip__dot" />
          <span class="todo-chip__name">{{ item.title }}</span>
          <span class="todo-chip__score">+{{ item.score ?? 1 }}</span>
          <span v-if="todayCountOf(item.id)" class="todo-chip__badge">
            {{ todayCountOf(item.id) }}
          </span>
          <van-icon name="edit" class="todo-chip__edit" @click.stop="onEditItem(item)" />
          <van-icon name="cross" class="todo-chip__del" @click.stop="onDeleteItem(item)" />
        </button>
      </div>
    </section>

    <!-- 今日记录 -->
    <section class="home__section">
      <div class="home__section-title">
        今日记录
        <span class="home__hint">{{ todo.todayRecords.length }} 次 · {{ todo.todayScore }} 分</span>
      </div>
      <van-empty v-if="!todo.todayRecords.length" description="今天还没记录，点上面的事项试试" />
      <van-cell-group v-else inset>
        <van-swipe-cell v-for="rec in todo.todayRecords" :key="rec.id">
          <van-cell :title="rec.title" :label="rec.time">
            <template #icon>
              <span class="rec-dot" :style="{ background: colorOf(rec.itemId) }" />
            </template>
          </van-cell>
          <template #right>
            <van-button
              square
              type="danger"
              text="删除"
              class="del-btn"
              @click="onDeleteRec(rec)"
            />
          </template>
        </van-swipe-cell>
      </van-cell-group>
    </section>

    <!-- 数据备份 -->
    <section class="home__section">
      <div class="home__section-title">
        数据备份 <span class="home__hint">导出 / 导入，防止丢失</span>
      </div>
      <div class="home__backup card">
        <van-button
          block
          round
          icon="down"
          type="primary"
          class="home__backup-btn"
          @click="onExport"
        >
          导出备份
        </van-button>
        <van-button
          block
          round
          icon="upgrade"
          plain
          class="home__backup-btn"
          @click="showImport = true"
        >
          导入备份
        </van-button>
        <p class="home__backup-tip">
          导出会保存全部事项与记录；App 内通过系统分享「存储到文件」即可留存。
        </p>
        <van-button
          v-if="isAndroid"
          block
          round
          plain
          icon="plus"
          class="home__backup-btn"
          @click="onAddToHome"
        >
          添加到桌面（快速记一笔）
        </van-button>
      </div>
    </section>

    <!-- 编辑事项弹层（改标题 / 设分数） -->
    <van-popup
      v-model:show="showEdit"
      position="bottom"
      round
      :style="{ maxHeight: '80%' }"
      class="item-edit-popup"
    >
      <div class="item-edit-popup__head">
        <div class="item-edit-popup__title">编辑事项</div>
        <van-icon name="cross" class="item-edit-popup__close" @click="showEdit = false" />
      </div>
      <div class="item-edit-popup__body">
        <van-field
          v-model="editTitle"
          label="名称"
          placeholder="事项名称"
          :border="false"
          maxlength="20"
        />
        <div class="item-edit-popup__score">
          <span class="item-edit-popup__score-label">每次得分</span>
          <div class="stepper">
            <button class="stepper__btn" @click="stepScore(-1)">−</button>
            <span class="stepper__val">{{ editScore }}</span>
            <button class="stepper__btn" @click="stepScore(1)">+</button>
          </div>
        </div>
        <div class="item-edit-popup__presets">
          <button
            v-for="p in scorePresets"
            :key="p"
            class="preset"
            :class="{ 'preset--on': editScore === p }"
            @click="editScore = p"
          >
            +{{ p }}
          </button>
        </div>
        <van-button block round type="primary" class="item-edit-popup__save" @click="saveEdit">
          保存
        </van-button>
      </div>
    </van-popup>

    <!-- 导入备份弹层 -->
    <van-popup
      v-model:show="showImport"
      position="bottom"
      round
      :style="{ maxHeight: '80%' }"
      class="import-popup"
    >
      <div class="import-popup__head">
        <div class="import-popup__title">导入备份</div>
        <van-icon name="cross" class="import-popup__close" @click="showImport = false" />
      </div>
      <div class="import-popup__body">
        <van-button
          block
          round
          icon="description"
          plain
          type="primary"
          @click="triggerFile"
        >
          选择备份文件（.json）
        </van-button>
        <div class="import-popup__divider">或</div>
        <van-field
          v-model="importText"
          type="textarea"
          rows="5"
          autosize
          placeholder="把备份内容粘贴到这里"
          :border="true"
          class="import-popup__area"
        />
        <p class="import-popup__warn">
          导入将覆盖当前全部数据，请确认后再恢复。
        </p>
        <van-button block round type="primary" @click="doImport">
          恢复
        </van-button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        hidden
        @change="onFilePicked"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import confirm from '@/utils/dialog';
import toast from '@/utils/toast';
import { useTodoStore, type TodoItem, type TodoRecord } from '@/stores/todo';
import { formatMD } from '@/utils/date';
import { call, on } from '@/bridge';
import { usePlatform } from '@/composables/useApp';
import { useWidget } from '@/composables/useWidget';

defineOptions({ name: 'home' });

const todo = useTodoStore();
const newTitle = ref('');
const creatorField = ref<unknown>(null);
const { isWeb, isAndroid, isIOS } = usePlatform();

// 桌面组件（App Widget）数据桥接：数据变更自动同步、监听组件点记录
useWidget();

/** 聚焦「新建事项」输入框（桌面快捷方式拉起时直奔输入） */
function focusCreator(): void {
  const f = creatorField.value as { focus?: () => void } | null;
  f?.focus?.();
}

// 桌面快捷方式（快速记一笔）拉起：热启动走事件，冷启动走 pending 查询
let offQuickAdd: (() => void) | null = null;
onMounted(() => {
  offQuickAdd = on('quick_add', () => focusCreator());
  call('shortcut.getPendingQuickAdd')
    .then((r: { pending?: boolean }) => {
      if (r?.pending) focusCreator();
    })
    .catch(() => {});
});
onUnmounted(() => {
  offQuickAdd?.();
});

/** 请求原生把「快速记一笔」钉到桌面 */
async function onAddToHome(): Promise<void> {
  try {
    const res = (await call('shortcut.requestPin', { label: '快速记一笔' })) as
      | { pinned?: boolean }
      | undefined;
    if (res?.pinned) {
      toast.success('已请求添加，请在桌面确认');
    } else {
      toast.error('添加失败：请到系统设置开启本应用「桌面快捷方式」权限后重试');
    }
  } catch {
    toast.info('当前环境不支持');
  }
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
const now = new Date();
const todayLabel = computed(() => `${formatMD(now)} 周${weekdays[now.getDay()]}`);

function onCreate(): void {
  const t = newTitle.value.trim();
  if (!t) {
    toast.warning('请输入事项名称');
    return;
  }
  todo.addItem(t);
  newTitle.value = '';
}

function onTap(item: TodoItem): void {
  const score = item.score ?? 1;
  todo.tapItem(item.id);
  const hhmm = new Date().toTimeString().slice(0, 5);
  toast.success(`已记录 · +${score}分 ${hhmm}`);
}

function todayCountOf(id: string): number {
  return todo.todayStats.find((s) => s.id === id)?.count ?? 0;
}

function colorOf(id: string): string {
  return todo.items.find((i) => i.id === id)?.color ?? '#1989fa';
}

async function onDeleteItem(item: TodoItem): Promise<void> {
  try {
    await confirm({
      title: '删除事项',
      message: `确定删除「${item.title}」吗？相关记录也会一并删除。`,
      danger: true
    });
    todo.removeItem(item.id);
    toast.success('已删除');
  } catch {
    /* 取消 */
  }
}

// ========== 编辑事项：改名称 / 设分数 ==========
const showEdit = ref(false);
const editingItem = ref<TodoItem | null>(null);
const editTitle = ref('');
const editScore = ref(1);
const scorePresets = [1, 2, 3, 5, 10];

function onEditItem(item: TodoItem): void {
  editingItem.value = item;
  editTitle.value = item.title;
  editScore.value = item.score ?? 1;
  showEdit.value = true;
}

function stepScore(delta: number): void {
  editScore.value = Math.max(1, editScore.value + delta);
}

function saveEdit(): void {
  const item = editingItem.value;
  if (!item) return;
  todo.updateItem(item.id, { title: editTitle.value, score: editScore.value });
  showEdit.value = false;
  toast.success('已保存');
}

async function onDeleteRec(rec: TodoRecord): Promise<void> {
  try {
    await confirm({ title: '删除记录', message: '确定删除这条记录吗？', danger: true });
    todo.removeRecord(rec.id);
    toast.success('已删除');
  } catch {
    /* 取消 */
  }
}

// ========== 数据备份：导出 / 导入 ==========
const showImport = ref(false);
const importText = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function buildBackup(): string {
  return JSON.stringify(todo.exportData(), null, 2);
}

/** 浏览器预览：直接下载为 .json 文件 */
function downloadInWeb(json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notepad-backup-${stamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 兜底复制（WebView 内 navigator.clipboard 可能不可用） */
function copyText(text: string): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return;
  }
  fallbackCopy(text);
}
function fallbackCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta);
}

async function onExport(): Promise<void> {
  const json = buildBackup();
  if (isWeb.value) {
    downloadInWeb(json);
    toast.success('已导出备份文件');
    return;
  }
  // 原生环境：走 share 桥唤起系统分享，用户可「存储到文件」留存
  const payload = { title: '记事本备份', content: json };
  if (isIOS.value) {
    // iOS 回调链路不回传，直接唤起分享即可
    call('share', payload).catch(() => {});
    toast.success('已唤起系统分享，选「存储到文件」即可保存');
    return;
  }
  try {
    await call('share', payload, 5000);
    toast.success('已唤起系统分享，选「存储到文件」即可保存');
  } catch {
    copyText(json);
    toast.success('已复制到剪贴板，可粘贴保存');
  }
}

function triggerFile(): void {
  fileInput.value?.click();
}

function onFilePicked(e: Event): void {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    importText.value = String(reader.result || '');
    toast.success('已读取文件，点「恢复」应用');
  };
  reader.onerror = () => toast.error('文件读取失败');
  reader.readAsText(f);
  // 允许重复选择同一文件
  input.value = '';
}

async function doImport(): Promise<void> {
  const text = importText.value.trim();
  if (!text) {
    toast.warning('请先选择文件或粘贴备份内容');
    return;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    toast.error('内容不是有效的 JSON');
    return;
  }
  try {
    await confirm({
      title: '导入备份',
      message: '导入将覆盖当前全部数据，确认恢复吗？',
      danger: true
    });
  } catch {
    return;
  }
  try {
    const counts = todo.importData(data);
    toast.success(`已恢复 ${counts.items} 个事项、${counts.records} 条记录`);
    showImport.value = false;
    importText.value = '';
  } catch (err) {
    toast.error((err as Error).message || '导入失败');
  }
}
</script>

<style lang="scss" scoped>
.home {
  &__date {
    font-size: $font-xs;
    color: $color-text-secondary;
  }

  &__create {
    margin-top: $spacing-md;
  }

  &__section {
    margin-top: $spacing-lg;
  }
  &__section-title {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-lg;
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__hint {
    font-size: $font-xs;
    font-weight: 400;
    color: $color-text-secondary;
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-md;
    padding: 0 $spacing-lg;
  }
}

.todo-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  border: none;
  border-radius: 999px;
  background: $color-background-light;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  font-size: $font-md;
  color: $color-text;
  cursor: pointer;
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease;

  &:active {
    transform: scale(0.95);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--chip, #1989fa);
  }
  &__name {
    font-weight: 500;
  }
  &__badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--chip, #1989fa);
    color: #fff;
    font-size: $font-xs;
    line-height: 18px;
    text-align: center;
  }
  &__del {
    margin-left: 2px;
    color: $color-text-disabled;
    font-size: 14px;
  }

  &__score {
    font-size: $font-xs;
    font-weight: 600;
    color: var(--chip, #1989fa);
    background: color-mix(in srgb, var(--chip, #1989fa) 12%, transparent);
    padding: 1px 7px;
    border-radius: 999px;
    line-height: 18px;
  }
  &__edit {
    margin-left: 2px;
    color: $color-text-disabled;
    font-size: 14px;
  }
}

.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: $spacing-sm;
  align-self: center;
}

.del-btn {
  height: 100%;
}

// 编辑事项弹层
.item-edit-popup {
  display: flex;
  flex-direction: column;

  &__head {
    position: relative;
    display: flex;
    align-items: center;
    padding: $spacing-lg $spacing-lg $spacing-md;
    border-bottom: 1px solid $color-border;
  }
  &__title {
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__close {
    position: absolute;
    top: $spacing-lg;
    right: $spacing-lg;
    font-size: 20px;
    color: $color-text-secondary;
  }
  &__body {
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }
  &__score {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-sm $spacing-md;
    background: $color-background-light;
    border-radius: $radius-md;
  }
  &__score-label {
    font-size: $font-md;
    color: $color-text;
  }
  &__save {
    margin-top: $spacing-sm;
  }
}

// 分数步进器
.stepper {
  display: inline-flex;
  align-items: center;
  gap: $spacing-md;
  &__btn {
    width: 32px;
    height: 32px;
    border: 1px solid $color-border;
    border-radius: 50%;
    background: #fff;
    font-size: 18px;
    line-height: 1;
    color: $color-primary;
    cursor: pointer;
  }
  &__val {
    min-width: 28px;
    text-align: center;
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
}

.item-edit-popup__presets {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  .preset {
    padding: $spacing-xs $spacing-md;
    border: 1px solid $color-border;
    border-radius: 999px;
    background: $color-background-light;
    font-size: $font-sm;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all 0.16s ease;
    &--on {
      border-color: $color-primary;
      color: $color-primary;
      background: color-mix(in srgb, $color-primary 10%, transparent);
      font-weight: 600;
    }
  }
}

// 数据备份
.home__backup {
  margin: 0 $spacing-lg;
  padding: $spacing-lg;

  &-btn {
    & + & {
      margin-top: $spacing-md;
    }
  }
  &-tip {
    margin: $spacing-md 0 0;
    font-size: $font-xs;
    color: $color-text-secondary;
    line-height: 1.5;
  }
}

// 导入弹层
.import-popup {
  display: flex;
  flex-direction: column;

  &__head {
    position: relative;
    display: flex;
    align-items: center;
    padding: $spacing-lg $spacing-lg $spacing-md;
    border-bottom: 1px solid $color-border;
  }
  &__title {
    font-size: $font-lg;
    font-weight: 600;
    color: $color-text;
  }
  &__close {
    position: absolute;
    top: $spacing-lg;
    right: $spacing-lg;
    font-size: 20px;
    color: $color-text-secondary;
  }
  &__body {
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }
  &__divider {
    text-align: center;
    font-size: $font-xs;
    color: $color-text-secondary;
  }
  &__area {
    background: $color-background-light;
    border-radius: $radius-md;
  }
  &__warn {
    margin: 0;
    font-size: $font-xs;
    color: $color-danger;
    line-height: 1.5;
  }
}
</style>
