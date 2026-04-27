export interface SortableOptions {
    direction?: 'vertical' | 'horizontal';
    handle?: string;
    animationSpeed?: number;
    onSort?: (order: (string | number)[]) => void;
}

export class Sortable {
    private list: HTMLElement;
    private options: Required<SortableOptions>;

    private dragItem: HTMLElement | null = null;
    private placeholder: HTMLElement | null = null;
    private clone: HTMLElement | null = null;
    private dragging = false;
    private startIndex = -1;

    private dragOffset = { x: 0, y: 0 };
    private startScrollTop = 0;
    private startScrollLeft = 0;

    constructor(list: HTMLElement, options: SortableOptions = {}) {
        this.list = list;
        this.options = {
            direction: options.direction ?? 'vertical',
            handle: options.handle ?? '',
            animationSpeed: options.animationSpeed ?? 180,
            onSort: options.onSort ?? (() => {}),
        };
        this.init();
    }

    private init() {
        this.list.addEventListener('pointerdown', this.onStart);
    }

    // ──────────────────────── 元素类型判断 ────────────────────────
    private getItemType(el: HTMLElement): 'row' | 'block' {
        return el.tagName === 'TR' ? 'row' : 'block';
    }

    private isVertical(): boolean {
        return this.options.direction === 'vertical';
    }

    private getPoint(e: PointerEvent): number {
        return this.isVertical() ? e.clientY : e.clientX;
    }

    private getPrimarySize(el: HTMLElement): number {
        const rect = el.getBoundingClientRect();
        return this.isVertical() ? rect.height : rect.width;
    }

    private getPrimaryClientPos(el: HTMLElement): number {
        const rect = el.getBoundingClientRect();
        return this.isVertical() ? rect.top : rect.left;
    }

    private getItems(): HTMLElement[] {
        return Array.from(this.list.querySelectorAll<HTMLElement>('[data-sortable-item]'))
            .filter(el => el !== this.placeholder && el !== this.dragItem);
    }

    // 获取所有项（包含当前拖拽项），用于计算初始索引
    private getAllItems(): HTMLElement[] {
        return Array.from(this.list.querySelectorAll<HTMLElement>('[data-sortable-item]'))
            .filter(el => el !== this.placeholder);
    }

    // ──────────────────────── 占位符与克隆 ────────────────────────
    private createPlaceholder(item: HTMLElement): HTMLElement {
        const type = this.getItemType(item);
        if (type === 'row') {
            const tr = document.createElement('tr');
            tr.className = 'sortable-placeholder';
            const cells = Array.from(item.children) as HTMLElement[];
            cells.forEach((cell) => {
                const td = document.createElement('td');
                const width = cell.getBoundingClientRect().width;
                td.style.width = `${width}px`;
                td.style.height = `${this.getPrimarySize(item)}px`;
                td.style.border = '1px dashed #ccc';
                td.style.backgroundColor = 'rgba(0,0,0,0.05)';
                td.innerHTML = '&nbsp;';
                tr.appendChild(td);
            });
            return tr;
        }
        const div = document.createElement('div');
        div.className = 'sortable-placeholder';
        div.style.height = `${this.getPrimarySize(item)}px`;
        div.style.width = '100%';
        return div;
    }

    private cloneWithLayout(src: HTMLElement, rect: DOMRect): HTMLElement {
        const clone = src.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.top = `${rect.top}px`;
        clone.style.left = `${rect.left}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = '10000';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'none';
        clone.style.boxSizing = 'border-box';

        const bgColor = window.getComputedStyle(src).backgroundColor;
        clone.style.backgroundColor = bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' ? bgColor : '#fff';
        clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        clone.style.opacity = '0.95';

        // 处理表格行的克隆
        if (src.tagName === 'TR') {
            clone.style.display = 'flex';
            clone.style.flexDirection = 'row';
            const cells = Array.from(src.children) as HTMLElement[];
            const cloneCells = Array.from(clone.children) as HTMLElement[];
            cells.forEach((cell, idx) => {
                if (!cloneCells[idx]) return;
                const width = cell.getBoundingClientRect().width;
                cloneCells[idx].style.width = `${width}px`;
                cloneCells[idx].style.flex = '0 0 auto';
                const computed = window.getComputedStyle(cell);
                cloneCells[idx].style.padding = computed.padding;
                cloneCells[idx].style.border = computed.border;
                cloneCells[idx].style.whiteSpace = computed.whiteSpace;
                cloneCells[idx].style.backgroundColor = bgColor;
            });
        }
        return clone;
    }

    // ──────────────────────── 拖拽生命周期 ────────────────────────
    private onStart = (e: PointerEvent) => {
        if (this.dragging) return;

        // 确定拖拽目标
        let item: HTMLElement | null = null;
        if (this.options.handle) {
            const handleEl = (e.target as HTMLElement).closest(this.options.handle);
            if (handleEl) {
                item = handleEl.closest('[data-sortable-item]');
            }
        } else {
            item = (e.target as HTMLElement).closest('[data-sortable-item]');
        }
        if (!item) return;

        // 防止干扰输入框
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        e.preventDefault();
        document.body.style.userSelect = 'none';

        this.dragItem = item;
        // 获取所有项（此时占位符尚未创建，dragItem 仍在列表中）
        const allItems = this.getAllItems();
        this.startIndex = allItems.indexOf(item);

        const rect = item.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        this.startScrollTop = this.list.scrollTop;
        this.startScrollLeft = this.list.scrollLeft;

        // 创建占位符并插入到原位置
        this.placeholder = this.createPlaceholder(item);
        item.parentNode!.insertBefore(this.placeholder, item);

        // 创建拖拽幽灵
        this.clone = this.cloneWithLayout(item, rect);
        document.body.appendChild(this.clone);
        this.clone.getBoundingClientRect(); // 强制重排

        // 隐藏原元素
        item.style.display = 'none';

        this.dragging = true;

        window.addEventListener('pointermove', this.onMove);
        window.addEventListener('pointerup', this.onEnd);
    };

    private onMove = (e: PointerEvent) => {
        if (!this.dragging || !this.clone || !this.placeholder) return;
        e.preventDefault();

        let newLeft = e.clientX - this.dragOffset.x;
        let newTop = e.clientY - this.dragOffset.y;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - this.clone.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - this.clone.offsetHeight));

        this.clone.style.left = `${newLeft}px`;
        this.clone.style.top = `${newTop}px`;

        this.autoScroll(e);
        this.updatePlaceholderPosition(e);
    };

    private autoScroll(e: PointerEvent) {
        const scrollSpeed = 8;
        const edgeThreshold = 60;
        const rect = this.list.getBoundingClientRect();

        if (this.isVertical()) {
            const mouseY = e.clientY;
            if (mouseY - rect.top < edgeThreshold && mouseY - rect.top > 0) {
                this.list.scrollTop -= scrollSpeed;
            } else if (rect.bottom - mouseY < edgeThreshold && rect.bottom - mouseY > 0) {
                this.list.scrollTop += scrollSpeed;
            }
        } else {
            const mouseX = e.clientX;
            if (mouseX - rect.left < edgeThreshold && mouseX - rect.left > 0) {
                this.list.scrollLeft -= scrollSpeed;
            } else if (rect.right - mouseX < edgeThreshold && rect.right - mouseX > 0) {
                this.list.scrollLeft += scrollSpeed;
            }
        }
    }

    private updatePlaceholderPosition(e: PointerEvent) {
        const mousePos = this.getPoint(e);
        const items = this.getItems();
        if (items.length === 0) return;

        let targetItem: HTMLElement | null = null;
        let insertAfter = false;
        const lastItem = items[items.length - 1];
        const firstItem = items[0];
        if (!lastItem) return;

        const lastItemEnd = this.getPrimaryClientPos(lastItem) + this.getPrimarySize(lastItem);
        const firstItemPos = this.getPrimaryClientPos(firstItem);

        if (mousePos > lastItemEnd) {
            targetItem = lastItem;
            insertAfter = true;
        } else if (mousePos < firstItemPos) {
            targetItem = firstItem;
            insertAfter = false;
        } else {
            let minDist = Infinity;
            for (const el of items) {
                if (el === this.dragItem) continue;
                const elPos = this.getPrimaryClientPos(el);
                const center = elPos + this.getPrimarySize(el) / 2;
                const dist = Math.abs(mousePos - center);
                if (dist < minDist) {
                    minDist = dist;
                    targetItem = el;
                    insertAfter = mousePos > center;
                }
            }
        }

        if (targetItem && this.placeholder) {
            this.list.insertBefore(
                this.placeholder,
                insertAfter ? targetItem.nextSibling : targetItem,
            );
        }
    }

    private onEnd = () => {
        if (!this.dragging || !this.dragItem || !this.placeholder) {
            this.cleanup();
            return;
        }

        window.removeEventListener('pointermove', this.onMove);
        window.removeEventListener('pointerup', this.onEnd);

        if (this.clone) {
            this.clone.remove();
            this.clone = null;
        }

        // 恢复原元素
        this.dragItem.style.display = '';
        // 将原元素移动到占位符位置
        this.placeholder.parentNode?.insertBefore(this.dragItem, this.placeholder);
        this.placeholder.remove();
        this.placeholder = null;

        // 收集新的顺序
        const order: (string | number)[] = [];
        const currentItems = this.getAllItems(); // 此时 dragItem 已回到列表
        currentItems.forEach((el, idx) => {
            const id = el.dataset.id;
            order.push(id !== undefined ? id : idx);
        });
        this.options.onSort(order);

        this.cleanup();
    };

    private cleanup() {
        this.dragging = false;
        this.dragItem = null;
        this.placeholder?.remove();
        this.placeholder = null;
        this.clone?.remove();
        this.clone = null;
        document.body.style.userSelect = '';
    }

    // ──────────────────────── 公共方法 ────────────────────────
    public destroy() {
        window.removeEventListener('pointermove', this.onMove);
        window.removeEventListener('pointerup', this.onEnd);
        this.list.removeEventListener('pointerdown', this.onStart);
        // 确保残留的占位符和克隆被移除
        if (this.placeholder) {
            this.placeholder.remove();
            this.placeholder = null;
        }
        if (this.clone) {
            this.clone.remove();
            this.clone = null;
        }
        document.body.style.userSelect = '';
        this.dragging = false;
        this.dragItem = null;
    }
}