// src/utils/sortable/index.ts
export interface SortableOptions {
    /** 动画持续时间（ms） */
    animationSpeed?: number;
    /** 动画缓动函数 */
    animationEasing?: string;
    /** 拖拽手柄选择器（如 '.drag-handle'），为空则整个项可拖拽 */
    handle?: string;
    /** 排列方向：'vertical'（默认）| 'horizontal' | 'grid' */
    direction?: 'vertical' | 'horizontal' | 'grid';
    /** 网格模式下列数，direction='grid' 时有效，默认 auto 自动计算 */
    columns?: number;
}

export class Sortable {
    private list: HTMLElement;
    private options: Required<SortableOptions>;
    private onSort?: (newOrder: number[]) => void;

    private items: HTMLElement[] = [];
    private dragItem: HTMLElement | null = null;
    private dragHandle: HTMLElement | null = null;

    private startX: number = 0;
    private startY: number = 0;
    private startLeft: number = 0;
    private startTop: number = 0;

    private placeholder: HTMLElement | null = null;
    private initialOrder: number[] = [];  // 拖拽开始时 order 数组
    private currentIndex: number = -1;
    private overIndex: number = -1;
    private animating: boolean = false;

    private boundDragStart: (e: MouseEvent | TouchEvent) => void;
    private boundDragMove: (e: MouseEvent | TouchEvent) => void;
    private boundDragEnd: () => void;

    constructor(list: HTMLElement, onSort?: (newOrder: number[]) => void, options: SortableOptions = {}) {
        this.list = list;
        this.onSort = onSort;
        this.options = {
            animationSpeed: options.animationSpeed ?? 200,
            animationEasing: options.animationEasing ?? 'ease-out',
            handle: options.handle ?? '',
            direction: options.direction ?? 'vertical',
            columns: options.columns ?? 0,
        };

        // 绑定函数以便移除事件
        this.boundDragStart = this.onDragStart.bind(this);
        this.boundDragMove = this.onDragMove.bind(this);
        this.boundDragEnd = this.onDragEnd.bind(this);

        this.init();
    }

    private init() {
        this.list.addEventListener('mousedown', this.boundDragStart as EventListener);
        this.list.addEventListener('touchstart', this.boundDragStart as EventListener, { passive: false });
        // 让子项也可以继续触发?
    }

    public destroy() {
        this.list.removeEventListener('mousedown', this.boundDragStart as EventListener);
        this.list.removeEventListener('touchstart', this.boundDragStart as EventListener);
        window.removeEventListener('mousemove', this.boundDragMove as EventListener);
        window.removeEventListener('mouseup', this.boundDragEnd);
        window.removeEventListener('touchmove', this.boundDragMove as EventListener);
        window.removeEventListener('touchend', this.boundDragEnd);
    }

    private reset() {
        this.items = Array.from(this.list.children) as HTMLElement[];
    }

    private getPrimaryAxis(e: MouseEvent | TouchEvent): { x: number; y: number } {
        if (e instanceof TouchEvent) {
            const touch = e.touches[0] || e.changedTouches[0];
            return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
        }
        return { x: e.clientX, y: e.clientY };
    }

    private onDragStart(e: MouseEvent | TouchEvent) {
        if (this.animating) return;
        this.reset();
        if (this.items.length < 2) return;

        let target = e.target as HTMLElement;
        let handle: HTMLElement | null = null;
        let item: HTMLElement | null = null;

        // 查找 handle 和 item
        while (target && target !== this.list) {
            if (this.options.handle && target.matches(this.options.handle)) {
                handle = target;
            }
            if (target.hasAttribute('data-sortable-item')) {
                item = target;
            }
            target = target.parentElement as HTMLElement;
        }

        if (this.options.handle && !handle) return;
        if (!item) return;

        const pos = this.getPrimaryAxis(e);
        this.dragItem = item;
        this.dragHandle = handle;
        this.startX = pos.x;
        this.startY = pos.y;
        const rect = item.getBoundingClientRect();
        this.startLeft = rect.left;
        this.startTop = rect.top;
        this.currentIndex = this.items.indexOf(item);
        if (this.currentIndex === -1) return;

        // 锁定当前元素顺序
        this.initialOrder = this.items.map((_, idx) => idx);

        // 创建占位符（保持尺寸）
        this.placeholder = document.createElement('div');
        this.placeholder.style.width = rect.width + 'px';
        this.placeholder.style.height = rect.height + 'px';
        this.placeholder.style.flexShrink = '0';
        // 在 item 前插入占位符
        item.parentNode?.insertBefore(this.placeholder, item);

        // 设置 item 为绝对定位（相对于列表）
        this.list.style.position = 'relative';
        item.style.position = 'absolute';
        item.style.zIndex = '1000';
        item.style.left = rect.left - this.list.getBoundingClientRect().left + 'px';
        item.style.top = rect.top - this.list.getBoundingClientRect().top + 'px';
        item.style.width = rect.width + 'px';
        item.style.height = rect.height + 'px';
        item.classList.add('opacity-80', 'shadow-lg');

        // 绑定移动和释放事件
        window.addEventListener('mousemove', this.boundDragMove as EventListener);
        window.addEventListener('mouseup', this.boundDragEnd);
        window.addEventListener('touchmove', this.boundDragMove as EventListener, { passive: false });
        window.addEventListener('touchend', this.boundDragEnd);

        e.preventDefault();
    }

    private onDragMove(e: MouseEvent | TouchEvent) {
        if (!this.dragItem || !this.placeholder || this.animating) return;
        const pos = this.getPrimaryAxis(e);
        const deltaX = pos.x - this.startX;
        const deltaY = pos.y - this.startY;

        // 移动拖拽元素
        const listRect = this.list.getBoundingClientRect();
        const itemLeft = pos.x - this.startX + (this.startLeft - listRect.left);
        const itemTop = pos.y - this.startY + (this.startTop - listRect.top);
        this.dragItem.style.left = itemLeft + 'px';
        this.dragItem.style.top = itemTop + 'px';

        // 计算当前悬停索引
        const itemCenterX = itemLeft + this.dragItem.offsetWidth / 2;
        const itemCenterY = itemTop + this.dragItem.offsetHeight / 2;

        // 找到离中心点最近的可排序项（排除占位符和拖拽项）
        let minDistance = Infinity;
        let targetIndex = -1;
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if (item === this.dragItem) continue;
            const rect = item.getBoundingClientRect();
            const cx = rect.left + rect.width / 2 - listRect.left;
            const cy = rect.top + rect.height / 2 - listRect.top;
            // 根据方向计算距离权重
            let dist = 0;
            if (this.options.direction === 'horizontal') {
                dist = Math.abs(itemCenterX - cx);
            } else if (this.options.direction === 'vertical') {
                dist = Math.abs(itemCenterY - cy);
            } else { // grid: 欧氏距离
                dist = Math.hypot(itemCenterX - cx, itemCenterY - cy);
            }
            if (dist < minDistance) {
                minDistance = dist;
                targetIndex = i;
            }
        }

        if (targetIndex !== -1 && targetIndex !== this.overIndex) {
            this.overIndex = targetIndex;
            // 更新占位符位置：移动到目标项的前面或后面
            const targetItem = this.items[targetIndex];
            if (this.initialOrder.indexOf(this.currentIndex) < this.initialOrder.indexOf(targetIndex)) {
                // 拖拽项在后面，占位符插到目标项之后
                targetItem.parentNode?.insertBefore(this.placeholder, targetItem.nextSibling);
            } else {
                // 拖拽项在前面，占位符插到目标项之前
                targetItem.parentNode?.insertBefore(this.placeholder, targetItem);
            }
        }
        e.preventDefault();
    }

    private onDragEnd() {
        if (!this.dragItem || !this.placeholder) return;
        window.removeEventListener('mousemove', this.boundDragMove as EventListener);
        window.removeEventListener('mouseup', this.boundDragEnd);
        window.removeEventListener('touchmove', this.boundDragMove as EventListener);
        window.removeEventListener('touchend', this.boundDragEnd);

        this.animating = true;
        const item = this.dragItem;
        item.classList.remove('opacity-80', 'shadow-lg');

        // 获取目标位置（占位符的 index）
        const children = Array.from(this.list.children);
        const placeholderIndex = children.indexOf(this.placeholder);
        // 移除占位符
        this.placeholder.remove();
        this.placeholder = null;

        const finalItems = Array.from(this.list.children) as HTMLElement[];

        // 更稳健：根据当前元素顺序重新排列 DOM，并触发回调
        // 我们通过记录原始索引和目标位置重新排列元素

        // 获取所有子元素（除 dragItem 外）
        const otherItems = finalItems.filter(el => el !== item);
        // 如果目标插入位置有效，则插入
        if (placeholderIndex >= 0 && placeholderIndex < otherItems.length) {
            otherItems.splice(placeholderIndex, 0, item);
        } else {
            otherItems.push(item); // 放到末尾
        }

        // 清空列表并重新按顺序添加
        this.list.innerHTML = '';
        otherItems.forEach(el => this.list.appendChild(el));

        // 计算新顺序（按 data-sortable-item 的原始索引无关，直接使用当前数组索引）
        const newOrder = otherItems.map(el => this.items.indexOf(el) );

        // 平滑移动到目标位置
        item.style.transition = `all ${this.options.animationSpeed}ms ${this.options.animationEasing}`;
        // 计算最终位置（相对于列表）
        // 但此时元素已经是按顺序放置的，只需移除绝对定位即可让它回到文档流
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
        item.style.zIndex = '';
        item.style.width = '';
        item.style.height = '';
        setTimeout(() => {
            item.style.transition = '';
            this.animating = false;
            if (this.onSort) {
                this.onSort(newOrder);
            }
            // 重置状态
            this.dragItem = null;
            this.overIndex = -1;
        }, this.options.animationSpeed);
    }
}