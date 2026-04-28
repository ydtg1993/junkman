export interface SidebarTabItem {
    /** 唯一标识，叶子节点必填，父级分组可不填（用于渲染内容） */
    target?: string;
    /** 显示文本 */
    label: string;
    /** 子级菜单项，形成多级折叠 */
    sub?: SidebarTabItem[];
    /** 只有叶子节点有效：渲染函数，返回要显示的 HTML 字符串 */
    render?: () => string;
    /** 只有叶子节点有效：渲染后的初始化回调 */
    afterRender?: () => void;
}

export interface SidebarTabsOptions {
    container: string | HTMLElement;
    items: SidebarTabItem[];
    defaultActive?: string;
    contentId?: string;
    onAfterRender?: (target: string) => void;
}

export class SidebarTabs {
    private container: HTMLElement;
    private options: SidebarTabsOptions;
    private contentContainer: HTMLElement | null = null;
    private activeTarget: string;
    private allLeafLinks: Map<string, HTMLElement> = new Map();

    constructor(options: SidebarTabsOptions) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container) as HTMLElement
            : options.container;
        if (!this.container) throw new Error('SidebarTabs container not found');
        this.options = options;
        this.activeTarget = options.defaultActive || '';
        this.render();
    }

    private render() {
        this.container.innerHTML = '';
        this.container.className = 'layout';

        const sidebar = document.createElement('nav');
        sidebar.className = 'sidebar';

        const title = document.createElement('h2');
        title.textContent = '🧩 Junkman';
        sidebar.appendChild(title);

        const menu = document.createElement('ul');
        menu.className = 'menu menu-xs bg-base-100 rounded-lg w-full';
        this.buildMenu(this.options.items, menu);
        sidebar.appendChild(menu);

        const content = document.createElement('main');
        content.id = this.options.contentId || 'mainContent';
        content.className = 'content';
        this.contentContainer = content;

        this.container.appendChild(sidebar);
        this.container.appendChild(content);

        // 激活默认项或第一个可用叶子项
        const firstLeaf = this.findFirstLeaf(this.options.items);
        const targetToActivate = this.activeTarget || firstLeaf?.target || '';
        if (targetToActivate) {
            this.navigateTo(targetToActivate, true);
        }
    }

    /** 递归构建 DaisyUI menu 结构（支持多级折叠） */
    private buildMenu(items: SidebarTabItem[], parentUl: HTMLElement) {
        for (const item of items) {
            const li = document.createElement('li');

            if (item.sub && item.sub.length > 0) {
                // 有子菜单：使用 <details> 实现折叠
                const details = document.createElement('details');
                const summary = document.createElement('summary');
                summary.textContent = item.label;
                details.appendChild(summary);

                // 若自身有 target，点击 summary 时也可导航（需阻止默认折叠行为）
                if (item.target) {
                    summary.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.navigateTo(item.target!);
                        // 展开/折叠状态
                        details.open = !details.open;
                    });
                }

                const ul = document.createElement('ul');
                this.buildMenu(item.sub, ul);
                details.appendChild(ul);
                li.appendChild(details);
            } else {
                // 叶子节点
                const a = document.createElement('a');
                a.textContent = item.label;
                a.setAttribute('data-target', item.target || '');
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (item.target) this.navigateTo(item.target);
                });
                li.appendChild(a);
                if (item.target) {
                    this.allLeafLinks.set(item.target, a);
                }
            }
            parentUl.appendChild(li);
        }
    }

    /** 查找第一个叶子节点 */
    private findFirstLeaf(items: SidebarTabItem[]): SidebarTabItem | null {
        for (const item of items) {
            if (item.sub) {
                const found = this.findFirstLeaf(item.sub);
                if (found) return found;
            } else if (item.target) {
                return item;
            }
        }
        return null;
    }

    /** 根据 target 查找项 */
    private findItem(items: SidebarTabItem[], target: string): SidebarTabItem | null {
        for (const item of items) {
            if (item.target === target) return item;
            if (item.sub) {
                const found = this.findItem(item.sub, target);
                if (found) return found;
            }
        }
        return null;
    }

    /** 切换到指定 target */
    public navigateTo(target: string, isInitial = false) {
        if (!isInitial && target === this.activeTarget) return;

        // 更新激活状态
        const oldLink = this.allLeafLinks.get(this.activeTarget);
        if (oldLink) oldLink.classList.remove('active');
        const newLink = this.allLeafLinks.get(target);
        if (newLink) newLink.classList.add('active');

        this.activeTarget = target;

        const item = this.findItem(this.options.items, target);
        if (item?.render) {
            if (this.contentContainer) {
                this.contentContainer.innerHTML = item.render();
            }
            item.afterRender?.();
        } else {
            if (this.contentContainer) {
                this.contentContainer.innerHTML = '<div class="demo-section"><h2>请从左侧选择组件</h2></div>';
            }
        }

        this.options.onAfterRender?.(target);
    }

    public destroy() {
        this.allLeafLinks.forEach(link => link.removeEventListener('click', () => {}));
        this.allLeafLinks.clear();
        this.container.innerHTML = '';
        this.contentContainer = null;
    }
}