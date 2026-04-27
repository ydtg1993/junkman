export enum ToastPosition {
    TopLeft = 'top-left',
    TopCenter = 'top-center',
    TopRight = 'top-right',
    MiddleLeft = 'middle-left',
    MiddleCenter = 'middle-center',
    MiddleRight = 'middle-right',
    BottomLeft = 'bottom-left',
    BottomCenter = 'bottom-center',
    BottomRight = 'bottom-right',
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;          // 自动关闭时间(ms)，0 表示不自动关闭
    position?: ToastPosition;   // 位置（使用枚举）
    closable?: boolean;         // 是否显示手动关闭按钮
}

export class Toast {
    private container: HTMLElement;

    constructor(position: ToastPosition = ToastPosition.TopRight) {
        // 确保容器存在
        const existing = document.querySelector(`.toast-container[data-position="${position}"]`);
        if (existing) {
            this.container = existing as HTMLElement;
        } else {
            this.container = document.createElement('div');
            this.container.className = 'toast-container fixed z-[9999] flex flex-col gap-2 p-2 pointer-events-none';
            this.container.setAttribute('data-position', position);
            this.applyPosition(position);
            document.body.appendChild(this.container);
        }
    }

    private applyPosition(position: ToastPosition) {
        const styles: Record<string, string> = {};
        switch (position) {
            case ToastPosition.TopLeft: styles.top = '1rem'; styles.left = '1rem'; break;
            case ToastPosition.TopCenter: styles.top = '1rem'; styles.left = '50%'; styles.transform = 'translateX(-50%)'; break;
            case ToastPosition.TopRight: styles.top = '1rem'; styles.right = '1rem'; break;
            case ToastPosition.MiddleLeft: styles.top = '50%'; styles.left = '1rem'; styles.transform = 'translateY(-50%)'; break;
            case ToastPosition.MiddleCenter: styles.top = '50%'; styles.left = '50%'; styles.transform = 'translate(-50%, -50%)'; break;
            case ToastPosition.MiddleRight: styles.top = '50%'; styles.right = '1rem'; styles.transform = 'translateY(-50%)'; break;
            case ToastPosition.BottomLeft: styles.bottom = '1rem'; styles.left = '1rem'; break;
            case ToastPosition.BottomCenter: styles.bottom = '1rem'; styles.left = '50%'; styles.transform = 'translateX(-50%)'; break;
            case ToastPosition.BottomRight: styles.bottom = '1rem'; styles.right = '1rem'; break;
        }
        Object.assign(this.container.style, styles);
    }

    show(options: ToastOptions): HTMLElement {
        const { message, type = 'info', duration = 3000, closable = true } = options;

        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto w-80 transition-all duration-300';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';

        const alertClass = `alert alert-${type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'}`;
        toast.innerHTML = `
      <div class="${alertClass} shadow-lg">
        <span>${message}</span>
        ${closable ? '<button class="btn btn-sm btn-ghost ml-2" onclick="this.closest(\'.pointer-events-auto\').remove()">✕</button>' : ''}
      </div>
    `;

        // 关闭处理
        let autoCloseTimer: number | undefined;
        if (duration > 0) {
            autoCloseTimer = window.setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        if (closable) {
            const closeBtn = toast.querySelector('button');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (autoCloseTimer) clearTimeout(autoCloseTimer);
                    this.removeToast(toast);
                });
            }
        }

        this.container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        return toast;
    }

    private removeToast(toast: HTMLElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (toast.parentNode === this.container) {
                this.container.removeChild(toast);
            }
        }, 300);
    }

    public destroy() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}