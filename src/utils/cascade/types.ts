import { TreeNode } from '../../aid/tree';
export interface CascadeOptions {
    limit?: number;
    searchable?: boolean;
    placeholder?: string;
    selectedKeys?: (string | number)[];
    parentNode?: HTMLElement;
    onChange?: (selectedNodes: TreeNode[]) => void;
}