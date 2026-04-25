import { dimensionalTree, FlattenedNode, TreeNode } from '../../aid/tree';
import { Icon } from '../../aid/icon';
import { generateUniqueString } from '../../aid/random';
import { contextmenu, ContextMenuItem } from '../../aid/contextmenu';
import { CascadeOptions } from './types';

export class CascadeSelector {
    protected container: HTMLElement;
    protected options: Required<CascadeOptions>;
    protected data: TreeNode[];
    protected flatData: FlattenedNode[][] = [];
    protected stacks: HTMLElement[] = [];
    protected selectedNodes: TreeNode[] = [];
    protected searchInput: HTMLInputElement | null = null;
    protected searchResultPanel: HTMLElement | null = null;
    protected searchResults: { stack: number; index: number }[] = [];
    protected currentSearchIndex: number = 0;
    protected searchDebounceTimer: number | null = null;
    protected uniqueId: string;

    constructor(selector: string | HTMLElement, data: TreeNode[], options: CascadeOptions = {}) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Container element not found');
        this.data = data;
        this.options = {
            limit: 0,
            searchable: true,
            placeholder: '-请选择-',
            selectedKeys: [],
            parentNode: document.body,
            onChange: () => {},
            ...options,
        };
        this.uniqueId = generateUniqueString(6);
        this.init();
    }

    private init() {
        this.flatData = dimensionalTree(this.data);
        this.render();
        this.bindEvents();
        if (this.options.selectedKeys?.length) {
            this.setValue(this.options.selectedKeys);
        }
    }

    private render() {
        this.container.innerHTML = '';
        this.container.className = 'flex flex-col gap-2';

        // 搜索框
        if (this.options.searchable) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input input-bordered input-sm w-full';
            input.placeholder = '搜索...';
            this.container.appendChild(input);
            this.searchInput = input;
        }

        // 已选标签区域
        const selectedArea = document.createElement('div');
        selectedArea.className = 'flex flex-wrap gap-1 min-h-[34px] p-2 border border-base-300 rounded text-gray-500';
        selectedArea.textContent = this.options.placeholder;
        this.container.appendChild(selectedArea);

        // 多列容器
        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'flex overflow-x-auto h-48';
        this.container.appendChild(columnsContainer);

        // 每一列
        for (let i = 0; i < this.flatData.length; i++) {
            const stackDiv = document.createElement('div');
            stackDiv.className = 'flex-1 min-w-[120px] border-r border-base-300 overflow-y-auto last:border-r-0';
            stackDiv.setAttribute('data-stack', i.toString());
            columnsContainer.appendChild(stackDiv);
            this.stacks.push(stackDiv);
            this.renderStack(i);
        }
    }

    protected renderStack(stackLevel: number) {
        const stackDiv = this.stacks[stackLevel];
        if (!stackDiv) return;
        stackDiv.innerHTML = '';
        const nodes = this.flatData[stackLevel];
        for (let idx = 0; idx < nodes.length; idx++) {
            const node = nodes[idx];
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'flex items-center px-2 py-1.5 cursor-pointer border-b border-base-200 hover:bg-base-200';
            nodeDiv.setAttribute('data-key', String(node.key));
            nodeDiv.setAttribute('data-stack', String(stackLevel));
            nodeDiv.setAttribute('data-index', String(idx));

            // 文本
            const textSpan = document.createElement('span');
            textSpan.className = 'flex-1 truncate';
            textSpan.textContent = node.val;
            nodeDiv.appendChild(textSpan);

            // 有子节点则添加展开图标
            if (node.nodes && node.nodes.length) {
                const expandIcon = document.createElement('i');
                expandIcon.className = 'inline-block mr-1 transition-transform';
                expandIcon.innerHTML = Icon.caret_right;
                nodeDiv.prepend(expandIcon);
            }

            // 选中标记
            const isSelected = this.selectedNodes.some(n => n.key === node.key);
            if (isSelected) {
                nodeDiv.classList.add('bg-green-100', 'border-green-300');
                const checkIcon = document.createElement('i');
                checkIcon.innerHTML = Icon.check;
                checkIcon.className = 'ml-1 text-success';
                nodeDiv.appendChild(checkIcon);
            }

            stackDiv.appendChild(nodeDiv);
        }
    }

    protected refreshAllStacks() {
        for (let i = 0; i < this.flatData.length; i++) {
            this.renderStack(i);
        }
        this.updateSelectedArea();
        this.highlightPath();
    }

    private updateSelectedArea() {
        const selectedArea = this.container.querySelector('.flex-wrap') as HTMLElement;
        if (!selectedArea) return;
        if (this.selectedNodes.length === 0) {
            selectedArea.textContent = this.options.placeholder;
            selectedArea.classList.remove('flex');
            selectedArea.classList.add('block');
            return;
        }
        selectedArea.classList.add('flex');
        selectedArea.classList.remove('block');
        if (this.options.limit === 1) {
            selectedArea.innerHTML = '';
            selectedArea.textContent = this.selectedNodes[0].val;
            return;
        }
        selectedArea.innerHTML = '';
        for (const node of this.selectedNodes) {
            const tag = document.createElement('span');
            tag.className = 'inline-flex items-center bg-base-300 rounded-full px-2 py-0.5 text-xs text-base-content';
            tag.textContent = node.val;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'ml-1 cursor-pointer hover:text-error';
            removeBtn.innerHTML = '✕';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeSelected(node.key);
            });
            tag.appendChild(removeBtn);
            selectedArea.appendChild(tag);
        }
    }

    private highlightPath() {
        if (this.selectedNodes.length === 0) return;
        const lastSelected = this.selectedNodes[this.selectedNodes.length - 1];
        const findNodePath = (key: string | number, stackLevel: number = 0): FlattenedNode | null => {
            for (const node of this.flatData[stackLevel] || []) {
                if (node.key === key) return node;
            }
            return null;
        };

        // 清除所有状态
        for (const stackDiv of this.stacks) {
            for (const child of Array.from(stackDiv.children)) {
                child.classList.remove('bg-blue-100', 'font-semibold');
                const icon = child.querySelector('i:first-child');
                if (icon) icon.classList.remove('rotate-90');
            }
        }

        let currentKey = lastSelected.key;
        for (let level = this.flatData.length - 1; level >= 0; level--) {
            const nodeInfo = findNodePath(currentKey, level);
            if (!nodeInfo) continue;
            const stackDiv = this.stacks[level];
            const targetNode = stackDiv.querySelector(`[data-key="${currentKey}"]`) as HTMLElement;
            if (targetNode) {
                targetNode.classList.add('bg-blue-100', 'font-semibold');
                if (level > 0) {
                    const parentKey = nodeInfo.parentNodes[nodeInfo.parentNodes.length - 1];
                    const parentNode = (stackDiv.parentElement as HTMLElement)?.querySelector(`[data-key="${parentKey}"]`) as HTMLElement;
                    if (parentNode) {
                        const icon = parentNode.querySelector('i:first-child');
                        if (icon) icon.classList.add('rotate-90');
                    }
                }
            }
            currentKey = nodeInfo.parentNodes[nodeInfo.parentNodes.length - 1];
            if (!currentKey) break;
        }
    }

    private bindEvents() {
        const columnsContainer = this.container.lastChild as HTMLElement; // 最后一个子元素是多列容器
        if (!columnsContainer) return;

        // 节点点击
        columnsContainer.addEventListener('click', (e) => {
            const nodeDiv = (e.target as HTMLElement).closest('[data-key]') as HTMLElement;
            if (!nodeDiv) return;
            const key = nodeDiv.getAttribute('data-key')!;
            const stackLevel = parseInt(nodeDiv.getAttribute('data-stack') || '0');
            const nodeData = this.flatData[stackLevel]?.find(n => String(n.key) === key);
            if (!nodeData) return;

            if (nodeData.nodes && nodeData.nodes.length) {
                const icon = nodeDiv.querySelector('i:first-child');
                const isExpanded = icon?.classList.toggle('rotate-90');
                if (isExpanded) {
                    this.expandToNextLevel(stackLevel, nodeData);
                } else {
                    this.collapseFromLevel(stackLevel + 1);
                }
            } else {
                if (this.isSelected(nodeData.key)) {
                    this.removeSelected(nodeData.key);
                } else {
                    this.addSelected(nodeData);
                }
            }
            e.stopPropagation();
        });

        // 搜索
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = window.setTimeout(() => {
                    this.handleSearch(this.searchInput!.value);
                }, 300);
            });
        }

        // 右键菜单
        columnsContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const nodeDiv = (e.target as HTMLElement).closest('[data-key]') as HTMLElement;
            if (!nodeDiv) return;
            const key = nodeDiv.getAttribute('data-key')!;
            const stackLevel = parseInt(nodeDiv.getAttribute('data-stack') || '0');
            const nodeData = this.flatData[stackLevel]?.find(n => String(n.key) === key);
            if (!nodeData) return;
            const hasChildren = nodeData.nodes && nodeData.nodes.length;
            const menuItems: ContextMenuItem[] = [];
            if (hasChildren) {
                menuItems.push({ title: '全选子级', func: () => this.selectAllChildren(nodeData) });
                menuItems.push({ title: '取消全选', func: () => this.deselectAllChildren(nodeData) });
            }
            if (menuItems.length) {
                contextmenu([this.container], menuItems);
            }
        });
    }

    private expandToNextLevel(currentLevel: number, parentNode: FlattenedNode) {
        const nextLevel = currentLevel + 1;
        if (nextLevel >= this.flatData.length) {
            const childrenNodes = parentNode.originalNode.nodes;
            if (childrenNodes && childrenNodes.length) {
                this.flatData = dimensionalTree(this.data);
                this.rebuildStacks();
            }
            return;
        }
        const nextStackDiv = this.stacks[nextLevel];
        if (!nextStackDiv) return;
        const childrenKeys = parentNode.nodes?.map(n => n.key) || [];
        const allNodes = nextStackDiv.querySelectorAll('[data-key]');
        allNodes.forEach(node => {
            const key = node.getAttribute('data-key')!;
            (node as HTMLElement).classList.toggle('hidden', !childrenKeys.includes(key));
        });
        const firstVisible = nextStackDiv.querySelector('[data-key]:not(.hidden)') as HTMLElement;
        if (firstVisible) firstVisible.scrollIntoView({ block: 'nearest' });
    }

    protected collapseFromLevel(level: number) {
        for (let i = level; i < this.stacks.length; i++) {
            const stackDiv = this.stacks[i];
            if (stackDiv) {
                const nodes = stackDiv.querySelectorAll('[data-key]');
                nodes.forEach(node => (node as HTMLElement).classList.add('hidden'));
            }
        }
    }

    protected rebuildStacks() {
        const columnsContainer = this.container.lastChild as HTMLElement;
        if (!columnsContainer) return;
        columnsContainer.innerHTML = '';
        this.stacks = [];
        for (let i = 0; i < this.flatData.length; i++) {
            const stackDiv = document.createElement('div');
            stackDiv.className = 'flex-1 min-w-[120px] border-r border-base-300 overflow-y-auto last:border-r-0';
            stackDiv.setAttribute('data-stack', i.toString());
            columnsContainer.appendChild(stackDiv);
            this.stacks.push(stackDiv);
            this.renderStack(i);
        }
    }

    private handleSearch(keyword: string) {
        if (!keyword.trim()) {
            this.clearSearchResults();
            return;
        }
        this.searchResults = [];
        for (let stack = 0; stack < this.flatData.length; stack++) {
            for (let idx = 0; idx < this.flatData[stack].length; idx++) {
                const node = this.flatData[stack][idx];
                if (node.val.toLowerCase().includes(keyword.toLowerCase())) {
                    this.searchResults.push({ stack, index: idx });
                }
            }
        }
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = 0;
        this.showSearchResultPanel();
        this.jumpToSearchResult(0);
    }

    private showSearchResultPanel() {
        if (this.searchResultPanel) this.searchResultPanel.remove();
        const panel = document.createElement('div');
        panel.className = 'absolute top-9 right-2 bg-white border rounded p-1 flex gap-1 shadow z-10';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-xs btn-outline';
        prevBtn.textContent = '◀';
        prevBtn.addEventListener('click', () => this.navigateSearch(-1));
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-xs btn-outline';
        nextBtn.textContent = '▶';
        nextBtn.addEventListener('click', () => this.navigateSearch(1));
        const counter = document.createElement('span');
        counter.className = 'text-xs leading-relaxed px-1';
        counter.textContent = `1/${this.searchResults.length}`;
        panel.appendChild(prevBtn);
        panel.appendChild(counter);
        panel.appendChild(nextBtn);
        this.container.appendChild(panel); // 相对于容器定位，故放在 this.container 内
        this.searchResultPanel = panel;
    }

    private navigateSearch(delta: number) {
        let newIndex = this.currentSearchIndex + delta;
        if (newIndex < 0) newIndex = this.searchResults.length - 1;
        if (newIndex >= this.searchResults.length) newIndex = 0;
        this.currentSearchIndex = newIndex;
        const counter = this.searchResultPanel?.querySelector('span');
        if (counter) counter.textContent = `${newIndex + 1}/${this.searchResults.length}`;
        this.jumpToSearchResult(newIndex);
    }

    private jumpToSearchResult(index: number) {
        const result = this.searchResults[index];
        if (!result) return;
        const stackDiv = this.stacks[result.stack];
        if (!stackDiv) return;
        const targetNode = stackDiv.querySelector(`[data-index="${result.index}"]`) as HTMLElement;
        if (targetNode) {
            targetNode.scrollIntoView({ block: 'center', behavior: 'smooth' });
            targetNode.classList.add('!bg-yellow-100');
            setTimeout(() => targetNode.classList.remove('!bg-yellow-100'), 1000);
            targetNode.click();
        }
    }

    private clearSearchResults() {
        if (this.searchResultPanel) {
            this.searchResultPanel.remove();
            this.searchResultPanel = null;
        }
        this.searchResults = [];
    }

    private addSelected(node: FlattenedNode) {
        if (this.options.limit > 0 && this.selectedNodes.length >= this.options.limit) {
            this.removeSelected(this.selectedNodes[0].key);
        }
        if (!this.isSelected(node.key)) {
            this.selectedNodes.push(node.originalNode);
            this.refreshAllStacks();
            this.options.onChange(this.selectedNodes);
        }
    }

    protected removeSelected(key: string | number) {
        const index = this.selectedNodes.findIndex(n => n.key === key);
        if (index !== -1) {
            this.selectedNodes.splice(index, 1);
            this.refreshAllStacks();
            this.options.onChange(this.selectedNodes);
        }
    }

    private isSelected(key: string | number): boolean {
        return this.selectedNodes.some(n => n.key === key);
    }

    private selectAllChildren(parentNode: FlattenedNode) {
        const collectAllDescendants = (node: TreeNode): TreeNode[] => {
            let result: TreeNode[] = [];
            if (node.nodes) {
                for (const child of node.nodes) {
                    result.push(child);
                    result.push(...collectAllDescendants(child));
                }
            }
            return result;
        };
        const descendants = collectAllDescendants(parentNode.originalNode);
        for (const node of descendants) {
            if (!this.isSelected(node.key)) {
                if (this.options.limit > 0 && this.selectedNodes.length >= this.options.limit) break;
                this.selectedNodes.push(node);
            }
        }
        this.refreshAllStacks();
        this.options.onChange(this.selectedNodes);
    }

    private deselectAllChildren(parentNode: FlattenedNode) {
        const collectAllDescendantKeys = (node: TreeNode): (string | number)[] => {
            let keys: (string | number)[] = [];
            if (node.nodes) {
                for (const child of node.nodes) {
                    keys.push(child.key);
                    keys.push(...collectAllDescendantKeys(child));
                }
            }
            return keys;
        };
        const keysToRemove = collectAllDescendantKeys(parentNode.originalNode);
        this.selectedNodes = this.selectedNodes.filter(n => !keysToRemove.includes(n.key));
        this.refreshAllStacks();
        this.options.onChange(this.selectedNodes);
    }

    public getValue(): TreeNode[] {
        return [...this.selectedNodes];
    }

    public setValue(keys: (string | number)[]) {
        const newSelected: TreeNode[] = [];
        for (const key of keys) {
            const found = this.findNodeByKey(key);
            if (found) newSelected.push(found);
        }
        if (this.options.limit > 0 && newSelected.length > this.options.limit) {
            console.warn(`超出限制数量 ${this.options.limit}，将截取前 ${this.options.limit} 个`);
            newSelected.length = this.options.limit;
        }
        this.selectedNodes = newSelected;
        this.refreshAllStacks();
        this.options.onChange(this.selectedNodes);
    }

    protected findNodeByKey(key: string | number, nodes: TreeNode[] = this.data): TreeNode | null {
        for (const node of nodes) {
            if (node.key === key) return node;
            if (node.nodes) {
                const found = this.findNodeByKey(key, node.nodes);
                if (found) return found;
            }
        }
        return null;
    }
}