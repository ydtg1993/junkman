export interface ContextMenuItem {
    title: string;
    /** 点击回调，若不存在则视为禁用项 */
    func?: (event?: MouseEvent) => void;
}

export interface ContextMenuOptions {
    /** 菜单宽度，默认 'auto' (由内容撑开)，可直接传入 '120px' 等 */
    width?: string;
    /** 菜单额外的 CSS 类名 */
    className?: string;
    /** 是否阻止菜单内部的二次右键 */
    preventInnerContext?: boolean;
}

/**
 * 为指定元素绑定右键菜单
 * @param doms - 需要绑定菜单的元素数组
 * @param items - 菜单项
 * @param options - 可选配置
 * @returns 销毁函数，用于解绑所有事件并移除菜单
 */
export function contextmenu(
    doms: HTMLElement[],
    items: ContextMenuItem[],
    options: ContextMenuOptions = {},
): () => void {
    const {
        width = 'auto',
        className = '',
        preventInnerContext = true,
    } = options;

    let activeMenu: HTMLElement | null = null;

    // 移除当前活动菜单（内部公用）
    const removeActiveMenu = () => {
        if (activeMenu?.parentNode) {
            activeMenu.remove();
        }
        activeMenu = null;
    };

    // 全局点击关闭菜单
    const globalClickHandler = (e: MouseEvent) => {
        if (activeMenu && !activeMenu.contains(e.target as Node)) {
            removeActiveMenu();
        }
    };

    // 窗口滚动时关闭菜单
    const scrollHandler = () => {
        removeActiveMenu();
    };

    // 用于保存所有绑定的事件，便于销毁
    const domBindings: Array<[HTMLElement, string, EventListener]> = [];

    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        removeActiveMenu();

        const ul = document.createElement('ul');
        ul.className = `menu bg-base-200 rounded-box w-56 ${className}`.trim();
        if (width !== 'auto') ul.style.width = width;

        // 构建菜单项
        items.forEach((item) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = item.title;

            if (typeof item.func === 'function') {
                a.href = '#';
                a.addEventListener('click', (clickEvent) => {
                    clickEvent.preventDefault();
                    clickEvent.stopPropagation();
                    removeActiveMenu();
                    item.func!(e);
                });
            } else {
                // 真正的禁用项：移除链接行为，并添加视觉样式
                a.classList.add('text-gray-400', 'cursor-not-allowed', 'no-underline');
                a.removeAttribute('href');
            }

            li.appendChild(a);
            ul.appendChild(li);
        });

        // 定位
        ul.style.position = 'fixed';
        ul.style.zIndex = '10000';

        // 计算位置，避免溢出视口
        const menuWidth = ul.offsetWidth || 150; // 尚未挂载，先估算
        const menuHeight = ul.offsetHeight || 100;

        let left = e.clientX - 3;
        let top = e.clientY - 3;

        // 先挂载到 DOM 以便测量真实尺寸
        ul.style.visibility = 'hidden';
        document.body.appendChild(ul);
        const realWidth = ul.offsetWidth;
        const realHeight = ul.offsetHeight;
        document.body.removeChild(ul);
        ul.style.visibility = '';

        // 对齐修复
        if (left + realWidth > window.innerWidth) {
            left = Math.max(0, window.innerWidth - realWidth - 5);
        }
        if (top + realHeight > window.innerHeight) {
            top = Math.max(0, window.innerHeight - realHeight - 5);
        }

        ul.style.left = `${left}px`;
        ul.style.top = `${top}px`;

        // 内部事件
        ul.addEventListener('contextmenu', (ev) => {
            if (preventInnerContext) ev.preventDefault();
        });
        ul.addEventListener('mouseleave', () => removeActiveMenu());

        document.body.appendChild(ul);
        activeMenu = ul;

        // 注册全局关闭事件（仅第一次绑定）
        if (domBindings.length === 0) {
            document.addEventListener('click', globalClickHandler, true);
            window.addEventListener('scroll', scrollHandler, true);
        }
    };

    // 绑定到所有目标元素
    doms.forEach((dom) => {
        dom.addEventListener('contextmenu', handleContextMenu);
        domBindings.push([dom, 'contextmenu', handleContextMenu]);
    });

    // 返回销毁函数
    return function destroy() {
        // 移除所有 dom 上的事件
        domBindings.forEach(([dom, event, handler]) => {
            dom.removeEventListener(event, handler);
        });
        domBindings.length = 0;

        // 移除全局事件
        document.removeEventListener('click', globalClickHandler, true);
        window.removeEventListener('scroll', scrollHandler, true);

        // 清除活动菜单
        removeActiveMenu();
    };
}