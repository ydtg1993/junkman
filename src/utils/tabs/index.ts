export interface TabItem {
    label: string;
    /**
     * 内容：可以为静态 HTML 字符串、HTMLElement，或一个异步函数返回 Promise<string | HTMLElement>
     * 异步函数会接收一个 AbortSignal，以便在组件销毁或切换时取消请求
     */
    content: string | HTMLElement | ((signal: AbortSignal) => Promise<string | HTMLElement>);
    disabled?: boolean;
    onActive?: () => void;
}

export interface TabsOptions {
    tabs: TabItem[];
    type?: 'boxed' | 'lifted' | 'bordered';
    activeIndex?: number;
    lazy?: boolean;                 // 静态内容懒加载（异步加载始终是懒加载）
    parentNode?: HTMLElement;
}

export class Tabs {
    private container: HTMLElement;
    private tabs: TabItem[];
    private options: TabsOptions;
    private activeIndex: number;
    private tabLabels: HTMLElement[] = [];
    private tabContents: HTMLElement[] = [];
    private rendered = false;
    private loadingStates: Map<number, boolean> = new Map(); // 记录哪些 tab 正在加载
    private abortControllers: Map<number, AbortController> = new Map(); // 用于取消请求

    constructor(selector: string | HTMLElement, options: TabsOptions) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Tabs container not found');
        this.tabs = options.tabs;
        this.options = options;
        this.activeIndex = options.activeIndex ?? 0;
        this.render();
    }

    private render() {
        this.container.innerHTML = '';
        const { type = 'boxed' } = this.options;

        // 标签导航
        const nav = document.createElement('div');
        nav.className = `tabs tabs-${type}`;
        this.tabLabels = [];

        this.tabs.forEach((tab, index) => {
            const label = document.createElement('a');
            label.className = `tab tab-${type} ${index === this.activeIndex ? 'tab-active' : ''}`;
            if (tab.disabled) label.className += ' tab-disabled';
            label.textContent = tab.label;
            label.addEventListener('click', () => {
                if (!tab.disabled) this.setActive(index);
            });
            nav.appendChild(label);
            this.tabLabels.push(label);
        });

        // 内容区域
        const contentContainer = document.createElement('div');
        contentContainer.className = 'mt-2';
        this.tabContents = [];

        this.tabs.forEach((tab, index) => {
            const pane = document.createElement('div');
            pane.className = `tab-content ${index === this.activeIndex ? 'block' : 'hidden'}`;

            // 决定是否立即渲染内容
            const isAsync = typeof tab.content === 'function';
            if (!isAsync && (index === this.activeIndex || !this.options.lazy)) {
                this.renderStaticContent(pane, tab.content as string | HTMLElement);
            } else if (isAsync && index === this.activeIndex) {
                // 异步内容在激活时加载，此处先显示 loading
                this.showLoading(pane);
                this.loadAsyncContent(index, pane);
            }
            // 如果是静态懒加载且未激活，保持空白
            this.tabContents.push(pane);
            contentContainer.appendChild(pane);
        });

        this.container.appendChild(nav);
        this.container.appendChild(contentContainer);
        this.rendered = true;
    }

    private renderStaticContent(pane: HTMLElement, content: string | HTMLElement) {
        pane.innerHTML = '';
        if (typeof content === 'string') {
            pane.innerHTML = content;
        } else {
            pane.appendChild(content);
        }
    }

    private showLoading(pane: HTMLElement) {
        pane.innerHTML = '<div class="flex justify-center items-center py-8"><span class="loading loading-spinner loading-lg"></span></div>';
    }

    private async loadAsyncContent(index: number, pane: HTMLElement) {
        // 取消之前的请求（如果有）
        if (this.abortControllers.has(index)) {
            this.abortControllers.get(index)?.abort();
        }
        const controller = new AbortController();
        this.abortControllers.set(index, controller);
        this.loadingStates.set(index, true);

        try {
            const fn = this.tabs[index].content as (signal: AbortSignal) => Promise<string | HTMLElement>;
            const result = await fn(controller.signal);

            // 确保组件未销毁且当前 pane 仍是目标
            if (!this.tabContents.includes(pane)) return;

            this.renderStaticContent(pane, result);
        } catch (error: any) {
            if (error?.name === 'AbortError') return; // 请求被取消，忽略
            if (!this.tabContents.includes(pane)) return;
            pane.innerHTML = `<div class="flex justify-center items-center py-8 text-error">加载失败: ${error.message || '未知错误'}</div>`;
        } finally {
            this.loadingStates.set(index, false);
            this.abortControllers.delete(index);
        }
    }

    public setActive(index: number) {
        if (index < 0 || index >= this.tabs.length || this.tabs[index].disabled) return;
        if (this.activeIndex === index) return;

        // 切换样式
        this.tabLabels[this.activeIndex].classList.remove('tab-active');
        this.tabLabels[index].classList.add('tab-active');

        // 切换内容
        const oldPane = this.tabContents[this.activeIndex];
        const newPane = this.tabContents[index];
        oldPane.classList.add('hidden');
        oldPane.classList.remove('block');
        newPane.classList.remove('hidden');
        newPane.classList.add('block');

        this.activeIndex = index;

        // 异步加载判断
        const tab = this.tabs[index];
        const isAsync = typeof tab.content === 'function';
        const isEmpty = newPane.innerHTML === '' || newPane.children.length === 0;

        if (isAsync) {
            this.showLoading(newPane);
            this.loadAsyncContent(index, newPane);
        } else if (isEmpty && this.options.lazy) {
            // 静态懒加载且尚未渲染
            this.renderStaticContent(newPane, tab.content as string | HTMLElement);
        }

        tab.onActive?.();
    }

    public getActiveIndex(): number {
        return this.activeIndex;
    }

    public destroy() {
        // 取消所有进行中的异步请求
        this.abortControllers.forEach((controller) => controller.abort());
        this.abortControllers.clear();
        this.container.innerHTML = '';
        this.tabLabels = [];
        this.tabContents = [];
    }
}