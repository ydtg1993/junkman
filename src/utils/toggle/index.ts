export interface ToggleOptions {
    /** 初始选中状态，默认 false */
    checked?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 尺寸：'sm' | 'md' | 'lg'，默认 'md' */
    size?: 'sm' | 'md' | 'lg';
    /** 开关值变化时的回调，参数为当前布尔值 */
    onChange?: (checked: boolean) => void;
    /** 挂载的容器元素（可以是选择器或 HTMLElement） */
    container: string | HTMLElement;
}

export class Toggle {
    private input: HTMLInputElement;
    private container: HTMLElement;
    private options: ToggleOptions;

    constructor(options: ToggleOptions) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container) as HTMLElement
            : options.container;
        if (!this.container) throw new Error('Toggle container not found');

        this.options = {
            checked: false,
            disabled: false,
            size: 'md',
            ...options,
        };

        this.input = document.createElement('input');
        this.input.type = 'checkbox';
        this.input.className = `toggle toggle-${this.options.size}`;
        if (this.options.checked) this.input.checked = true;
        if (this.options.disabled) this.input.disabled = true;

        this.input.addEventListener('change', () => {
            this.options.onChange?.(this.input.checked);
        });

        this.container.innerHTML = '';
        this.container.appendChild(this.input);
    }

    /**
     * 获取当前开关状态
     */
    public getValue(): boolean {
        return this.input.checked;
    }

    /**
     * 设置开关状态
     */
    public setValue(value: boolean): void {
        this.input.checked = value;
        // 手动触发 change 事件（可选）
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * 设置禁用状态
     */
    public setDisabled(disabled: boolean): void {
        this.input.disabled = disabled;
    }

    /**
     * 销毁组件，移除 DOM
     */
    public destroy(): void {
        this.input.remove();
    }
}