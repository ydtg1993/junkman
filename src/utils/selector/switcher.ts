import { Selector } from "./index";
import { SELECTOR_MODE, SELECTOR_TOWARDS, SelectorInterface } from "./init";
import { createDOMFromTree } from "../../aid/dombuilder";

export class Switcher extends Selector implements SelectorInterface {
    private buttonContainer: HTMLElement | null = null;

    /** 构建选项按钮树 */
    private _buildOptions(): Record<string, any>[] {
        const tree: Record<string, any>[] = [];
        const select = this.select;
        const optionClass = 'btn btn-sm';

        for (const [name, value] of Object.entries(select)) {
            tree.push({
                tag: 'button',
                attributes: {
                    'data-name': name,
                    'data-value': value,
                },
                className: optionClass,
                textContent: name,
                events: {
                    click: (e: Event, option: HTMLElement) => {
                        e.stopPropagation();
                        this.handleOptionClick(option, value);
                    },
                },
            });
        }
        return tree;
    }

    /** 处理选项点击（UI 交互 → 数据同步） */
    private handleOptionClick(option: HTMLElement, value: string) {
        // 已选中则取消
        if (this.selectData.includes(value)) {
            this._tagCal(value, SELECTOR_MODE.Delete);
            option.classList.remove('btn-active');
            return;
        }

        // 新增选中
        this._tagCal(value, SELECTOR_MODE.Insert);
        option.classList.add('btn-active');

        // 超出限制，移除最旧的选中（不再模拟 click，避免副作用）
        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
            const removedValue = this.selectData.shift()!;   // 移除数组第一个
            this._tagCal(removedValue, SELECTOR_MODE.Delete); // 同步内部计数/回调
            // 更新对应按钮的 UI
            const removedBtn = this.buttonContainer?.querySelector(
                `button[data-value="${removedValue}"]`
            ) as HTMLElement | null;
            if (removedBtn) {
                removedBtn.classList.remove('btn-active');
            }
        }
    }

    /** 创建 DOM */
    make(): this {
        const isVertical = this.towards === SELECTOR_TOWARDS.Vertical;
        const containerClass = isVertical ? 'btn-group btn-group-vertical' : 'btn-group';

        const domTree = {
            className: containerClass,
            nodes: this._buildOptions(),
        };

        // 保存按钮容器引用
        const parentNode = this.parentNode;
        this.buttonContainer = createDOMFromTree(domTree, parentNode) as HTMLElement;

        // 同步内部状态与 UI（基于 this.selectedData）
        this.syncUIWithSelectedData();

        // 处理 hidden input 等延迟操作
        (async () => {
            this.delayExec();
        })();

        return this;
    }

    /** 统一的方法：根据 this.selectedData 更新 UI 和 selectData */
    private syncUIWithSelectedData() {
        const container = this.buttonContainer;
        if (!container) return;

        const buttons = container.querySelectorAll<HTMLElement>('button[data-value]');
        this.selectData = []; // 重置

        buttons.forEach(btn => {
            const val = btn.getAttribute('data-value');
            if (val && this.selectedData.includes(val)) {
                btn.classList.add('btn-active');
                this.selectData.push(val);
            } else {
                btn.classList.remove('btn-active');
            }
        });

        // limit 控制（保留最后 limit 个）
        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
            this.selectData = this.selectData.slice(-this.limitNumber);
            buttons.forEach(btn => {
                const val = btn.getAttribute('data-value');
                if (val && !this.selectData.includes(val)) {
                    btn.classList.remove('btn-active');
                }
            });
        }
    }

    /** 外部设置当前选中值 */
    public selected(selected: string[]): this {
        if (!Array.isArray(selected)) {
            console.error('selected params must be array[string] !');
            return this;
        }

        // 过滤出合法值
        const validValues = Object.values(this.select);
        this.selectedData = selected
            .map(v => v.toString())
            .filter(v => validValues.includes(v));

        // 如果 UI 已存在，立即刷新
        if (this.buttonContainer) {
            this.syncUIWithSelectedData();
        }
        return this;
    }

    /** 销毁组件，清理 DOM 和引用 */
    public destroy() {
        if (this.buttonContainer && this.buttonContainer.parentNode) {
            this.buttonContainer.parentNode.removeChild(this.buttonContainer);
        }
        this.buttonContainer = null;
    }
}