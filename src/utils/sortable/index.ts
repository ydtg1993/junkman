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

    private getItemType(el: HTMLElement): 'row' | 'block' {
        return el.tagName === 'TR' ? 'row' : 'block';
    }

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
        clone.style.backgroundColor = bgColor !== 'rgba(0, 0, 0, 0)' ? bgColor : '#fff';
        clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        clone.style.opacity = '0.95';

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
        } else {
            clone.style.width = `${rect.width}px`;
        }
        return clone;
    }

    private getItems(): HTMLElement[] {
        // 获取所有可拖拽项，排除占位符和当前隐藏的拖拽项
        return Array.from(this.list.querySelectorAll('[data-sortable-item]'))
            .filter(el => el !== this.placeholder && el !== this.dragItem) as HTMLElement[];
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

    private onStart = (e: PointerEvent) => {
        // 防止重复拖拽
        if (this.dragging) return;

        // 使用 closest 直接获取拖拽项（更可靠）
        let target = e.target as HTMLElement;
        let item: HTMLElement | null = null;
        if (this.options.handle) {
            const handle = target.closest(this.options.handle);
            if (handle) {
                item = handle.closest('[data-sortable-item]');
            }
        } else {
            item = target.closest('[data-sortable-item]');
        }
        if (!item) return;

        // 阻止默认行为，防止选中文本
        e.preventDefault();
        document.body.style.userSelect = 'none';

        this.dragItem = item;
        this.startIndex = this.getItems().indexOf(item);
        const rect = item.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        this.startScrollTop = this.list.scrollTop;
        this.startScrollLeft = this.list.scrollLeft;

        // 创建占位符
        this.placeholder = this.createPlaceholder(item);
        item.parentNode!.insertBefore(this.placeholder, item);

        // 创建克隆体并添加到 body
        this.clone = this.cloneWithLayout(item, rect);
        document.body.appendChild(this.clone);

        // 强制渲染克隆体
        this.clone.getBoundingClientRect();
        // 隐藏原元素（不占位）
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
            const distanceToTop = mouseY - rect.top;
            const distanceToBottom = rect.bottom - mouseY;
            if (distanceToTop < edgeThreshold && distanceToTop > 0) {
                this.list.scrollTop -= scrollSpeed;
            } else if (distanceToBottom < edgeThreshold && distanceToBottom > 0) {
                this.list.scrollTop += scrollSpeed;
            }
        } else {
            const mouseX = e.clientX;
            const distanceToLeft = mouseX - rect.left;
            const distanceToRight = rect.right - mouseX;
            if (distanceToLeft < edgeThreshold && distanceToLeft > 0) {
                this.list.scrollLeft -= scrollSpeed;
            } else if (distanceToRight < edgeThreshold && distanceToRight > 0) {
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

        const lastItemPos = this.getPrimaryClientPos(lastItem);
        const lastItemSize = this.getPrimarySize(lastItem);
        const lastItemEnd = lastItemPos + lastItemSize;
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
                // 跳过当前拖拽项（它已被隐藏，理论上不在 items 中，但以防万一）
                if (el === this.dragItem) continue;
                const elPos = this.getPrimaryClientPos(el);
                const elSize = this.getPrimarySize(el);
                const center = elPos + elSize / 2;
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
                insertAfter ? targetItem.nextSibling : targetItem
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

        // 恢复原元素显示
        this.dragItem.style.display = '';
        // 将原元素移动到占位符位置
        this.list.insertBefore(this.dragItem, this.placeholder);
        this.placeholder.remove();

        // 触发排序回调
        const order: (string | number)[] = [];
        const currentItems = this.getItems();
        currentItems.forEach(el => {
            const id = el.dataset.id;
            order.push(id !== undefined ? id : currentItems.indexOf(el));
        });
        this.options.onSort(order);

        this.cleanup();
    };

    private cleanup() {
        this.dragItem = null;
        this.placeholder = null;
        this.clone = null;
        this.dragging = false;
        document.body.style.userSelect = '';
    }

    public destroy() {
        window.removeEventListener('pointermove', this.onMove);
        window.removeEventListener('pointerup', this.onEnd);
        this.list.removeEventListener('pointerdown', this.onStart);
        this.cleanup();
    }
}