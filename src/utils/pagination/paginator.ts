export interface PaginatorOptions {
    total: number;
    pageSize: number;
    currentPage?: number;
    maxButtons?: number;
    showJump?: boolean;
    showTotal?: boolean;
    onPageChange: (page: number, pageSize: number) => void;
    /** 每页条数切换选项，例如 [10, 20, 50, 100]，不提供则不显示切换器 */
    pageSizeOptions?: number[];
    /** 改变每页条数时的回调 */
    onPageSizeChange?: (pageSize: number) => void;
    /** 自定义文案 */
    labels?: {
        prev?: string;
        next?: string;
        total?: string;
        jump?: string;
        pageSizeLabel?: string;
    };
    /** 是否禁用（通常在加载数据时使用） */
    disabled?: boolean;
}

export class Paginator {
    private container: HTMLElement;
    private options: Required<PaginatorOptions>;
    private totalPages: number = 1;
    private currentPage: number = 1;
    private eventCleanups: Array<() => void> = [];

    // 默认文案
    private static defaultLabels = {
        prev: '上一页',
        next: '下一页',
        total: '共 {total} 条',
        jump: '跳转',
        pageSizeLabel: '每页',
    };

    constructor(selector: string | HTMLElement, options: PaginatorOptions) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Container not found');

        const labels = { ...Paginator.defaultLabels, ...options.labels };

        this.options = {
            total: options.total,
            pageSize: options.pageSize,
            currentPage: options.currentPage || 1,
            maxButtons: options.maxButtons || 5,
            showJump: options.showJump ?? true,
            showTotal: options.showTotal ?? true,
            onPageChange: options.onPageChange,
            pageSizeOptions: options.pageSizeOptions || [],
            onPageSizeChange: options.onPageSizeChange || (() => {}),
            labels,
            disabled: options.disabled ?? false,
        };

        this.totalPages = Math.max(1, Math.ceil(this.options.total / this.options.pageSize));
        this.currentPage = Math.min(this.options.currentPage || 1, this.totalPages);
        this.render();
    }

    // ======================== 渲染 ========================
    private render() {
        // 清理之前绑定的事件（通过 destroy 统一管理，但 render 会在内部调用，这里只需重建 DOM）
        this.container.innerHTML = '';
        this.container.className = 'flex flex-col items-center gap-2';

        if (this.options.total === 0) {
            this.renderEmpty();
            return;
        }

        if (this.options.showTotal) {
            const totalSpan = document.createElement('span');
            totalSpan.className = 'text-xs text-base-content/60';
            totalSpan.textContent = this.options.labels.total.replace('{total}', String(this.options.total));
            this.container.appendChild(totalSpan);
        }

        // 分页按钮区域
        const joinDiv = document.createElement('div');
        joinDiv.className = 'join';

        const prevBtn = this.createNavButton(this.options.labels.prev, this.currentPage - 1, 'join-item');
        joinDiv.appendChild(prevBtn);

        const pageButtons = this.generatePageButtons();
        pageButtons.forEach(btn => joinDiv.appendChild(btn));

        const nextBtn = this.createNavButton(this.options.labels.next, this.currentPage + 1, 'join-item');
        joinDiv.appendChild(nextBtn);

        this.container.appendChild(joinDiv);

        // 底部工具栏：页面大小切换 + 跳转
        const toolbar = document.createElement('div');
        toolbar.className = 'flex items-center gap-2 mt-1 flex-wrap justify-center';

        // 每页条数切换
        if (this.options.pageSizeOptions.length > 0) {
            const sizeWrapper = document.createElement('div');
            sizeWrapper.className = 'flex items-center gap-1';
            const sizeLabel = document.createElement('span');
            sizeLabel.className = 'text-xs text-base-content/60';
            sizeLabel.textContent = this.options.labels.pageSizeLabel;
            const select = document.createElement('select');
            select.className = 'select select-xs select-bordered';
            this.options.pageSizeOptions.forEach(size => {
                const opt = document.createElement('option');
                opt.value = String(size);
                opt.textContent = String(size);
                if (size === this.options.pageSize) opt.selected = true;
                select.appendChild(opt);
            });
            select.addEventListener('change', () => {
                const newSize = parseInt(select.value);
                if (newSize !== this.options.pageSize) {
                    this.options.pageSize = newSize;
                    this.options.onPageSizeChange(newSize);
                    this.totalPages = Math.max(1, Math.ceil(this.options.total / this.options.pageSize));
                    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
                    this.options.onPageChange(this.currentPage, this.options.pageSize);
                    this.render();
                }
            });
            sizeWrapper.appendChild(sizeLabel);
            sizeWrapper.appendChild(select);
            toolbar.appendChild(sizeWrapper);
        }

        // 跳转
        if (this.options.showJump) {
            const jumpWrapper = document.createElement('div');
            jumpWrapper.className = 'flex items-center gap-1';
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.max = String(this.totalPages);
            input.placeholder = '页码';
            input.className = 'input input-bordered input-xs w-14 text-center';
            const goBtn = document.createElement('button');
            goBtn.className = 'btn btn-xs btn-outline';
            goBtn.textContent = this.options.labels.jump;

            const doJump = () => {
                let page = parseInt(input.value);
                if (isNaN(page)) page = 1;
                this.goToPage(page);
                input.value = '';
            };
            goBtn.addEventListener('click', doJump);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    doJump();
                }
            });
            jumpWrapper.appendChild(input);
            jumpWrapper.appendChild(goBtn);
            toolbar.appendChild(jumpWrapper);
        }

        if (toolbar.children.length > 0) {
            this.container.appendChild(toolbar);
        }

        // 应用禁用状态
        this.setDisabled(this.options.disabled);
    }

    private renderEmpty() {
        const span = document.createElement('span');
        span.className = 'text-sm text-base-content/40';
        span.textContent = '暂无数据';
        this.container.appendChild(span);
    }

    // ======================== 按钮生成 ========================
    private createNavButton(text: string, targetPage: number, extraClass = ''): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm ' + extraClass;
        btn.textContent = text;
        btn.setAttribute('aria-label', text);
        if (targetPage < 1 || targetPage > this.totalPages || this.options.total === 0) {
            btn.className += ' btn-disabled';
        }
        const handler = (e: Event) => {
            e.preventDefault();
            if (!btn.classList.contains('btn-disabled')) this.goToPage(targetPage);
        };
        btn.addEventListener('click', handler);
        this.eventCleanups.push(() => btn.removeEventListener('click', handler));
        return btn;
    }

    private generatePageButtons(): HTMLElement[] {
        const buttons: HTMLElement[] = [];
        const max = this.options.maxButtons;
        let start = Math.max(1, this.currentPage - Math.floor(max / 2));
        let end = Math.min(this.totalPages, start + max - 1);
        if (end - start + 1 < max) start = Math.max(1, end - max + 1);

        if (start > 1) {
            buttons.push(this.createNumberButton(1));
            if (start > 2) buttons.push(this.createEllipsis());
        }
        for (let i = start; i <= end; i++) {
            buttons.push(this.createNumberButton(i));
        }
        if (end < this.totalPages) {
            if (end < this.totalPages - 1) buttons.push(this.createEllipsis());
            buttons.push(this.createNumberButton(this.totalPages));
        }
        return buttons;
    }

    private createNumberButton(page: number): HTMLElement {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm join-item';
        btn.textContent = String(page);
        btn.setAttribute('aria-label', `第 ${page} 页`);
        if (page === this.currentPage) {
            btn.classList.add('btn-active');
        }
        const handler = () => this.goToPage(page);
        btn.addEventListener('click', handler);
        this.eventCleanups.push(() => btn.removeEventListener('click', handler));
        return btn;
    }

    private createEllipsis(): HTMLElement {
        const span = document.createElement('span');
        span.className = 'px-2 text-base-content/50 self-center';
        span.textContent = '...';
        return span;
    }

    // ======================== 逻辑 ========================
    private goToPage(page: number) {
        if (page < 1) page = 1;
        if (page > this.totalPages) page = this.totalPages;
        if (page === this.currentPage) return;
        this.currentPage = page;
        this.options.onPageChange(this.currentPage, this.options.pageSize);
        this.render();
    }

    // ======================== 公共接口 ========================
    public refresh(total: number, pageSize?: number) {
        this.options.total = total;
        if (pageSize) this.options.pageSize = pageSize;
        this.totalPages = total > 0 ? Math.max(1, Math.ceil(this.options.total / this.options.pageSize)) : 1;
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        this.render();
    }

    public setDisabled(disabled: boolean) {
        this.options.disabled = disabled;
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => {
            if (disabled) {
                btn.setAttribute('disabled', 'true');
                btn.classList.add('btn-disabled');
            } else {
                btn.removeAttribute('disabled');
                btn.classList.remove('btn-disabled');
            }
        });
        const inputs = this.container.querySelectorAll('input, select');
        inputs.forEach(input => {
            (input as HTMLInputElement).disabled = disabled;
        });
    }

    public getCurrentPage(): number {
        return this.currentPage;
    }

    public getPageSize(): number {
        return this.options.pageSize;
    }

    /**
     * 销毁分页器，移除所有事件并清空容器
     */
    public destroy() {
        this.eventCleanups.forEach(fn => fn());
        this.eventCleanups = [];
        this.container.innerHTML = '';
    }
}