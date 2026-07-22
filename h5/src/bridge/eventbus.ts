/**
 * H5 侧事件总线
 * 用于订阅原生派发的事件（push.receive / app.foreground 等）
 */
export type EventListener<T = unknown> = (data: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on<T = unknown>(event: string, fn: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn as EventListener);
    return () => this.off(event, fn);
  }

  once<T = unknown>(event: string, fn: EventListener<T>): () => void {
    const wrapper: EventListener<T> = (data) => {
      this.off(event, wrapper);
      fn(data);
    };
    return this.on(event, wrapper);
  }

  off<T = unknown>(event: string, fn: EventListener<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(fn as EventListener);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  emit<T = unknown>(event: string, data?: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // 复制一份避免回调中 off 导致迭代异常
    Array.from(set).forEach((fn) => {
      try {
        (fn as EventListener<T>)(data as T);
      } catch (err) {
        console.error(`[EventBus] listener error for "${event}"`, err);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
