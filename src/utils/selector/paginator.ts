// src/utils/selector/paginator.ts
export interface PaginatorOptions {
    total: number;
    pageSize: number;
    currentPage?: number;
    maxButtons?: number;
    showJump?: boolean;
    showTotal?: boolean;
    onPageChange: (page: number, pageSize: number) => void;
}

export class Paginator {
    private container: HTMLElement;
    private options: Required<PaginatorOptions>;
    private totalPages: number = 1;
    private currentPage: number = 1;

    constructor(selector: string | HTMLElement, options: PaginatorOptions) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Container not found');
        this.options = {
            total: options.total,
            pageSize: options.pageSize,
            currentPage: options.currentPage || 1,
            maxButtons: options.maxButtons || 5,
            showJump: options.showJump ?? true,
            showTotal: options.showTotal ?? true,
            onPageChange: options.onPageChange,
        };
        this.totalPages = Math.ceil(this.options.total / this.options.pageSize);
        this.currentPage = Math.min(this.options.currentPage || 1, this.totalPages);
        this.render();
    }

    private render() {
        this.container.innerHTML = '';
        this.container.className = 'flex flex-col items-center gap-2';

        // 总记录数
        if (this.options.showTotal) {
            const totalSpan = document.createElement('span');
            totalSpan.className = 'text-xs text-base-content/60';
            totalSpan.textContent = `共 ${this.options.total} 条`;
            this.container.appendChild(totalSpan);
        }

        // 分页主体：使用 join 组件
        const joinDiv = document.createElement('div');
        joinDiv.className = 'join';

        // 上一页
        const prevBtn = this.createNavButton('上一页', this.currentPage - 1, 'join-item');
        joinDiv.appendChild(prevBtn);

        // 页码按钮
        const pageButtons = this.generatePageButtons();
        pageButtons.forEach(btn => joinDiv.appendChild(btn));

        // 下一页
        const nextBtn = this.createNavButton('下一页', this.currentPage + 1, 'join-item');
        joinDiv.appendChild(nextBtn);

        this.container.appendChild(joinDiv);

        // 跳转输入框（独立于 join）
        if (this.options.showJump) {
            const jumpWrapper = document.createElement('div');
            jumpWrapper.className = 'flex items-center gap-1 mt-1';
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.max = String(this.totalPages);
            input.placeholder = '页码';
            input.className = 'input input-bordered input-xs w-14 text-center';
            const goBtn = document.createElement('button');
            goBtn.className = 'btn btn-xs btn-outline';
            goBtn.textContent = '跳转';
            goBtn.addEventListener('click', () => {
                let page = parseInt(input.value);
                if (isNaN(page)) page = 1;
                this.goToPage(page);
                input.value = '';
            });
            jumpWrapper.appendChild(input);
            jumpWrapper.appendChild(goBtn);
            this.container.appendChild(jumpWrapper);
        }
    }

    private createNavButton(text: string, targetPage: number, extraClass = ''): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm ' + extraClass;
        btn.textContent = text;
        if (targetPage < 1 || targetPage > this.totalPages) {
            btn.className += ' btn-disabled';
        }
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!btn.classList.contains('btn-disabled')) this.goToPage(targetPage);
        });
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
        if (page === this.currentPage) {
            btn.classList.add('btn-active');
        }
        btn.addEventListener('click', () => this.goToPage(page));
        return btn;
    }

    private createEllipsis(): HTMLElement {
        const span = document.createElement('span');
        span.className = 'px-2 text-base-content/50 self-center';
        span.textContent = '...';
        return span;
    }

    private goToPage(page: number) {
        if (page < 1) page = 1;
        if (page > this.totalPages) page = this.totalPages;
        if (page === this.currentPage) return;
        this.currentPage = page;
        this.options.onPageChange(this.currentPage, this.options.pageSize);
        this.render();
    }

    public refresh(total: number, pageSize?: number) {
        this.options.total = total;
        if (pageSize) this.options.pageSize = pageSize;
        this.totalPages = Math.ceil(this.options.total / this.options.pageSize);
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        this.render();
    }

    public getCurrentPage(): number {
        return this.currentPage;
    }
}