import { CascadeSelector } from './index';
import { TreeNode } from '../../aid/tree';
import { request } from '../../aid/request';
import { dimensionalTree } from '../../aid/tree';
import { contextmenu } from '../../aid/contextmenu';
import { CascadeOptions } from './types';

export interface CascadeTreeOptions extends CascadeOptions {
    apiUrl: string;
    onInsert?: (parentKey: string | number, newNode: any) => Promise<any>;
    onUpdate?: (node: TreeNode, newVal: string) => Promise<any>;
    onDelete?: (node: TreeNode) => Promise<any>;
    onMigrate?: (node: TreeNode, target: TreeNode) => Promise<any>;
    onExchange?: (nodeA: TreeNode, nodeB: TreeNode) => Promise<any>;
}

export class CascadeTree extends CascadeSelector {
    protected apiUrl: string;
    protected callbacks: Partial<Pick<CascadeTreeOptions, 'onInsert' | 'onUpdate' | 'onDelete' | 'onMigrate' | 'onExchange'>>;

    constructor(selector: string | HTMLElement, data: TreeNode[], options: CascadeTreeOptions) {
        super(selector, data, options);
        this.apiUrl = options.apiUrl;
        this.callbacks = {
            onInsert: options.onInsert,
            onUpdate: options.onUpdate,
            onDelete: options.onDelete,
            onMigrate: options.onMigrate,
            onExchange: options.onExchange,
        };
        this.enableContextMenu();
    }

    private enableContextMenu() {
        // 从父类容器中选择最后的多列容器
        const columnsContainer = this.container.lastChild as HTMLElement;
        if (!columnsContainer) return;

        columnsContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const nodeDiv = (e.target as HTMLElement).closest('[data-key]') as HTMLElement;
            if (!nodeDiv) return;
            const key = nodeDiv.getAttribute('data-key')!;
            const stackLevel = parseInt(nodeDiv.getAttribute('data-stack') || '0');
            const nodeData = this.flatData[stackLevel]?.find((n: any) => String(n.key) === key);
            if (!nodeData) return;

            const menuItems = [];
            menuItems.push({ title: '新增子节点', func: () => this.insertChild(nodeData) });
            menuItems.push({ title: '修改名称', func: () => this.updateNode(nodeData) });
            menuItems.push({ title: '删除节点', func: () => this.deleteNode(nodeData) });
            if (nodeData.parentNodes.length) {
                menuItems.push({ title: '迁移到根', func: () => this.migrateToRoot(nodeData) });
            }
            menuItems.push({ title: '交换节点', func: () => this.exchangeNode(nodeData) });
            contextmenu([this.container], menuItems);
        });
    }

    private async insertChild(parent: any) {
        const newVal = prompt('请输入新节点名称', '新节点');
        if (!newVal) return;

        let result;
        if (this.callbacks.onInsert) {
            result = await this.callbacks.onInsert(parent.key, { val: newVal });
        } else {
            try {
                result = await request({ url: `${this.apiUrl}/create`, method: 'POST', data: { parent_id: parent.key, val: newVal } });
                result = result.data;
            } catch (e) {
                console.error(e);
                return;
            }
        }
        if (result && result.key) {
            this.refreshData();
        }
    }

    private async updateNode(node: any) {
        const newVal = prompt('请输入新名称', node.val);
        if (!newVal || newVal === node.val) return;

        let result;
        if (this.callbacks.onUpdate) {
            result = await this.callbacks.onUpdate(node.originalNode, newVal);
        } else {
            try {
                result = await request({ url: `${this.apiUrl}/${node.key}`, method: 'PUT', data: { val: newVal } });
                result = result.data;
            } catch (e) {
                console.error(e);
                return;
            }
        }
        if (result && result.val) {
            node.val = result.val;
            node.originalNode.val = result.val;
            this.refreshAllStacks();
        }
    }

    private async deleteNode(node: any) {
        if (!confirm(`确定删除「${node.val}」及其所有子节点吗？`)) return;

        let success = false;
        if (this.callbacks.onDelete) {
            success = await this.callbacks.onDelete(node.originalNode);
        } else {
            try {
                await request({ url: `${this.apiUrl}/${node.key}`, method: 'DELETE' });
                success = true;
            } catch (e) {
                console.error(e);
            }
        }
        if (success) {
            this.refreshData();
        }
    }

    private async migrateToRoot(node: any) {
        let success = false;
        if (this.callbacks.onMigrate) {
            success = await this.callbacks.onMigrate(node.originalNode, { key: 0 } as TreeNode);
        } else {
            try {
                await request({ url: `${this.apiUrl}/migrate`, method: 'POST', data: { node_key: node.key, target_key: 0 } });
                success = true;
            } catch (e) {
                console.error(e);
            }
        }
        if (success) {
            this.refreshData();
        }
    }

    private async exchangeNode(node: any) {
        const targetKey = prompt('请输入要交换的目标节点 Key');
        if (!targetKey) return;
        let success = false;
        if (this.callbacks.onExchange) {
            const targetNode = this.findNodeByKey(targetKey);
            if (targetNode) success = await this.callbacks.onExchange(node.originalNode, targetNode);
        } else {
            try {
                await request({ url: `${this.apiUrl}/exchange`, method: 'POST', data: { node_key: node.key, target_key: targetKey } });
                success = true;
            } catch (e) {
                console.error(e);
            }
        }
        if (success) {
            this.refreshData();
        }
    }

    private async refreshData() {
        try {
            const response = await request({ url: this.apiUrl, method: 'GET' });
            if (Array.isArray(response)) {
                this.data = response;
                this.flatData = dimensionalTree(response);
                this.rebuildStacks();
            }
        } catch (e) {
            console.error('刷新数据失败', e);
        }
    }
}