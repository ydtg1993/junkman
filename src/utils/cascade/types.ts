import { TreeNode } from '../../aid/tree';

export interface CascadeOptions {
    limit?: number;
    searchable?: boolean;
    placeholder?: string;
    selectedKeys?: (string | number)[];
    parentNode?: HTMLElement;
    onChange?: (selectedNodes: TreeNode[]) => void;
    /** 异步加载子节点的函数，返回子节点数组 */
    loadChildren?: (node: TreeNode) => Promise<TreeNode[]>;
}

export interface CascadeTreeOptions {
    apiUrl?: string;                           // 后台基础 URL（使用回调时可不传）
    searchable?: boolean;                     // 是否显示搜索框
    parentNode?: HTMLElement;                 // 挂载父节点
    formRenderer?: (
        node: TreeNode | null,
        type: 'insert' | 'update' | 'delete' | 'migrate' | 'exchange',
        context?: { parent?: TreeNode; targetNode?: TreeNode }
    ) => HTMLElement | undefined;
    onInsert?: (parentKey: string | number, newNode: any) => Promise<any>;
    onUpdate?: (node: TreeNode, newVal: string) => Promise<any>;
    onDelete?: (node: TreeNode) => Promise<any>;
    onMigrate?: (node: TreeNode, targetKey: string | number) => Promise<any>;
    onExchange?: (nodeA: TreeNode, nodeB: TreeNode) => Promise<any>;
    draggable?: boolean;
    onDragEnd?: (draggedNode: TreeNode, targetNode: TreeNode | null, position: 'before' | 'after' | 'inside') => boolean | Promise<boolean>;
    /** 异步加载子节点的函数，返回子节点数组 */
    loadChildren?: (node: TreeNode) => Promise<TreeNode[]>;
}