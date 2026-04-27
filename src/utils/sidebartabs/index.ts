/**
 * 单个导航项的配置
 */
export interface SidebarTabItem {
    /** 唯一标识 */
    target: string;
    /** 显示的文本 */
    label: string;
    /** 分组标题（为空则不显示分组） */
    group?: string;
    /** 渲染函数，返回要显示的 HTML 字符串。若不提供，点击时右侧内容不变 */
    render?: () => string;
    /** 内容渲染后的初始化函数，可用于绑定事件 */
    afterRender?: () => void;
}

export interface SidebarTabsOptions {
    /** 挂载容器 */
    container: string | HTMLElement;
    /** 导航项数组 */
    items: SidebarTabItem[];
    /** 默认激活的 target（不传则自动激活第一项） */
    defaultActive?: string;
    /** 右侧内容区的 ID，默认 "mainContent" */
    contentId?: string;
}

export class SidebarTabs {
    private container: HTMLElement;
    private options: SidebarTabsOptions;
    private contentContainer: HTMLElement | null = null;
    private activeTarget: string;
    private navLinks: Map<string, HTMLElement> = new Map();

    constructor(options: SidebarTabsOptions) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container) as HTMLElement
            : options.container;
        if (!this.container) throw new Error('SidebarTabs container not found');
        this.options = options;
        this.activeTarget = options.defaultActive || options.items[0]?.target || '';
        this.render();
    }

    /**
     * 完整渲染布局：左侧导航 + 右侧内容
     */
    private render() {
        this.container.innerHTML = '';
        this.container.className = 'layout';

        // 左侧导航
        const sidebar = document.createElement('nav');
        sidebar.className = 'sidebar';

        const title = document.createElement('h2');
        title.textContent = '🧩 Junkman';
        sidebar.appendChild(title);

        let currentGroup = '';
        for (const item of this.options.items) {
            // 分组标题
            if (item.group && item.group !== currentGroup) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'group-title';
                groupTitle.textContent = item.group;
                sidebar.appendChild(groupTitle);
                currentGroup = item.group;
            }

            const link = document.createElement('a');
            link.setAttribute('data-target', item.target);
            link.textContent = item.label;
            if (item.target === this.activeTarget) {
                link.classList.add('active');
            }
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.target);
            });
            sidebar.appendChild(link);
            this.navLinks.set(item.target, link);
        }

        // 右侧内容
        const content = document.createElement('main');
        const contentId = this.options.contentId || 'mainContent';
        content.id = contentId;
        content.className = 'content';
        this.contentContainer = content;

        this.container.appendChild(sidebar);
        this.container.appendChild(content);

        // 渲染默认激活的内容
        this.navigateTo(this.activeTarget, true);
    }

    /**
     * 获取某项配置
     */
    private getItem(target: string): SidebarTabItem | undefined {
        return this.options.items.find(i => i.target === target);
    }

    /**
     * 切换到指定 target
     */
    public navigateTo(target: string, isInitial = false) {
        if (!isInitial && target === this.activeTarget) return;

        // 更新导航激活状态
        const oldLink = this.navLinks.get(this.activeTarget);
        if (oldLink) oldLink.classList.remove('active');
        const newLink = this.navLinks.get(target);
        if (newLink) newLink.classList.add('active');

        this.activeTarget = target;

        // 渲染内容
        const item = this.getItem(target);
        if (item?.render) {
            if (this.contentContainer) {
                this.contentContainer.innerHTML = item.render();
            }
            // 内容渲染后执行初始化
            item.afterRender?.();
        } else {
            // 无渲染函数时显示提示
            if (this.contentContainer) {
                this.contentContainer.innerHTML = '<div class="demo-section"><h2>请从左侧选择组件</h2></div>';
            }
        }
    }

    /**
     * 销毁组件
     */
    public destroy() {
        this.navLinks.forEach(link => {
            link.removeEventListener('click', () => {});
        });
        this.navLinks.clear();
        this.container.innerHTML = '';
        this.contentContainer = null;
    }
}