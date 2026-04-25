import { Selector } from "./index";
import { SELECTOR_DIRECTION, SELECTOR_MODE, SELECTOR_TOWARDS, SelectorInterface } from "./init";
import { Icon } from "../../aid/icon";
import { createDOMFromTree } from "../../aid/dombuilder";

export class Menu extends Selector implements SelectorInterface {
    private _selectedInputShow(selectedDom: HTMLElement) {
        let names: string[] = [];
        this.selectData.forEach((d) => {
            let name = Object.keys(this.select).find(key => this.select[key] === d) as string;
            names.push(name);
        });
        selectedDom.innerHTML = '';
        if (this.limitNumber === 1) {
            const span = document.createElement('span');
            span.className = 'truncate';
            span.textContent = names[0] || '';
            selectedDom.appendChild(span);
            return;
        }
        for (let name of names) {
            const span = document.createElement('span');
            span.className = 'badge badge-sm bg-base-300 text-base-content mx-0.5 truncate';
            span.textContent = name;
            span.title = name;
            selectedDom.appendChild(span);
        }
    }

    private _buildOptions(): {}[] {
        let tree = [];
        let line = 0;
        let select = this.select;
        for (let name in select) {
            if (!select.hasOwnProperty(name)) continue;
            this.value_line_hash[select[name]] = line;
            line++;
            tree.push({
                tag: 'li',
                nodes: [{
                    tag: 'a',
                    textContent: name,
                    attributes: { 'data-name': name, 'data-value': select[name] },
                }]
            });
        }
        return tree;
    }

    private _buildSearchInput(): {} {
        return {
            tag: 'input',
            className: 'input input-bordered input-xs w-full',
            attributes: { placeholder: 'Search' },
            events: {
                input: (e: Event, dom: HTMLElement) => {
                    let keywords = (dom as HTMLInputElement).value;
                    let options: NodeListOf<HTMLElement> = this.parentNode.querySelectorAll('.dropdown-content li a');
                    if (!keywords) {
                        options.forEach((a) => (a.parentElement as HTMLElement).classList.remove('hidden'));
                        return;
                    }
                    setTimeout(() => {
                        options.forEach((a) => {
                            let text = a.getAttribute('data-name') || '';
                            if (keywords.indexOf(text) !== -1 || text.indexOf(keywords) !== -1) {
                                (a.parentElement as HTMLElement).classList.remove('hidden');
                            } else {
                                (a.parentElement as HTMLElement).classList.add('hidden');
                            }
                        });
                    }, 300);
                }
            }
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
                    a.insertAdjacentHTML('beforeend', '<span class="check-icon">' + Icon.check + '</span>');
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
            if (!dropdownWrapper.contains(e.target as Node)) {
                dropdownContent.classList.add('hidden');
            }
        };
        document.addEventListener('click', closeDropdown);

        (async () => {
            this.delayExec();
            if (this.show) {
                dropdownContent.classList.remove('hidden');
            }
        })();

        return this;
    }
}