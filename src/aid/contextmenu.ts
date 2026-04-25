export interface ContextMenuItem {
    title: string;
    func: (event?: MouseEvent) => void;
}

let activeMenu: HTMLElement | null = null;

function removeActiveMenu() {
    if (activeMenu && activeMenu.parentNode) {
        activeMenu.remove();
        activeMenu = null;
    }
}

export function contextmenu(
    doms: HTMLElement[],
    options: ContextMenuItem[],
    width: string = "70px"
) {
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        removeActiveMenu();

        const ul = document.createElement('ul');
        ul.className = "menu bg-base-200 rounded-box w-56";

        options.forEach((option) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = option.title;
            a.href = "#"; // 避免跳转
            a.addEventListener('click', (clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                removeActiveMenu();
                if (typeof option.func === 'function') {
                    option.func(e);
                }
            });
            // 如果没有回调函数，添加禁用样式
            if (typeof option.func !== 'function') {
                a.classList.add('text-gray-400', 'cursor-not-allowed');
                a.href = ''; // remove link
            }
            li.appendChild(a);
            ul.appendChild(li);
        });

        ul.style.top = `${e.pageY - 3}px`;
        ul.style.left = `${e.pageX - 3}px`;
        ul.style.position = 'absolute';
        ul.style.zIndex = '10000';
        ul.addEventListener('contextmenu', (ev) => ev.preventDefault());
        ul.addEventListener('mouseleave', () => removeActiveMenu());

        document.body.appendChild(ul);
        activeMenu = ul;
    };

    const bindings: Array<[HTMLElement, (e: MouseEvent) => void]> = [];
    doms.forEach((dom) => {
        dom.addEventListener('contextmenu', handleContextMenu);
        bindings.push([dom, handleContextMenu]);
    });

    return function destroy() {
        bindings.forEach(([dom, handler]) => {
            dom.removeEventListener('contextmenu', handler);
        });
        removeActiveMenu();
    };
}