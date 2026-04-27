import { TreeNode } from '../../aid/tree';

export interface CascadeOptions {
    limit?: number;
    searchable?: boolean;
    placeholder?: string;
    selectedKeys?: (string | number)[];
    parentNode?: HTMLElement;
    onChange?: (selectedNodes: TreeNode[]) => void;
}

// 新增：树管理器的配置
export interface CascadeTreeOptions {
    apiUrl: string;                           // 后台基础 URL
    searchable?: boolean;                     // 是否显示搜索框
    parentNode?: HTMLElement;                 // 挂载父节点
    // 自定义表单渲染（可选，不传则使用默认 input 表单）
    formRenderer?: (
        node: TreeNode | null,
        type: 'insert' | 'update' | 'delete' | 'migrate' | 'exchange',
        context?: { parent?: TreeNode; targetNode?: TreeNode }
    ) => HTMLElement | undefined;
    // 回调优先级高于 REST 请求，若提供则直接调用，否则走 apiUrl
    onInsert?: (parentKey: string | number, newNode: any) => Promise<any>;
    onUpdate?: (node: TreeNode, newVal: string) => Promise<any>;
    onDelete?: (node: TreeNode) => Promise<any>;
    onMigrate?: (node: TreeNode, targetKey: string | number) => Promise<any>;
    onExchange?: (nodeA: TreeNode, nodeB: TreeNode) => Promise<any>;
}