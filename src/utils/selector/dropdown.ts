import { Selector } from "./index";
import { SELECTOR_DIRECTION, SELECTOR_MODE, SelectorInterface } from "./init";
import { Icon } from "../../aid/icon";
import { createDOMFromTree } from "../../aid/dombuilder";
import { GlobalEventManager } from "../../aid/eventmanager";

export class Dropdown extends Selector implements SelectorInterface {
    private globalEvents = new GlobalEventManager();
    private dropdownWrapper: HTMLElement | null = null;
    private searchTimer: number | null = null;

    private _selectedInputShow(selectedDom: HTMLElement) {
        const names: string[] = [];
        this.selectData.forEach((d) => {
            const name = Object.keys(this.select).find(key => this.select[key] === d);
            if (name) names.push(name);
        });
        selectedDom.innerHTML = '';
        if (this.limitNumber === 1) {
            const span = document.createElement('span');
            span.className = 'truncate';
            span.textContent = names[0] || '';
            selectedDom.appendChild(span);
            return;
        }
        for (const name of names) {
            const span = document.createElement('span');
            span.className = 'badge badge-sm bg-base-300 text-base-content mx-0.5 truncate';
            span.textContent = name;
            span.title = name;
            selectedDom.appendChild(span);
        }
    }

    private _buildOptions(): Record<string, any>[] {
        const tree: Record<string, any>[] = [];
        const select = this.select;
        let line = 0;
        for (const [name, value] of Object.entries(select)) {
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
        this.dropdownWrapper = dropdownWrapper;  // 保存引用，便于销毁

        const trigger = document.createElement('label');
        trigger.tabIndex = 0;
        trigger.className = 'btn btn-sm flex items-center gap-1 justify-between leading-none';
        const selectedArea = document.createElement('span');
        selectedArea.className = 'selected-area flex items-center gap-1 truncate';
        selectedArea.textContent = this.placeholder;
        trigger.appendChild(selectedArea);
        trigger.appendChild(createDOMFromTree({ tag: 'span', textContent: '▼', className: 'text-xs' }));

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
                const name = a.getAttribute('data-name')!;
                const value = a.getAttribute('data-value')!;
                if (this.selectData.indexOf(value) !== -1) {
                    this._tagCal(value, SELECTOR_MODE.Delete);
                    a.removeAttribute('active');
                    const checkIcon = a.querySelector('.check-icon');
                    if (checkIcon) checkIcon.remove();
                    this._selectedInputShow(selectedArea);
                    if (this.selectData.length === 0) selectedArea.textContent = this.placeholder;
                } else {
                    this._tagCal(value, SELECTOR_MODE.Insert);
                    if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                        this.triggerEvent.enable = false;
                        const firstVal = this.selectData[0];
                        const firstIdx = this.value_line_hash[firstVal] + 1;
                        const popOpt = dropdownContent.querySelector(`li:nth-child(${firstIdx}) a`) as HTMLElement;
                        if (popOpt) popOpt.click();
                        this.triggerEvent.enable = true;
                    }
                    a.setAttribute('active', '1');
                    a.insertAdjacentHTML('beforeend', `<span class="check-icon">${Icon.check}</span>`);
                    this._selectedInputShow(selectedArea);
                }
            });
            li.appendChild(a);
            ul.appendChild(li);
        });
        dropdownContent.appendChild(ul);

        dropdownWrapper.appendChild(trigger);
        dropdownWrapper.appendChild(dropdownContent);
        this.parentNode.appendChild(dropdownWrapper);

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

        (async () => {
            this.delayExec();
            if (this.show) {
                dropdownContent.classList.remove('hidden');
            }
        })();

        return this;
    }

    public destroy() {
        // 清除搜索定时器
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        // 移除全局事件
        this.globalEvents.removeAll();
        // 移除 DOM（精确移除自身创建的 dropdown 容器）
        if (this.dropdownWrapper && this.dropdownWrapper.parentNode) {
            this.dropdownWrapper.parentNode.removeChild(this.dropdownWrapper);
            this.dropdownWrapper = null;
        }
    }
}