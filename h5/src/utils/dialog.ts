/**
 * 统一二次确认封装（基于 Vant showConfirmDialog）
 * --------------------------------------------------
 * 项目用 @vant/auto-import-resolver 按需引入，但 Dialog 是「函数式调用」
 * (showConfirmDialog)，其默认 CSS 不会被自动打进项目（与 Toast 同坑）。
 * 弹窗卡片样式由 src/styles/dialog.scss 统一提供，改一处全项目生效。
 *
 * 用法：
 *   import confirm from '@/utils/dialog';
 *   try {
 *     await confirm({ title: '删除记录', message: '确定删除这条记录吗？', danger: true });
 *     // 执行删除
 *   } catch {
 *     // 用户取消，不操作
 *   }
 */
import { showConfirmDialog } from 'vant';

export interface ConfirmOptions {
  /** 标题，省略则不显示标题栏 */
  title?: string;
  /** 提示内容 */
  message: string;
  /** 确认按钮文案，默认「确定」 */
  confirmText?: string;
  /** 取消按钮文案，默认「取消」 */
  cancelText?: string;
  /** 危险操作（删除等）→ 确认按钮变红，强化警示 */
  danger?: boolean;
}

/** 弹出二次确认。用户确认时 resolve，取消/关闭时 reject。 */
export function confirm(options: ConfirmOptions): Promise<void> {
  return showConfirmDialog({
    title: options.title,
    message: options.message,
    confirmButtonText: options.confirmText ?? '确定',
    cancelButtonText: options.cancelText ?? '取消',
    // Dialog 无 danger 主题，用 className 触发 .app-dialog--danger 红色确认按钮
    className: options.danger ? 'app-dialog--danger' : undefined
  }).then(() => undefined);
}

export default confirm;
