export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  duration?: number;
  timestamp: number;
}

export class ToastState {
  items = $state<ToastItem[]>([]);

  show(
    type: ToastType,
    title: string,
    message?: string,
    action?: ToastAction,
    duration: number = 4500
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ToastItem = {
      id,
      type,
      title,
      message,
      action,
      duration,
      timestamp: Date.now(),
    };

    // Giữ tối đa 4 toasts cùng lúc
    this.items = [...this.items.slice(-3), newItem];

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(title: string, message?: string, action?: ToastAction, duration?: number): string {
    return this.show('success', title, message, action, duration);
  }

  error(title: string, message?: string, action?: ToastAction, duration?: number): string {
    return this.show('error', title, message, action, duration || 6000);
  }

  info(title: string, message?: string, action?: ToastAction, duration?: number): string {
    return this.show('info', title, message, action, duration);
  }

  warning(title: string, message?: string, action?: ToastAction, duration?: number): string {
    return this.show('warning', title, message, action, duration);
  }

  dismiss(id: string) {
    this.items = this.items.filter((item) => item.id !== id);
  }

  clear() {
    this.items = [];
  }
}

export const toast = new ToastState();
