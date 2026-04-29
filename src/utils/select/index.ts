import { SELECTOR_DIRECTION, SELECTOR_MODE, SELECTOR_TOWARDS } from "./types";

export abstract class Select {
    protected container: HTMLElement;
    protected select: { [key: string]: string } = {};
    protected limitNumber!: number;
    protected selectedData: string[] = [];
    protected selectData: string[] = [];
    protected insertData: string[] = [];
    protected deleteData: string[] = [];
    protected searchOff: boolean = false;
    protected triggerEvent: { func: Function | null; enable: boolean } = { func: null, enable: false };
    protected SELECT_INPUT_DOM: HTMLElement | null = null;
    protected INSERT_INPUT_DOM: HTMLElement | null = null;
    protected DELETE_INPUT_DOM: HTMLElement | null = null;
    protected value_line_hash: { [id: string]: number } = {};

    protected towards: SELECTOR_TOWARDS = SELECTOR_TOWARDS.Horizontal;
    protected placeholder: string = '-select-';
    protected maxHeight: string = '150px';
    protected hiddenInput: string | null = null;
    protected direction: SELECTOR_DIRECTION = SELECTOR_DIRECTION.Down;
    protected show: boolean = false;
    protected wrap: boolean = false;

    constructor(
        container: string | HTMLElement,
        select: { [key: string]: string },
        options: {
        limit?: number;
        searchOff?: boolean;
        trigger?: Function;
        hiddenInput?: string;
        direction?: SELECTOR_DIRECTION;
        towards?: SELECTOR_TOWARDS;
        placeholder?: string;
        show?: boolean;
        wrap?: boolean;
        menuMaxHeight?: string;
    }) {
        // 解析容器
        if (typeof container === 'string') {
            const el = document.querySelector<HTMLElement>(container);
            if (!el) throw new Error(`Selector container not found: ${container}`);
            this.container = el;
        } else if (container instanceof HTMLElement) {
            this.container = container;
        } else {
            throw new Error('Invalid container parameter');
        }

        this.select = select;

        if (typeof options.limit === "number") {
            this.limitNumber = options.limit;
        }
        this.searchOff = true;
        if (typeof options.searchOff === "boolean") {
            this.searchOff = options.searchOff;
        }
        if (typeof options.trigger === "function") {
            this.triggerEvent = { func: options.trigger, enable: true };
        }
        if (typeof options.hiddenInput === "string") {
            this.hiddenInput = options.hiddenInput;
        }
        if (typeof options.placeholder === "string") {
            this.placeholder = options.placeholder;
        }
        if (typeof options.show === "boolean") {
            this.show = options.show;
        }
        if (typeof options.wrap === "boolean") {
            this.wrap = options.wrap;
        }
        if (typeof options.menuMaxHeight === "string") {
            this.maxHeight = options.menuMaxHeight;
        }

        // direction 和 towards 处理保留类型安全
        if (options.direction !== undefined && Object.values(SELECTOR_DIRECTION).includes(options.direction)) {
            this.direction = options.direction;
        }
        if (options.towards !== undefined && Object.values(SELECTOR_TOWARDS).includes(options.towards)) {
            this.towards = options.towards;
        }
    }

    selected(selected: string[]): this {
        if (!Array.isArray(selected)) {
            console.error('selected params must be array[string] !');
            return this;
        }
        selected = selected.map(elem => elem.toString());
        this.selectedData = selected.filter(d =>
            Object.keys(this.select).map(key => this.select[key]).includes(d)
        );

        // 异步模拟点击更新子类UI（Menu 专用，Switcher 已重写，不会执行）
        (async () => {
            const options = this.container.querySelectorAll('.dropdown-content li a');
            if (options.length > 0) {
                options.forEach((D) => {
                    if (!(D instanceof HTMLElement)) return;
                    const value = D.getAttribute('data-value') as string;
                    if (this.selectedData.includes(value)) {
                        this.triggerEvent.enable = false;
                        D.click();
                        this.triggerEvent.enable = true;
                    }
                });
                const content = this.container.querySelector('.dropdown-content') as HTMLElement;
                if (content && !this.show) content.classList.add('hidden');
            }
        })();
        return this;
    }

    protected _tagCal(value: string, operate: SELECTOR_MODE) {
        let index = this.selectData.indexOf(value);
        if (operate === SELECTOR_MODE.Insert) {
            if (index === -1) {
                this.selectData.push(value);
                if (this.SELECT_INPUT_DOM instanceof HTMLElement) {
                    (this.SELECT_INPUT_DOM as HTMLInputElement).value = JSON.stringify(this.selectData);
                }
            }
            if (!this.selectedData.includes(value) && !this.insertData.includes(value)) {
                this.insertData.push(value);
                if (this.INSERT_INPUT_DOM instanceof HTMLElement) {
                    (this.INSERT_INPUT_DOM as HTMLInputElement).value = JSON.stringify(this.insertData);
                }
            }
            index = this.deleteData.indexOf(value);
            if (index !== -1) {
                this.deleteData.splice(index, 1);
                if (this.DELETE_INPUT_DOM instanceof HTMLElement) {
                    (this.DELETE_INPUT_DOM as HTMLInputElement).value = JSON.stringify(this.deleteData);
                }
            }
        } else {
            if (index !== -1) {
                this.selectData.splice(index, 1);
                if (this.SELECT_INPUT_DOM instanceof HTMLElement) {
                    (this.SELECT_INPUT_DOM as HTMLInputElement).value = JSON.stringify(this.selectData);
                }
            }
            if (this.selectedData.includes(value) && !this.deleteData.includes(value)) {
                this.deleteData.push(value);
                if (this.DELETE_INPUT_DOM instanceof HTMLElement) {
                    (this.DELETE_INPUT_DOM as HTMLInputElement).value = JSON.stringify(this.deleteData);
                }
            }
            index = this.insertData.indexOf(value);
            if (index !== -1) {
                this.insertData.splice(index, 1);
                if (this.INSERT_INPUT_DOM instanceof HTMLElement) {
                    (this.INSERT_INPUT_DOM as HTMLInputElement).value = JSON.stringify(this.insertData);
                }
            }
        }

        if (typeof this.triggerEvent.func === 'function' && this.triggerEvent.enable) {
            this.triggerEvent.func({
                value,
                operate,
                select: this.selectData,
                insert: this.insertData,
                delete: this.deleteData,
            });
        }
    }

    protected delayExec() {
        if (typeof this.hiddenInput === "string") {
            const name = this.hiddenInput;
            this.container.insertAdjacentHTML('beforeend', `
<input name="${name}[select]" value="[]" type="hidden" />
<input name="${name}[insert]" value="[]" type="hidden" />
<input name="${name}[delete]" value="[]" type="hidden" />`);
            this.SELECT_INPUT_DOM = this.container.querySelector(`input[name='${name}[select]']`);
            this.INSERT_INPUT_DOM = this.container.querySelector(`input[name='${name}[insert]']`);
            this.DELETE_INPUT_DOM = this.container.querySelector(`input[name='${name}[delete]']`);
        }
        if (this.selectedData.length > 0) {
            this.selected(this.selectedData);
        }
    }

    make(): this {
        return this;
    }

    /**
     * 清理基类资源（隐藏输入框引用）
     * 子类应重写此方法并调用 super.destroy()
     */
    public destroy() {
        this.SELECT_INPUT_DOM = null;
        this.INSERT_INPUT_DOM = null;
        this.DELETE_INPUT_DOM = null;
    }
}