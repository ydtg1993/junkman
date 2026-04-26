import { Selector } from "./index";
import { SELECTOR_MODE, SELECTOR_TOWARDS, SelectorInterface } from "./init";
import { createDOMFromTree } from "../../aid/dombuilder";

export class Switcher extends Selector implements SelectorInterface {

    /** 构建选项按钮 */
    private _buildOptions(): {}[] {
        const tree: any[] = [];
        const select = this.select;
        const optionClass = 'btn btn-sm';

        for (const name in select) {
            if (!select.hasOwnProperty(name)) continue;

            const value = select[name];

            tree.push({
                tag: 'button',
                attributes: {
                    'data-name': name,
                    'data-value': value
                },
                className: optionClass,
                textContent: name,
                events: {
                    click: (e: Event, option: HTMLElement) => {
                        e.stopPropagation();

                        // 已选中 → 取消
                        if (this.selectData.indexOf(value) !== -1) {
                            this._tagCal(value, SELECTOR_MODE.Delete);
                            option.classList.remove('btn-active');
                            return;
                        }

                        // 新增选中
                        this._tagCal(value, SELECTOR_MODE.Insert);
                        option.classList.add('btn-active');

                        // 👉 limit 控制（只在用户点击时触发）
                        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                            const firstValue = this.selectData[0];

                            // 找到对应按钮（不再用 nth-child）
                            const container = this.parentNode.querySelector(
                                this.towards === SELECTOR_TOWARDS.Vertical ? '.btn-group-vertical' : '.btn-group'
                            );

                            if (container) {
                                const firstBtn = container.querySelector(
                                    `button[data-value="${firstValue}"]`
                                ) as HTMLElement;

                                if (firstBtn) {
                                    this.triggerEvent.enable = false;
                                    firstBtn.click();
                                    this.triggerEvent.enable = true;
                                }
                            }
                        }
                    }
                }
            });
        }

        return tree;
    }

    /** 创建 DOM */
    make(): this {
        const isVertical = this.towards === SELECTOR_TOWARDS.Vertical;
        const containerClass = isVertical ? 'btn-group btn-group-vertical' : 'btn-group';

        const domTree = {
            className: containerClass,
            nodes: this._buildOptions()
        };

        createDOMFromTree(domTree, this.parentNode);

        // ✅ 初始化选中状态（核心修复）
        this.applyInitialSelection();

        // 处理 hidden input 等
        (async () => {
            this.delayExec();
        })();

        return this;
    }

    /** 初始化选中（不再使用 click！！！） */
    private applyInitialSelection() {
        if (!this.selectedData.length) return;

        const container = this.parentNode.querySelector(
            this.towards === SELECTOR_TOWARDS.Vertical ? '.btn-group-vertical' : '.btn-group'
        );

        if (!container) return;

        const buttons = container.querySelectorAll('button[data-value]');

        // 👉 先同步内部状态（避免 selected 只存数据）
        this.selectData = [];

        buttons.forEach((btn) => {
            const val = btn.getAttribute('data-value');

            if (val && this.selectedData.indexOf(val) !== -1) {
                // UI
                btn.classList.add('btn-active');

                // 数据同步
                this.selectData.push(val);
            } else {
                btn.classList.remove('btn-active');
            }
        });

        // 👉 初始化时也执行 limit（关键修复）
        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
            this.selectData = this.selectData.slice(-this.limitNumber);

            buttons.forEach((btn) => {
                const val = btn.getAttribute('data-value');
                if (val && this.selectData.indexOf(val) === -1) {
                    btn.classList.remove('btn-active');
                }
            });
        }
    }

    public selected(selected: string[]): this {
        if (!Array.isArray(selected)) {
            console.error('selected params must be array[string] !');
            return this;
        }

        // 转字符串 + 过滤非法值
        selected = selected.map(v => v.toString());
        const validValues = Object.keys(this.select).map(k => this.select[k]);
        this.selectedData = selected.filter(v => validValues.includes(v));

        // 👉 如果 DOM 已经存在 → 直接更新 UI（关键）
        this.updateUIFromSelected();

        return this;
    }

    private updateUIFromSelected() {
        const container = this.parentNode.querySelector(
            this.towards === SELECTOR_TOWARDS.Vertical ? '.btn-group-vertical' : '.btn-group'
        );

        if (!container) return; // 说明还没 make()

        const buttons = container.querySelectorAll('button[data-value]');

        // 清空当前选中（重新同步）
        this.selectData = [];

        buttons.forEach((btn) => {
            const val = btn.getAttribute('data-value');

            if (val && this.selectedData.indexOf(val) !== -1) {
                btn.classList.add('btn-active');
                this.selectData.push(val);
            } else {
                btn.classList.remove('btn-active');
            }
        });

        // 👉 limit 控制（动态也要生效）
        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
            this.selectData = this.selectData.slice(-this.limitNumber);

            buttons.forEach((btn) => {
                const val = btn.getAttribute('data-value');
                if (val && this.selectData.indexOf(val) === -1) {
                    btn.classList.remove('btn-active');
                }
            });
        }
    }
}