// src/utils/table/index.ts
import { Sortable } from '../sortable';
import { Icon } from '../../aid/icon';
import { request } from '../../aid/request';
import { imgDelay } from '../../aid/imgdelay';
import { Menu } from '../selector/menu';
import { Switcher } from '../selector/switcher';

export interface Column {
    name: string;
    field: string;
    type: 'text' | 'input' | 'select' | 'date' | 'image' | 'hidden' |
        'textarea' | 'number' | 'email' | 'password' | 'checkbox' | 'toggle' |
        'switcher' | 'html';
    width?: string;
    minWidth?: string;
    align?: 'left' | 'center' | 'right';
    pinned?: 'left' | 'right';           // 固定列
    editable?: boolean;
    options?: {                          // 用于 select / switcher
        list: { key: string | number; value: string }[];
        multiple?: boolean;
    };
    config?: any;                        // 用于 switcher 的方向等 (e.g., { towards: SELECTOR_TOWARDS.Horizontal })
    delay?: boolean;
    zoomOptions?: any;
}

export interface TableOptions {
    sortable?: boolean;
    deletable?: boolean;
    border?: boolean;
    zebra?: boolean;
    hover?: boolean;
    maxHeight?: string;                  // 默认 '400px'
    updateUrl?: string;
    deleteUrl?: string;
    onDataChange?: (data: any[]) => void;
}

export class EditableTable {
    private container: HTMLElement;
    private columns: Column[];
    private data: any[] = [];
    private options: Required<TableOptions>;
    private tableDom!: HTMLTableElement;
    private tbodyDom!: HTMLElement;
    private sortable: Sortable | null = null;
    private imgDelayQueue: HTMLImageElement[] = [];
    private imgDelaySettings: any = {};

    constructor(selector: string | HTMLElement, columns: Column[], options: TableOptions = {}) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Container not found');
        this.columns = columns.filter(col => col.type !== 'hidden');
        this.options = {
            sortable: options.sortable ?? true,
            deletable: options.deletable ?? true,
            border: options.border ?? true,
            zebra: options.zebra ?? true,
            hover: options.hover ?? true,
            maxHeight: options.maxHeight || '400px',
            updateUrl: options.updateUrl || '',
            deleteUrl: options.deleteUrl || '',
            onDataChange: options.onDataChange || (() => {}),
        };
        this.render();
    }

    private render() {
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'overflow-auto';
        wrapper.style.maxHeight = this.options.maxHeight;
        this.tableDom = document.createElement('table');
        let tableCls = 'table table-fixed w-full';
        if (this.options.zebra) tableCls += ' table-zebra';
        if (this.options.border) tableCls += ' border border-base-300';
        this.tableDom.className = tableCls;
        wrapper.appendChild(this.tableDom);
        this.container.appendChild(wrapper);
        this.renderHeader();
        this.renderBody();
        if (this.options.sortable) {
            this.sortable = new Sortable(this.tbodyDom, (order) => {
                const newData = order.map(i => this.data[i]);
                this.data = newData;
                this.triggerChange();
            }, { handle: '[data-sort-handle]' });
        }
    }

    private getCellClasses(col: Column): string {
        let cls = '';
        if (col.align === 'center') cls += ' text-center';
        else if (col.align === 'right') cls += ' text-right';
        else cls += ' text-left';
        if (col.pinned === 'left') cls += ' sticky left-0 z-10 bg-base-100';
        else if (col.pinned === 'right') cls += ' sticky right-0 z-10 bg-base-100';
        return cls;
    }

    private renderHeader() {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        for (const col of this.columns) {
            const th = document.createElement('th');
            th.textContent = col.name;
            if (col.width) th.style.width = col.width;
            if (col.minWidth) th.style.minWidth = col.minWidth;
            th.className = this.getCellClasses(col);
            th.classList.add('sticky', 'top-0', 'z-20', 'bg-base-100');
            tr.appendChild(th);
        }
        const optTh = document.createElement('th');
        optTh.className = 'w-12 sticky top-0 z-20 bg-base-100';
        tr.appendChild(optTh);
        thead.appendChild(tr);
        this.tableDom.appendChild(thead);
    }

    private renderBody() {
        const tbody = document.createElement('tbody');
        this.tbodyDom = tbody;
        this.tableDom.appendChild(tbody);
        if (this.data.length) {
            this.data.forEach((row, idx) => this.renderRow(row, idx));
        }
    }

    private renderRow(rowData: any, index: number) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-sortable-item', 'true');
        if (this.options.hover) tr.classList.add('hover');

        for (const col of this.columns) {
            const td = document.createElement('td');
            td.style.padding = '0.25rem 0.5rem';
            td.className = this.getCellClasses(col) + ' align-middle';
            if (col.minWidth) td.style.minWidth = col.minWidth;
            const value = rowData[col.field] ?? '';
            this.renderCell(td, col, value, index);
            tr.appendChild(td);
        }

        const optTd = document.createElement('td');
        optTd.className = 'w-12 text-center align-middle';
        const div = document.createElement('div');
        div.className = 'flex items-center justify-center gap-1';
        if (this.options.sortable) {
            const moveIcon = document.createElement('i');
            moveIcon.innerHTML = Icon.move;
            moveIcon.setAttribute('data-sort-handle', 'true');
            moveIcon.className = 'cursor-grab text-base-content/50 hover:text-base-content';
            div.appendChild(moveIcon);
        }
        if (this.options.deletable) {
            const delIcon = document.createElement('i');
            delIcon.innerHTML = Icon.trash;
            delIcon.className = 'cursor-pointer text-error/70 hover:text-error';
            delIcon.addEventListener('click', () => this.deleteRow(index));
            div.appendChild(delIcon);
        }
        optTd.appendChild(div);
        tr.appendChild(optTd);

        this.tbodyDom.appendChild(tr);
    }

    private renderCell(td: HTMLElement, col: Column, value: any, rowIndex: number) {
        const isEditable = col.editable !== false &&
            !['text', 'image', 'hidden', 'html'].includes(col.type);
        const field = col.field;

        switch (col.type) {
            case 'text':
                td.textContent = value;
                break;
            case 'input':
            case 'number':
            case 'email':
            case 'password':
                const input = document.createElement('input');
                input.className = 'input input-bordered input-sm w-full';
                input.value = value;
                if (col.type !== 'input') input.type = col.type;
                if (isEditable) {
                    input.addEventListener('change', () => {
                        this.data[rowIndex][field] = input.value;
                        this.triggerChange();
                        this.triggerUpdate(rowIndex, field, input.value);
                    });
                } else {
                    input.disabled = true;
                }
                td.appendChild(input);
                break;
            case 'textarea':
                const textarea = document.createElement('textarea');
                textarea.className = 'textarea textarea-bordered textarea-sm w-full';
                textarea.value = value;
                textarea.rows = 2;
                if (isEditable) {
                    textarea.addEventListener('change', () => {
                        this.data[rowIndex][field] = textarea.value;
                        this.triggerChange();
                        this.triggerUpdate(rowIndex, field, textarea.value);
                    });
                } else {
                    textarea.disabled = true;
                }
                td.appendChild(textarea);
                break;
            case 'select':
                if (isEditable) {
                    // 使用 Menu 组件
                    const selectData: { [key: string]: string } = {};
                    if (col.options?.list) {
                        for (const opt of col.options.list) {
                            selectData[opt.value] = String(opt.key);
                        }
                    }
                    const menuContainer = document.createElement('div');
                    menuContainer.style.width = '100%';
                    const currentOption = col.options?.list?.find(opt => String(opt.key) === String(value));
                    const menu = new Menu(selectData, {
                        limit: col.options?.multiple ? 0 : 1,
                        searchOff: true,
                        placeholder: currentOption?.value || '请选择',
                        trigger: (data: any) => {
                            this.data[rowIndex][field] = data.value;
                            this.triggerChange();
                            this.triggerUpdate(rowIndex, field, data.value);
                        },
                        show: false,
                        parentNode: menuContainer,
                    });
                    menu.make();
                    if (value) {
                        menu.selected([String(value)]);
                    }
                    td.appendChild(menuContainer);
                } else {
                    const plainOption = col.options?.list?.find(opt => String(opt.key) === String(value));
                    td.textContent = plainOption?.value || value;
                }
                break;
            case 'switcher':
                if (isEditable) {
                    const switchData: { [key: string]: string } = {};
                    if (col.options?.list) {
                        for (const opt of col.options.list) {
                            switchData[opt.value] = String(opt.key);
                        }
                    }
                    const switcherContainer = document.createElement('div');
                    const switcher = new Switcher(switchData, {
                        limit: 1,
                        trigger: (data: any) => {
                            this.data[rowIndex][field] = data.value;
                            this.triggerChange();
                            this.triggerUpdate(rowIndex, field, data.value);
                        },
                        towards: col.config?.towards,
                        parentNode: switcherContainer,
                    });
                    switcher.selected([String(value)]).make();
                    td.appendChild(switcherContainer);
                } else {
                    const plainOption = col.options?.list?.find(opt => String(opt.key) === String(value));
                    td.textContent = plainOption?.value || value;
                }
                break;
            case 'checkbox':
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'checkbox checkbox-sm';
                checkbox.checked = !!value;
                if (isEditable) {
                    checkbox.addEventListener('change', () => {
                        this.data[rowIndex][field] = checkbox.checked;
                        this.triggerChange();
                        this.triggerUpdate(rowIndex, field, checkbox.checked);
                    });
                } else {
                    checkbox.disabled = true;
                }
                td.appendChild(checkbox);
                break;
            case 'toggle':
                const toggle = document.createElement('input');
                toggle.type = 'checkbox';
                toggle.className = 'toggle toggle-sm';
                toggle.checked = !!value;
                if (isEditable) {
                    toggle.addEventListener('change', () => {
                        this.data[rowIndex][field] = toggle.checked;
                        this.triggerChange();
                        this.triggerUpdate(rowIndex, field, toggle.checked);
                    });
                } else {
                    toggle.disabled = true;
                }
                td.appendChild(toggle);
                break;
            case 'date':
                const dateInput = document.createElement('input');
                dateInput.className = 'input input-bordered input-sm w-full';
                dateInput.value = value;
                if (isEditable) {
                    dateInput.addEventListener('change', () => {
                        this.data[rowIndex][field] = dateInput.value;
                        this.triggerChange();
                        this.triggerUpdate(rowIndex, field, dateInput.value);
                    });
                    if (col.config && (window as any).flatpickr) {
                        (window as any).flatpickr(dateInput, col.config);
                    }
                } else {
                    dateInput.disabled = true;
                }
                td.appendChild(dateInput);
                break;
            case 'image':
                const img = document.createElement('img');
                img.className = 'max-w-full max-h-12 object-contain';
                if (col.delay) {
                    img.setAttribute('data-src', value);
                    this.imgDelayQueue.push(img);
                    if (col.zoomOptions) this.imgDelaySettings = col.zoomOptions;
                } else {
                    img.src = value;
                }
                td.appendChild(img);
                break;
            case 'html':
                td.innerHTML = value;
                break;
            default:
                td.textContent = value;
        }
    }

    private deleteRow(index: number) {
        const row = this.data[index];
        if (this.options.deleteUrl) {
            request({ url: this.options.deleteUrl, method: 'DELETE', data: { id: row.id ?? index } }).catch(console.error);
        }
        this.data.splice(index, 1);
        this.refresh();
        this.triggerChange();
    }

    private async triggerUpdate(rowIndex: number, field: string, value: any) {
        if (this.options.updateUrl) {
            const row = this.data[rowIndex];
            await request({ url: this.options.updateUrl, method: 'POST', data: { id: row.id, field, value } }).catch(console.error);
        }
    }

    private triggerChange() {
        this.options.onDataChange(this.data);
    }

    public refresh() {
        this.tbodyDom.innerHTML = '';
        this.data.forEach((row, idx) => this.renderRow(row, idx));
        if (this.imgDelayQueue.length) {
            imgDelay(this.imgDelayQueue, 200, this.imgDelaySettings);
        }
    }

    public loadData(data: any[]) {
        this.data = data;
        this.refresh();
    }

    public getData(): any[] {
        return this.data;
    }

    public setData(data: any[]) {
        this.data = data;
        this.refresh();
    }
}