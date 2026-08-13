/**
 * 桌面组件（App Widget）数据桥接组合式。
 *
 * 职责：
 * 1. 待办数据变化时，把「事项 + 今日次数」推送到原生（widget.sync），原生写入
 *    SharedPreferences 并刷新桌面组件。
 * 2. 从原生共享存储（storage.local.get 'widget:records'）合并桌面组件点记录产生的
 *    记录 —— 组件点击不打开 App，记录先落在原生，这里在 App 打开/回到前台时拉取，
 *    合并进本地 store，使统计与组件一致。
 *
 * 组件本身由原生 RemoteViews 渲染，无法直接跑 H5，因此这是数据出入的唯一通道。
 * 组件点击的「+1」由原生 WidgetRecordReceiver 直接完成（不拉起 App），不再走
 * H5 事件链路，从根本上避免了「点了没记上 / 拉起 App」的问题。
 */
import { watch, onMounted, onUnmounted } from 'vue';
import { call } from '@/bridge';
import type { WidgetPayload } from '@hybrid/bridge-protocol';
import { useTodoStore, type TodoRecord } from '@/stores/todo';
import { todayStr } from '@/utils/date';

/** 原生桌面组件点记录写入的共享存储 key（hybrid_storage） */
const WIDGET_RECORDS_KEY = 'widget:records';

type TodoStore = ReturnType<typeof useTodoStore>;

/** 把当前事项 + 今日次数推给原生组件 */
async function pushPayload(todo: TodoStore): Promise<void> {
  // 没有事项时不推送，让组件保持「还没有事项」空态
  if (!todo.items.length) return;
  const counts = new Map(todo.todayStats.map((s) => [s.id, s.count]));
  const payload: WidgetPayload = {
    date: todayStr(),
    todayScore: todo.todayScore,
    items: todo.items.map((i) => ({
      id: i.id,
      title: i.title,
      color: i.color,
      score: i.score ?? 1,
      count: counts.get(i.id) ?? 0
    }))
  };
  try {
    await call('widget.sync', { payload });
  } catch {
    // 浏览器 / 桥未就绪时静默忽略
  }
}

/**
 * 从原生共享存储合并桌面组件点记录产生的记录。
 * 失败（无原生 / 坏数据）一律静默忽略，不影响主流程。
 */
async function pullNativeRecords(todo: TodoStore): Promise<void> {
  let raw: unknown;
  try {
    const res = await call('storage.local.get', { key: WIDGET_RECORDS_KEY });
    raw = (res as { value?: unknown }).value;
  } catch {
    return;
  }
  if (typeof raw !== 'string' || !raw) return;
  try {
    const incoming = JSON.parse(raw) as TodoRecord[];
    if (Array.isArray(incoming) && incoming.length) {
      todo.mergeRecords(incoming);
    }
  } catch {
    // 坏数据忽略
  }
}

/** 供 main.ts 的 __todoResync / 原生回到前台调用：合并原生记录并刷新组件 */
export async function resyncWidget(): Promise<void> {
  const todo = useTodoStore();
  await pullNativeRecords(todo);
  await pushPayload(todo);
}

export function useWidget() {
  const todo = useTodoStore();

  let stopWatch: (() => void) | undefined;

  onMounted(async () => {
    // 冷启动：先合并原生记录（不打开 App 时点的记录），再同步组件，最后通知原生就绪
    await pullNativeRecords(todo);
    await pushPayload(todo);

    try {
      await call('app.ready');
    } catch {
      // ignore
    }

    // 数据变更自动同步组件
    stopWatch = watch(
      () => [todo.items, todo.records] as const,
      () => {
        void pushPayload(todo);
      },
      { deep: true }
    );
  });

  onUnmounted(() => {
    stopWatch?.();
  });

  return { syncWidget: () => pushPayload(todo), pullNativeRecords: () => pullNativeRecords(todo) };
}
