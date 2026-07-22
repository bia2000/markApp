/**
 * 消息中心状态
 *
 * - 未读数由原生 push.receive 事件累加，并显示在原生 TabBar 角标
 * - 列表数据由 H5 接口拉取
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '@/utils/request';
import { onPushReceive } from '@/bridge/helpers';

export interface MessageItem {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'order' | 'activity';
  createdAt: number;
  read: boolean;
}

export const useMessageStore = defineStore('message', () => {
  const list = ref<MessageItem[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const finished = ref(false);
  const page = ref(1);
  const pageSize = 20;

  const hasUnread = computed(() => unreadCount.value > 0);

  /** 拉取消息列表（首页） */
  async function fetchList(refresh = false): Promise<void> {
    if (loading.value) return;
    if (refresh) {
      page.value = 1;
      finished.value = false;
    }
    if (finished.value) return;
    loading.value = true;
    try {
      const res = await http.get<{ items: MessageItem[]; total: number }>('/messages', {
        page: page.value,
        pageSize
      });
      if (refresh) {
        list.value = res.items;
      } else {
        list.value.push(...res.items);
      }
      if (res.items.length < pageSize) finished.value = true;
      else page.value += 1;
      // 未读数从列表统计
      unreadCount.value = list.value.filter((m) => !m.read).length;
    } catch {
      // 接口失败：使用 mock 数据兜底（开发预览）
      if (refresh) {
        list.value = mockMessages;
      }
      finished.value = true;
      unreadCount.value = list.value.filter((m) => !m.read).length;
    } finally {
      loading.value = false;
    }
  }

  /** 标记单条已读 */
  async function markRead(id: string): Promise<void> {
    await http.post(`/messages/${id}/read`);
    const item = list.value.find((m) => m.id === id);
    if (item && !item.read) {
      item.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  /** 全部已读 */
  async function markAllRead(): Promise<void> {
    await http.post('/messages/read-all');
    list.value.forEach((m) => (m.read = true));
    unreadCount.value = 0;
  }

  /** 收到推送：累加未读（由原生事件触发） */
  function addUnread(): void {
    unreadCount.value += 1;
  }

  // 订阅原生 push.receive 事件
  onPushReceive(() => {
    addUnread();
  });

  // mock 数据（接口不可达时用于本地预览）
  const mockMessages: MessageItem[] = [
    { id: 'm1', title: '订单已发货', content: '您的订单已由北京分拣中心发出，预计明日送达', type: 'order', createdAt: Date.now() - 3600000, read: false },
    { id: 'm2', title: '系统升级公告', content: 'App 将于本周三凌晨 2:00-4:00 进行升级维护', type: 'system', createdAt: Date.now() - 86400000, read: false },
    { id: 'm3', title: '运单签收成功', content: '运单 SO20240722001 已签收，感谢使用', type: 'order', createdAt: Date.now() - 172800000, read: true },
    { id: 'm4', title: '新用户专享优惠', content: '首单立减 50 元，立即下单享受', type: 'activity', createdAt: Date.now() - 259200000, read: true }
  ];

  return {
    list,
    unreadCount,
    hasUnread,
    loading,
    finished,
    fetchList,
    markRead,
    markAllRead,
    addUnread
  };
});
