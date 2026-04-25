export interface TreeNode {
    key: string | number;
    val: string;
    nodes?: TreeNode[];
}

export interface FlattenedNode extends TreeNode {
    stack: number;           // 层级（从0开始）
    parentNodes: (string | number)[]; // 所有祖先的 key
    originalNode: TreeNode;  // 原始节点引用
}

/**
 * 将树形结构按层级展平，用于级联选择器的多列渲染
 * @param nodes 树形节点数组
 * @param stack 当前层级（内部递归用）
 * @param parents 当前节点的祖先 key 列表（内部递归用）
 * @param output 输出数组（内部递归用）
 * @returns 按层级索引的二维数组，每一层是一个 FlattenedNode 数组
 */
export function dimensionalTree(
    nodes: TreeNode[],
    stack: number = 0,
    parents: (string | number)[] = [],
    output: FlattenedNode[][] = []
): FlattenedNode[][] {
    if (!output[stack]) output[stack] = [];
    for (const node of nodes) {
        const flatNode: FlattenedNode = {
            ...node,
            stack,
            parentNodes: [...parents],
            originalNode: node,
        };
        output[stack].push(flatNode);
        if (node.nodes && node.nodes.length) {
            dimensionalTree(node.nodes, stack + 1, [...parents, node.key], output);
        }
    }
    return output
}