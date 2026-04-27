import { TreeNode } from '../../aid/tree';

export interface TreeDragDropOptions {
    container: HTMLElement;
    getFlattenedNodes: () => TreeNode[];
    onDragEnd: (draggedNode: TreeNode, targetNode: TreeNode | null, position: 'before' | 'after' | 'inside') => void;
}

export class TreeDragDrop {
    private options: TreeDragDropOptions;
    private dragNode: TreeNode | null = null;
    private ghost: HTMLElement | null = null;

    constructor(options: TreeDragDropOptions) {
        this.options = options;
        this.init();
    }

    private init() {
        const { container } = this.options;
        container.addEventListener('dragstart', this.onDragStart);
        container.addEventListener('dragover', this.onDragOver);
        container.addEventListener('drop', this.onDrop);
    }

    private onDragStart = (e: DragEvent) => {
        const target = (e.target as HTMLElement).closest('[data-node-key]') as HTMLElement;
        if (!target) return;
        const key = target.getAttribute('data-node-key')!;
        const node = this.findNode(key);
        if (!node) return;
        this.dragNode = node;
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', key);
        this.ghost = target.cloneNode(true) as HTMLElement;
        this.ghost.style.position = 'absolute';
        this.ghost.style.opacity = '0.7';
        document.body.appendChild(this.ghost);
        e.dataTransfer!.setDragImage(this.ghost, 0, 0);
        target.classList.add('opacity-50');
    };

    private onDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (!this.dragNode) return;
        const target = (e.target as HTMLElement).closest('[data-node-key]') as HTMLElement;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const yRatio = (e.clientY - rect.top) / rect.height;
        let position: 'before' | 'after' | 'inside' = 'inside';
        if (yRatio < 0.25) position = 'before';
        else if (yRatio > 0.75) position = 'after';
        e.dataTransfer!.dropEffect = 'move';
        (target as any).__dropPosition = position;
    };

    private onDrop = (e: DragEvent) => {
        e.preventDefault();
        if (!this.dragNode) return;
        const target = (e.target as HTMLElement).closest('[data-node-key]') as HTMLElement;
        if (!target) return;
        const targetKey = target.getAttribute('data-node-key')!;
        const targetNode = this.findNode(targetKey);
        const position = (target as any).__dropPosition || 'inside';
        this.clearIndicators();
        this.options.onDragEnd(this.dragNode, targetNode, position);
        this.dragNode = null;
    };

    private findNode(key: string): TreeNode | null {
        const search = (nodes: TreeNode[]): TreeNode | null => {
            for (const n of nodes) {
                if (String(n.key) === key) return n;
                if (n.nodes) {
                    const found = search(n.nodes);
                    if (found) return found;
                }
            }
            return null;
        };
        return search(this.options.getFlattenedNodes());
    }

    private clearIndicators() {
        document.querySelectorAll('[data-node-key].opacity-50').forEach(el => el.classList.remove('opacity-50'));
        if (this.ghost) {
            this.ghost.remove();
            this.ghost = null;
        }
    }

    public destroy() {
        const { container } = this.options;
        container.removeEventListener('dragstart', this.onDragStart);
        container.removeEventListener('dragover', this.onDragOver);
        container.removeEventListener('drop', this.onDrop);
        this.clearIndicators();
    }
}