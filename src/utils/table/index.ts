import { Sortable } from '../sortable';
import { Icon } from '../../aid/icon';
import { request } from '../../aid/request';
import { ImgDelay } from '../../aid/imgdelay';
import { Menu } from '../selector/menu';
import { Switcher } from '../selector/switcher';
import { SELECTOR_DIRECTION } from '../selector/init';

export interface Column {
    name: string;
    field: string;
    type:
        | 'text'
        | 'input'
        | 'select'
        | 'date'
        | 'image'
        | 'hidden'
        | 'textarea'
        | 'number'
        | 'email'
        | 'password'
        | 'checkbox'
        | 'toggle'
        | 'switcher'
        | 'html'
        | 'time'
        | 'datetime-local'
        | 'url'
        | 'selection';
    width?: string;
    minWidth?: string;
    align?: 'left' | 'center' | 'right';
    pinned?: 'left' | 'right';
    editable?: boolean;
    options?: {
        list: { key: string | number; value: string }[];
        multiple?: boolean;
    };
    config?: {
        icon?: string;
        pattern?: string;
        validationMessage?: string;
        attributes?: Record<string, string>;
        towards?: any;
    };
    delay?: boolean;
    zoomOptions?: any;
}

export interface TableOptions {
    sortable?: boolean;
    deletable?: boolean;
    border?: boolean;
    zebra?: boolean;
    hover?: boolean;
    maxHeight?: string;
    updateUrl?: string;
    deleteUrl?: string;
    onDataChange?: (data: any[]) => void;
    onSort?: (order: (string | number)[], originalData: any[]) => any[];
    showBatchBar?: boolean;
    onBatchDelete?: (rows: any[]) => Promise<any>;
    onBatchUpdate?: (rows: any[], field: string, value: any) => Promise<any>;
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
    private selectedRows: Set<number> = new Set();
    private batchBar: HTMLElement | null = null;

    // 用于清理的资源
    private imgDelayCleanup: (() => void) | null = null;
    private menuInstances: Menu[] = [];
    private switcherInstances: Switcher[] = [];
    private eventCleanups: (() => void)[] = [];

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
            onSort: options.onSort || ((order, data) => data),
            showBatchBar: options.showBatchBar ?? true,
            onBatchDelete: options.onBatchDelete,
            onBatchUpdate: options.onBatchUpdate,
        };
        this.render();
    }

    // ======================== 渲染 ========================
    private render() {
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'overflow-x-auto overflow-y-auto';
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
            this.sortable = new Sortable(this.tbodyDom, {
                handle: '[data-sort-handle]',
                onSort: (order) => this.handleSort(order),
            });
        }

        if (this.options.showBatchBar) {
            this.batchBar = document.createElement('div');
            this.batchBar.className = 'flex gap-1 mt-2 hidden';
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-xs btn-error';
            delBtn.textContent = '批量删除';
            delBtn.addEventListener('click', () => this.batchDelete());
            this.batchBar.appendChild(delBtn);
            this.container.appendChild(this.batchBar);
        }
    }

    private handleSort(order: (string | number)[]) {
        if (this.options.onSort) {
            const newData = this.options.onSort(order, this.data);
            if (Array.isArray(newData)) {
                this.data = newData;
                this.triggerChange();
            } else {
                console.warn('onSort 回调必须返回排序后的数组');
            }
            return;
        }

        // 默认排序：根据 data-id 映射
        const map = new Map<string, any>();
        this.data.forEach((row, index) => {
            const id = row.id ?? index;
            map.set(String(id), row);
        });

        const newData = order
            .map(id => map.get(String(id)))
            .filter(row => row !== undefined);

        if (newData.length === this.data.length) {
            this.data = newData;
            this.triggerChange();
        } else {
            console.error('排序失败：部分数据丢失，请检查 data-id 设置', order);
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
            if (col.type === 'selection') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'checkbox checkbox-sm';
                checkbox.addEventListener('change', () => {
                    this.toggleSelectAll(checkbox.checked);
                });
                th.appendChild(checkbox);
            } else {
                th.textContent = col.name;
            }
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
        const rowId = rowData.id ?? index;
        tr.setAttribute('data-id', String(rowId));

        for (const col of this.columns) {
            const td = document.createElement('td');
            td.style.padding = '0.25rem 0.5rem';
            td.className = this.getCellClasses(col) + ' align-middle overflow-visible';
            if (col.minWidth) td.style.minWidth = col.minWidth;

            if (col.type === 'selection') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'checkbox checkbox-sm';
                checkbox.checked = this.selectedRows.has(index);
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) this.selectedRows.add(index);
                    else this.selectedRows.delete(index);
                    this.updateBatchBar();
                });
                td.appendChild(checkbox);
            } else {
                const value = rowData[col.field] ?? '';
                this.renderCell(td, col, value, index);
            }
            tr.appendChild(td);
        }

        // 操作列
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

    private createIconInput(
        type: string,
        value: string,
        icon?: string,
        pattern?: string,
        validationMessage?: string,
        extraAttributes?: Record<string, string>
    ): HTMLElement {
        const container = document.createElement('label');
        container.className = 'input input-bordered input-sm flex items-center gap-1 w-full';

        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'text-base-content/50';
            iconSpan.textContent = icon;
            container.appendChild(iconSpan);
        }

        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        input.className = 'w-full bg-transparent outline-none border-none p-0 h-auto leading-none';
        if (pattern) {
            input.pattern = pattern;
            input.title = validationMessage || '格式不正确';
            input.addEventListener('input', () => {
                if (input.checkValidity()) input.classList.remove('text-error');
                else input.classList.add('text-error');
            });
        }
        if (extraAttributes) {
            for (const key in extraAttributes) {
                if (extraAttributes.hasOwnProperty(key)) {
                    input.setAttribute(key, extraAttributes[key]);
                }
            }
        }
        container.appendChild(input);
        return container;
    }

    private renderCell(td: HTMLElement, col: Column, value: any, rowIndex: number) {
        const isEditable = col.editable !== false &&
            !['text', 'image', 'hidden', 'html', 'selection'].includes(col.type);
        const field = col.field;

        switch (col.type) {
            case 'text':
                td.textContent = value != null ? String(value) : '';
                break;
            case 'input':
            case 'time':
            case 'datetime-local':
            case 'date': {
                const input = document.createElement('input');
                input.className = 'input input-bordered input-sm w-full';
                input.value = value;
                if (col.type === 'time') input.type = 'time';
                else if (col.type === 'datetime-local') input.type = 'datetime-local';
                else if (col.type === 'date') input.type = 'date';
                else input.type = 'text';

                if (col.config?.attributes) {
                    Object.entries(col.config.attributes).forEach(([k, v]) => input.setAttribute(k, v));
                }
                if (isEditable) {
                    input.addEventListener('change', () => this.onCellChange(rowIndex, field, input.value));
                } else {
                    input.disabled = true;
                }
                td.appendChild(input);
                break;
            }
            case 'number':
            case 'email':
            case 'password':
            case 'url': {
                const inputType = col.type === 'number' ? 'number' :
                    col.type === 'email' ? 'email' :
                        col.type === 'password' ? 'password' : 'url';
                const iconInput = this.createIconInput(
                    inputType,
                    value,
                    col.config?.icon,
                    col.config?.pattern,
                    col.config?.validationMessage,
                    col.config?.attributes
                );
                if (isEditable) {
                    const inputEl = iconInput.querySelector('input')!;
                    inputEl.addEventListener('change', () =>
                        this.onCellChange(rowIndex, field, inputEl.value)
                    );
                } else {
                    const inputEl = iconInput.querySelector('input')!;
                    inputEl.disabled = true;
                    iconInput.classList.add('opacity-50');
                }
                td.appendChild(iconInput);
                break;
            }
            case 'textarea': {
                const textarea = document.createElement('textarea');
                textarea.className = 'textarea textarea-bordered textarea-sm w-full';
                textarea.value = value;
                textarea.rows = 2;
                if (isEditable) {
                    textarea.addEventListener('change', () =>
                        this.onCellChange(rowIndex, field, textarea.value)
                    );
                } else {
                    textarea.disabled = true;
                }
                td.appendChild(textarea);
                break;
            }
            case 'select': {
                if (isEditable) {
                    const selectData: { [k: string]: string } = {};
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
                        trigger: (data: any) => this.onCellChange(rowIndex, field, data.value),
                        show: false,
                        direction: SELECTOR_DIRECTION.Up,
                        parentNode: menuContainer,
                    });
                    menu.make();
                    const triggerEl = menuContainer.querySelector('.btn');
                    if (triggerEl) {
                        triggerEl.classList.remove('btn-sm');
                        triggerEl.classList.add('btn-xs');
                    }
                    if (value) menu.selected([String(value)]);
                    td.appendChild(menuContainer);
                    this.menuInstances.push(menu);
                } else {
                    const plainOption = col.options?.list?.find(opt => String(opt.key) === String(value));
                    td.textContent = plainOption?.value || (value != null ? String(value) : '');
                }
                break;
            }
            case 'switcher': {
                if (isEditable) {
                    const switchData: { [k: string]: string } = {};
                    if (col.options?.list) {
                        for (const opt of col.options.list) {
                            switchData[opt.value] = String(opt.key);
                        }
                    }
                    const switcherContainer = document.createElement('div');
                    const switcher = new Switcher(switchData, {
                        limit: 1,
                        trigger: (data: any) => this.onCellChange(rowIndex, field, data.value),
                        towards: col.config?.towards,
                        parentNode: switcherContainer,
                    });
                    switcher.selected([String(value)]).make();
                    const buttons = switcherContainer.querySelectorAll('.btn');
                    buttons.forEach(btn => {
                        btn.classList.remove('btn-sm');
                        btn.classList.add('btn-xs');
                    });
                    td.appendChild(switcherContainer);
                    this.switcherInstances.push(switcher);
                } else {
                    const plainOption = col.options?.list?.find(opt => String(opt.key) === String(value));
                    td.textContent = plainOption?.value || (value != null ? String(value) : '');
                }
                break;
            }
            case 'checkbox': {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'checkbox checkbox-sm';
                checkbox.checked = !!value;
                if (isEditable) {
                    checkbox.addEventListener('change', () =>
                        this.onCellChange(rowIndex, field, checkbox.checked)
                    );
                } else {
                    checkbox.disabled = true;
                }
                td.appendChild(checkbox);
                break;
            }
            case 'toggle': {
                const toggle = document.createElement('input');
                toggle.type = 'checkbox';
                toggle.className = 'toggle toggle-sm';
                toggle.checked = !!value;
                if (isEditable) {
                    toggle.addEventListener('change', () =>
                        this.onCellChange(rowIndex, field, toggle.checked)
                    );
                } else {
                    toggle.disabled = true;
                }
                td.appendChild(toggle);
                break;
            }
            case 'image': {
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
            }
            case 'html':
                // 注意：直接使用 innerHTML 存在 XSS 风险，请确保数据来源可信
                td.innerHTML = value;
                break;
            default:
                td.textContent = value != null ? String(value) : '';
        }
    }

    private onCellChange(rowIndex: number, field: string, value: any) {
        this.data[rowIndex][field] = value;
        this.triggerChange();
        this.triggerUpdate(rowIndex, field, value);
    }

    // ======================== 数据操作 ========================
    private deleteRow(index: number) {
        const row = this.data[index];
        if (this.options.deleteUrl) {
            request({
                url: this.options.deleteUrl,
                method: 'DELETE',
                data: { id: row.id ?? index },
            }).catch(console.error);
        }
        this.data.splice(index, 1);

        // 调整 selectedRows 中大于被删索引的项
        const newSelected = new Set<number>();
        this.selectedRows.forEach(i => {
            if (i > index) newSelected.add(i - 1);
            else if (i < index) newSelected.add(i);
            // 等于 index 的自动移除
        });
        this.selectedRows = newSelected;

        this.refresh();
        this.triggerChange();
    }

    private async triggerUpdate(rowIndex: number, field: string, value: any) {
        if (this.options.updateUrl) {
            const row = this.data[rowIndex];
            await request({
                url: this.options.updateUrl,
                method: 'POST',
                data: { id: row.id, field, value },
            }).catch(console.error);
        }
    }

    private triggerChange() {
        this.options.onDataChange(this.data);
    }

    // ======================== 公共方法 ========================
    public refresh() {
        // 清理之前的图片延迟加载定时器及事件
        if (this.imgDelayCleanup) {
            this.imgDelayCleanup();
            this.imgDelayCleanup = null;
        }

        // 清理之前的 Menu / Switcher 实例（需手动 destroy 若无 destroy 则至少移除 DOM）
        this.menuInstances.forEach(menu => menu.destroy?.());
        this.switcherInstances.forEach(switcher => switcher.destroy?.());
        this.menuInstances = [];
        this.switcherInstances = [];

        // 重新渲染 tbody
        this.tbodyDom.innerHTML = '';
        this.data.forEach((row, idx) => this.renderRow(row, idx));

        // 重新应用图片延迟加载
        if (this.imgDelayQueue.length) {
            this.imgDelayCleanup = ImgDelay(this.imgDelayQueue, 200, this.imgDelaySettings);
            this.imgDelayQueue = [];
        }

        // 更新批量栏状态
        this.updateBatchBar();
    }

    public loadData(data: any[]) {
        this.data = data;
        this.selectedRows.clear();
        this.refresh();
    }

    public getData(): any[] {
        return this.data;
    }

    public setData(data: any[]) {
        this.data = data;
        this.selectedRows.clear();
        this.refresh();
    }

    public getSelectedRows(): any[] {
        return Array.from(this.selectedRows).map(idx => this.data[idx]);
    }

    private toggleSelectAll(checked: boolean) {
        if (checked) {
            this.data.forEach((_, idx) => this.selectedRows.add(idx));
        } else {
            this.selectedRows.clear();
        }

        // 仅更新所有行内复选框的状态，不重建 DOM，避免破坏其他组件
        const checkboxes = this.tbodyDom.querySelectorAll<HTMLInputElement>('td:first-child input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = checked;
        });
        this.updateBatchBar();
    }

    private updateBatchBar() {
        if (this.batchBar) {
            this.batchBar.style.display = this.selectedRows.size > 0 ? 'flex' : 'none';
        }
    }

    private async batchDelete() {
        const rows = this.getSelectedRows();
        if (rows.length === 0) return;
        if (this.options.onBatchDelete) {
            await this.options.onBatchDelete(rows);
        }
        this.data = this.data.filter((_, idx) => !this.selectedRows.has(idx));
        this.selectedRows.clear();
        this.refresh();
        this.triggerChange();
    }

    /**
     * 销毁表格，释放所有资源
     */
    public destroy() {
        // 清理 sortable
        this.sortable?.destroy();

        // 清理图片延迟加载
        if (this.imgDelayCleanup) {
            this.imgDelayCleanup();
            this.imgDelayCleanup = null;
        }

        // 清理所有 Menu/Switcher
        this.menuInstances.forEach(menu => menu.destroy?.());
        this.switcherInstances.forEach(switcher => switcher.destroy?.());
        this.menuInstances = [];
        this.switcherInstances = [];

        // 清空容器
        this.container.innerHTML = '';
    }
}