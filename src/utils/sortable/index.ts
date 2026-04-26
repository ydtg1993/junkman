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
    private clone: HTMLElement | null = null;           // 跟随鼠标的克隆体
    private dragging = false;
    private startIndex = -1;

    private startPoint = { x: 0, y: 0 };
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
        this.list.addEventListener('pointerdown', this.onStart.bind(this));
    }

    private getItems(): HTMLElement[] {
        return Array.from(this.list.children)
            .filter(el => {
                const node = el as HTMLElement;
                return (
                    node.hasAttribute('data-sortable-item') &&
                    node !== this.placeholder &&
                    node !== this.dragItem
                );
            }) as HTMLElement[];
    }

    private isVertical(): boolean {
        return this.options.direction === 'vertical';
    }

    // 获取鼠标位置（根据方向返回主要坐标）
    private getPoint(e: PointerEvent): number {
        return this.isVertical() ? e.clientY : e.clientX;
    }

    // 获取元素的主要尺寸（高度或宽度）
    private getPrimarySize(el: HTMLElement): number {
        const rect = el.getBoundingClientRect();
        return this.isVertical() ? rect.height : rect.width;
    }

    // 获取元素的主要位置（相对于视口）
    private getPrimaryClientPos(el: HTMLElement): number {
        const rect = el.getBoundingClientRect();
        return this.isVertical() ? rect.top : rect.left;
    }

    // =========================
    // START
    // =========================
    private onStart(e: PointerEvent) {
        let target = e.target as HTMLElement;
        let item: HTMLElement | null = null;

        // 查找实际拖拽项
        while (target && target !== this.list) {
            if (this.options.handle && target.matches(this.options.handle)) {
                item = target.closest('[data-sortable-item]') as HTMLElement;
                break;
            }
            if (target.hasAttribute('data-sortable-item')) {
                item = target;
                break;
            }
            target = target.parentElement!;
        }

        if (!item) return;

        e.preventDefault();

        this.dragItem = item;
        this.startIndex = this.getItems().indexOf(item);
        this.startPoint = { x: e.clientX, y: e.clientY };
        this.startScrollTop = this.list.scrollTop;
        this.startScrollLeft = this.list.scrollLeft;

        // 创建占位符
        const rect = item.getBoundingClientRect();
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'sortable-placeholder';
        this.placeholder.style[this.isVertical() ? 'height' : 'width'] = `${this.getPrimarySize(item)}px`;
        this.placeholder.style[this.isVertical() ? 'width' : 'height'] = '100%';
        this.placeholder.style.display = 'block';
        item.parentNode!.insertBefore(this.placeholder, item);

        // 创建克隆体
        this.clone = item.cloneNode(true) as HTMLElement;
        this.clone.style.position = 'fixed';
        this.clone.style.top = `${rect.top}px`;
        this.clone.style.left = `${rect.left}px`;
        this.clone.style.width = `${rect.width}px`;
        this.clone.style.height = `${rect.height}px`;
        this.clone.style.margin = '0';
        this.clone.style.zIndex = '10000';
        this.clone.style.opacity = '0.8';
        this.clone.style.pointerEvents = 'none';
        this.clone.style.transition = 'none';
        document.body.appendChild(this.clone);

        // 隐藏原元素
        item.style.display = 'none';

        this.dragging = true;

        window.addEventListener('pointermove', this.onMove);
        window.addEventListener('pointerup', this.onEnd);
    }

    // =========================
    // MOVE
    // =========================
    private onMove = (e: PointerEvent) => {
        if (!this.dragging || !this.dragItem || !this.placeholder) return;

        e.preventDefault();

        // 1. 移动克隆体
        const delta = this.isVertical() ? e.clientY - this.startPoint.y : e.clientX - this.startPoint.x;
        if (this.clone) {
            const startTop = parseFloat(this.clone.style.top);
            const startLeft = parseFloat(this.clone.style.left);
            if (this.isVertical()) {
                this.clone.style.top = `${startTop + delta}px`;
            } else {
                this.clone.style.left = `${startLeft + delta}px`;
            }
            this.startPoint = { x: e.clientX, y: e.clientY };
        }

        // 2. 边缘自动滚动
        this.autoScroll(e);

        // 3. 更新占位符位置
        this.updatePlaceholderPosition(e);
    };

    private autoScroll(e: PointerEvent) {
        const scrollSpeed = 5;
        const edgeThreshold = 50;
        const rect = this.list.getBoundingClientRect();
        const mouseY = e.clientY;
        const mouseX = e.clientX;

        if (this.isVertical()) {
            const distanceToTop = mouseY - rect.top;
            const distanceToBottom = rect.bottom - mouseY;
            if (distanceToTop < edgeThreshold && distanceToTop > 0) {
                this.list.scrollTop -= scrollSpeed;
            } else if (distanceToBottom < edgeThreshold && distanceToBottom > 0) {
                this.list.scrollTop += scrollSpeed;
            }
        } else {
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
        if (this.dragItem) {
            // 临时恢复原元素的显示以便计算正确的边界（visibility: hidden 仍占位，但为准确获取其他元素位置，保留占位）
        }
        let targetItem: HTMLElement | null = null;
        let insertAfter = false;

        // 特殊处理：鼠标在最后一个元素下方（垂直）或右边（水平）
        const lastItem = items[items.length - 1];
        const firstItem = items[0];
        if (lastItem) {
            const lastItemPos = this.getPrimaryClientPos(lastItem);
            const lastItemSize = this.getPrimarySize(lastItem);
            const lastItemEnd = lastItemPos + lastItemSize;
            if (mousePos > lastItemEnd) {
                targetItem = lastItem;
                insertAfter = true;
            } else if (mousePos < this.getPrimaryClientPos(firstItem)) {
                targetItem = firstItem;
                insertAfter = false;
            } else {
                // 正常查找最近元素
                let minDist = Infinity;
                for (const el of items) {
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
        }

        if (targetItem && this.placeholder) {
            this.list.insertBefore(
                this.placeholder,
                insertAfter ? targetItem.nextSibling : targetItem
            );
        }
    }

    // =========================
    // END
    // =========================
    private onEnd = () => {
        if (!this.dragging || !this.dragItem || !this.placeholder) return;

        window.removeEventListener('pointermove', this.onMove);
        window.removeEventListener('pointerup', this.onEnd);

        // 移除克隆体
        if (this.clone) {
            this.clone.remove();
            this.clone = null;
        }

        // 恢复原元素可见性
        this.dragItem.style.display = '';

        // 获取旧位置
        const oldRect = this.dragItem.getBoundingClientRect();

        // 将真实元素移动到 placeholder 位置
        this.list.insertBefore(this.dragItem, this.placeholder);
        this.placeholder.remove();

        const newRect = this.dragItem.getBoundingClientRect();

        // FLIP 动画
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        this.dragItem.style.transition = 'none';
        this.dragItem.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
            this.dragItem!.style.transition = `transform ${this.options.animationSpeed}ms ease`;
            this.dragItem!.style.transform = '';
        });

        // 清理样式并触发回调
        setTimeout(() => {
            if (this.dragItem) {
                this.dragItem.style.transition = '';
                this.dragItem.style.transform = '';
            }
            this.dragItem = null;
            this.placeholder = null;
            this.dragging = false;

            // 获取排序后的顺序（只考虑 data-sortable-item）
            const order: (string | number)[] = [];
            const currentItems = this.getItems();
            currentItems.forEach(el => {
                const id = el.dataset.id;
                order.push(id !== undefined ? id : currentItems.indexOf(el));
            });
            this.options.onSort(order);
        }, this.options.animationSpeed);
    };
}