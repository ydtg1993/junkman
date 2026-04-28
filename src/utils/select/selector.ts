import { Select } from "./index";
import { SELECTOR_DIRECTION, SELECTOR_MODE } from "./types";
import { Icon } from "../../aid/icon";
import { createDOMFromTree } from "../../aid/dombuilder";
import { GlobalEventManager } from "../../aid/eventmanager";

export class Selector extends Select {
    private globalEvents = new GlobalEventManager();
    private dropdownWrapper: HTMLElement | null = null;
    private searchTimer: number | null = null;
    private selectedArea: HTMLElement | null = null;

    /** 更新触发器内显示已选标签 */
    private _selectedInputShow() {
        if (!this.selectedArea) return;
        const names: string[] = [];
        this.selectData.forEach((d) => {
            const name = Object.keys(this.select).find(key => this.select[key] === d);
            if (name) names.push(name);
        });
        this.selectedArea.innerHTML = '';
        if (this.limitNumber === 1) {
            const span = document.createElement('span');
            span.className = 'truncate';
            span.textContent = names[0] || this.placeholder;
            this.selectedArea.appendChild(span);
            return;
        }
        if (names.length === 0) {
            this.selectedArea.textContent = this.placeholder;
            return;
        }
        for (const name of names) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-sm badge-ghost gap-1';
            badge.innerHTML = `${name} <button class="btn btn-ghost btn-xs p-0 hover:bg-transparent" data-value="${this.select[name]}">✕</button>`;
            // 移除单个标签
            badge.querySelector('button')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this._onOptionToggle(this.select[name]!, true);
            });
            this.selectedArea.appendChild(badge);
        }
    }

    /** 构建选项列表（同原逻辑） */
    private _buildOptions(): Record<string, any>[] {
        const tree: Record<string, any>[] = [];
        let line = 0;
        for (const [name, value] of Object.entries(this.select)) {
            this.value_line_hash[value] = line;
            line++;
            tree.push({
                tag: 'li',
                nodes: [{
                    tag: 'a',
                    textContent: name,
                    attributes: { 'data-name': name, 'data-value': value },
                }],
            });
        }
        return tree;
    }

    /** 搜索输入框 */
    private _buildSearchInput(): Record<string, any> {
        return {
            tag: 'input',
            className: 'input input-bordered input-xs w-full',
            attributes: { placeholder: 'Search' },
            events: {
                input: (e: Event, dom: HTMLElement) => {
                    const keywords = (dom as HTMLInputElement).value;
                    const options: NodeListOf<HTMLElement> = this.parentNode.querySelectorAll('.dropdown-content li a');
                    if (!keywords) {
                        options.forEach((a) => (a.parentElement as HTMLElement).classList.remove('hidden'));
                        return;
                    }
                    if (this.searchTimer) clearTimeout(this.searchTimer);
                    this.searchTimer = window.setTimeout(() => {
                        options.forEach((a) => {
                            const text = a.getAttribute('data-name') || '';
                            const match = text.toLowerCase().includes(keywords.toLowerCase());
                            (a.parentElement as HTMLElement).classList.toggle('hidden', !match);
                        });
                        this.searchTimer = null;
                    }, 300);
                },
            },
        };
    }

    /** 切换选项状态 */
    private _onOptionToggle(value: string, forceDelete = false) {
        const isSelected = this.selectData.includes(value);
        if (forceDelete || isSelected) {
            this._tagCal(value, SELECTOR_MODE.Delete);
            // 更新菜单项样式
            const a = this.dropdownWrapper?.querySelector(`a[data-value="${value}"]`);
            if (a) {
                a.removeAttribute('active');
                const check = a.querySelector('.check-icon');
                if (check) check.remove();
            }
            this._selectedInputShow();
            if (this.selectData.length === 0 && this.selectedArea) {
                this.selectedArea.textContent = this.placeholder;
            }
        } else {
            this._tagCal(value, SELECTOR_MODE.Insert);
            if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                // 超出限制，移除最早的选中项
                const removedValue = this.selectData[0];
                this._tagCal(removedValue, SELECTOR_MODE.Delete);
                const removedA = this.dropdownWrapper?.querySelector(`a[data-value="${removedValue}"]`);
                if (removedA) {
                    removedA.removeAttribute('active');
                    removedA.querySelector('.check-icon')?.remove();
                }
            }
            const a = this.dropdownWrapper?.querySelector(`a[data-value="${value}"]`);
            if (a) {
                a.setAttribute('active', '1');
                a.insertAdjacentHTML('beforeend', `<span class="check-icon">${Icon.check}</span>`);
            }
            this._selectedInputShow();
        }
    }

    make(): this {
        const directionClassMap: Record<number, string> = {
            [SELECTOR_DIRECTION.Down]: 'dropdown-bottom',
            [SELECTOR_DIRECTION.Up]: 'dropdown-top',
            [SELECTOR_DIRECTION.Right]: 'dropdown-right',
            [SELECTOR_DIRECTION.Left]: 'dropdown-left',
            [SELECTOR_DIRECTION.RightUp]: 'dropdown-right dropdown-top',
            [SELECTOR_DIRECTION.RightMid]: 'dropdown-right',
            [SELECTOR_DIRECTION.LeftUp]: 'dropdown-left dropdown-top',
            [SELECTOR_DIRECTION.LeftMid]: 'dropdown-left',
            [SELECTOR_DIRECTION.Mid]: 'dropdown-bottom',
        };
        const dirClass = directionClassMap[this.direction] || 'dropdown-bottom';

        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.className = `dropdown ${dirClass} w-full`;
        this.dropdownWrapper = dropdownWrapper;

        // ───────── 触发器（仿原生 select 样式） ─────────
        const trigger = document.createElement('div');
        trigger.tabIndex = 0;
        trigger.className = 'select select-bordered flex items-center gap-2 min-h-[2.5rem] h-auto cursor-pointer py-1 px-3';
        this.selectedArea = document.createElement('div');
        this.selectedArea.className = 'flex flex-wrap items-center gap-1 flex-1';
        this.selectedArea.textContent = this.placeholder;
        trigger.appendChild(this.selectedArea);

        // ───────── 下拉内容 ─────────
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-1 hidden z-50';

        if (!this.searchOff) {
            const searchDiv = document.createElement('div');
            searchDiv.className = 'px-2 mb-1';
            searchDiv.appendChild(createDOMFromTree(this._buildSearchInput()));
            dropdownContent.appendChild(searchDiv);
        }

        const ul = document.createElement('ul');
        ul.className = 'overflow-y-auto';
        ul.style.maxHeight = this.maxHeight;
        const optionTree = this._buildOptions();
        optionTree.forEach((item: any) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = item.nodes[0].textContent;
            a.setAttribute('data-name', item.nodes[0].attributes['data-name']);
            a.setAttribute('data-value', item.nodes[0].attributes['data-value']);
            a.href = '#';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const value = a.getAttribute('data-value')!;
                this._onOptionToggle(value);
            });
            li.appendChild(a);
            ul.appendChild(li);
        });
        dropdownContent.appendChild(ul);

        dropdownWrapper.appendChild(trigger);
        dropdownWrapper.appendChild(dropdownContent);
        this.parentNode.appendChild(dropdownWrapper);

        // 开关下拉
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('hidden');
        });

        const closeDropdown = (e: MouseEvent) => {
            if (this.dropdownWrapper && !this.dropdownWrapper.contains(e.target as Node)) {
                dropdownContent.classList.add('hidden');
            }
        };
        this.globalEvents.add(document, 'click', closeDropdown);

        // 初始化
        (async () => {
            this.delayExec();
            if (this.selectedData.length > 0) {
                this.selectedData.forEach(v => this._onOptionToggle(v, true)); // 先同步状态
                this._selectedInputShow();
            }
            if (this.show) {
                dropdownContent.classList.remove('hidden');
            }
        })();

        return this;
    }

    public destroy() {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        this.globalEvents.removeAll();
        if (this.dropdownWrapper && this.dropdownWrapper.parentNode) {
            this.dropdownWrapper.parentNode.removeChild(this.dropdownWrapper);
            this.dropdownWrapper = null;
        }
    }
}