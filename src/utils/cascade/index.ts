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

    // 记录当前每个栈的展开父节点 key
    private expandedParents: (string | number | undefined)[] = [];

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
        this.container.className = 'flex flex-col gap-2 bg-base-100 p-2 rounded-lg border border-base-300';

        if (this.options.searchable) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input input-bordered input-sm w-full';
            input.placeholder = '搜索...';
            this.container.appendChild(input);
            this.searchInput = input;
        }

        const selectedArea = document.createElement('div');
        selectedArea.className = 'flex flex-wrap gap-1 min-h-[34px] p-2 border border-base-300 rounded text-base-content/60';
        selectedArea.textContent = this.options.placeholder;
        this.container.appendChild(selectedArea);

        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'flex overflow-x-auto h-60 gap-1';
        this.container.appendChild(columnsContainer);

        this.stacks = [];
        for (let i = 0; i < this.flatData.length; i++) {
            const stackDiv = document.createElement('div');
            stackDiv.className = 'flex-1 min-w-[130px] overflow-y-auto border-r border-base-200 last:border-r-0';
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
        if (!nodes || nodes.length === 0) return;

        const ul = document.createElement('ul');
        ul.className = 'menu menu-xs p-0 bg-base-100 rounded-lg w-full';

        for (let idx = 0; idx < nodes.length; idx++) {
            const node = nodes[idx];
            const li = document.createElement('li');
            // 非第一级默认隐藏，后续通过展开显示
            if (stackLevel > 0) li.classList.add('hidden');

            const hasChildren = node.nodes && node.nodes.length > 0;
            const isSelected = this.selectedNodes.some(n => n.key === node.key);
            // 部分选中：后代有节点被选中但本节点未全选
            const partialSelected = !isSelected && hasChildren && this.hasAnySelectedDescendant(node);

            const a = document.createElement('a');
            let aClass = 'flex items-center justify-between py-1.5 px-2 hover:bg-base-200 cursor-pointer rounded';
            if (isSelected) aClass += ' bg-success/10';
            a.className = aClass;
            a.setAttribute('data-key', String(node.key));
            a.setAttribute('data-stack', String(stackLevel));
            a.setAttribute('data-index', String(idx));
            a.setAttribute('data-has-children', hasChildren ? 'true' : 'false');

            const left = document.createElement('span');
            left.className = 'flex items-center gap-1';

            if (hasChildren) {
                const expandIcon = document.createElement('span');
                expandIcon.className = 'expand-icon transition-transform duration-200';
                expandIcon.innerHTML = Icon.caret_right;
                // 根据当前展开路径决定是否旋转
                if (this.expandedParents[stackLevel] === node.key) {
                    expandIcon.style.transform = 'rotate(90deg)';
                }
                left.appendChild(expandIcon);
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'truncate';
            textSpan.textContent = node.val;
            left.appendChild(textSpan);
            a.appendChild(left);

            // 状态标记
            if (isSelected || partialSelected) {
                const mark = document.createElement('span');
                mark.className = isSelected ? 'text-success' : 'text-warning';
                mark.innerHTML = isSelected ? Icon.check : Icon.check_circle;
                a.appendChild(mark);
            }

            li.appendChild(a);
            ul.appendChild(li);
        }
        stackDiv.appendChild(ul);
    }

    /** 判断某个节点是否有任意后代被选中 */
    private hasAnySelectedDescendant(node: FlattenedNode): boolean {
        const check = (n: TreeNode): boolean => {
            if (this.selectedNodes.some(s => s.key === n.key)) return true;
            if (n.nodes) {
                for (const child of n.nodes) {
                    if (check(child)) return true;
                }
            }
            return false;
        };
        if (!node.nodes) return false;
        for (const child of node.nodes) {
            if (check(child)) return true;
        }
        return false;
    }

    protected refreshAllStacks() {
        const oldExpanded = [...this.expandedParents];
        for (let i = 0; i < this.flatData.length; i++) {
            this.renderStack(i);
        }
        this.updateSelectedArea();
        // 重新应用展开状态到下一列
        for (let level = 0; level < oldExpanded.length; level++) {
            const parentKey = oldExpanded[level];
            if (parentKey !== undefined) {
                const parentNode = this.flatData[level]?.find(n => n.key === parentKey);
                if (parentNode) {
                    this.applyExpand(level, parentNode);
                }
            }
        }
    }

    private updateSelectedArea() {
        const selectedArea = this.container.children[1] as HTMLElement;
        if (!selectedArea) return;
        if (this.selectedNodes.length === 0) {
            selectedArea.textContent = this.options.placeholder;
            return;
        }
        if (this.options.limit === 1) {
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

    private bindEvents() {
        const columnsContainer = this.container.lastChild as HTMLElement;
        if (!columnsContainer) return;

        columnsContainer.addEventListener('click', (e) => {
            const a = (e.target as HTMLElement).closest('a[data-key]') as HTMLElement;
            if (!a) return;
            const hasChildren = a.getAttribute('data-has-children') === 'true';
            const key = a.getAttribute('data-key')!;
            const stackLevel = parseInt(a.getAttribute('data-stack') || '0');
            const nodeData = this.flatData[stackLevel]?.find(n => String(n.key) === key);
            if (!nodeData) return;

            if (hasChildren) {
                // 父节点：切换展开/收缩
                if (this.expandedParents[stackLevel] === nodeData.key) {
                    this.collapseFromLevel(stackLevel);
                } else {
                    this.expandToNextLevel(stackLevel, nodeData);
                }
            } else {
                // 叶子节点：选中/取消
                if (this.isSelected(nodeData.key)) {
                    this.removeSelected(nodeData.key);
                } else {
                    this.addSelected(nodeData);
                }
            }
        });

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = window.setTimeout(() => {
                    this.handleSearch(this.searchInput!.value);
                }, 300);
            });
        }

        columnsContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const a = (e.target as HTMLElement).closest('a[data-key]') as HTMLElement;
            if (!a) return;
            const key = a.getAttribute('data-key')!;
            const stackLevel = parseInt(a.getAttribute('data-stack') || '0');
            const nodeData = this.flatData[stackLevel]?.find(n => String(n.key) === key);
            if (!nodeData || !nodeData.nodes || nodeData.nodes.length === 0) return;

            contextmenu([this.container], [
                { title: '全选子级', func: () => this.selectAllChildren(nodeData) },
                { title: '取消全选', func: () => this.deselectAllChildren(nodeData) },
            ]);
        });
    }

    private expandToNextLevel(currentLevel: number, parentNode: FlattenedNode) {
        // 记录当前展开的父节点
        this.expandedParents[currentLevel] = parentNode.key;
        // 清除所有更深层次的展开状态
        this.expandedParents.length = currentLevel + 1;

        const nextLevel = currentLevel + 1;
        if (nextLevel >= this.flatData.length) {
            const childrenNodes = parentNode.originalNode.nodes;
            if (childrenNodes && childrenNodes.length) {
                this.flatData = dimensionalTree(this.data);
                this.rebuildStacks();
            }
            return;
        }

        this.applyExpand(currentLevel, parentNode);
        // 灰显当前列中不属于该路径的节点
        this.applyPathHighlight(currentLevel, parentNode);
    }

    private applyExpand(currentLevel: number, parentNode: FlattenedNode) {
        const nextLevel = currentLevel + 1;
        if (nextLevel >= this.stacks.length) return;

        const nextStackDiv = this.stacks[nextLevel];
        if (!nextStackDiv) return;

        // 🔧 修复：将 childrenKeys 转为字符串数组进行比较
        const childrenKeys = (parentNode.nodes?.map(n => String(n.key)) || []) as string[];
        const allLi = nextStackDiv.querySelectorAll('li');

        allLi.forEach(li => li.classList.add('hidden'));

        allLi.forEach(li => {
            const el = li.querySelector('[data-key]') as HTMLElement;
            if (el && childrenKeys.includes(el.getAttribute('data-key')!)) {
                li.classList.remove('hidden');
            }
        });

        // 关闭更深层级
        this.collapseDeeperLevels(nextLevel);

        // 滚动到第一个可见子节点
        const firstVisible = nextStackDiv.querySelector('li:not(.hidden)');
        if (firstVisible) {
            firstVisible.scrollIntoView({ block: 'nearest' });
        }

        this.updateExpandIcons(currentLevel);
    }

    /** 灰显当前列中不属于路径的节点 */
    private applyPathHighlight(stackLevel: number, parentNode: FlattenedNode) {
        const stackDiv = this.stacks[stackLevel];
        if (!stackDiv) return;
        const allA = stackDiv.querySelectorAll('a[data-key]');
        allA.forEach(a => {
            const key = a.getAttribute('data-key')!;
            if (key === String(parentNode.key)) {
                a.classList.remove('opacity-40');
            } else {
                a.classList.add('opacity-40');
            }
        });
    }

    private collapseFromLevel(level: number) {
        // 清除展开标记
        this.expandedParents.length = level;
        for (let i = level; i < this.stacks.length; i++) {
            const stackDiv = this.stacks[i];
            if (stackDiv) {
                const allLi = stackDiv.querySelectorAll('li');
                allLi.forEach(li => li.classList.add('hidden'));
            }
        }
        // 恢复灰显状态
        if (level > 0) {
            const parentLevel = level - 1;
            const parentKey = this.expandedParents[parentLevel];
            if (parentKey !== undefined) {
                const parentNode = this.flatData[parentLevel]?.find(n => n.key === parentKey);
                if (parentNode) this.applyPathHighlight(parentLevel, parentNode);
            } else {
                // 父级没有展开，清除所有路径高亮
                const stackDiv = this.stacks[parentLevel];
                if (stackDiv) {
                    const allA = stackDiv.querySelectorAll('a[data-key]');
                    allA.forEach(a => a.classList.remove('opacity-40'));
                }
            }
        }
        this.updateExpandIcons(level);
    }

    private collapseDeeperLevels(fromLevel: number) {
        for (let i = fromLevel + 1; i < this.stacks.length; i++) {
            const stackDiv = this.stacks[i];
            if (stackDiv) {
                const allLi = stackDiv.querySelectorAll('li');
                allLi.forEach(li => li.classList.add('hidden'));
            }
        }
    }

    private updateExpandIcons(stackLevel: number) {
        for (let level = 0; level < this.stacks.length; level++) {
            const stackDiv = this.stacks[level];
            if (!stackDiv) continue;
            const allA = stackDiv.querySelectorAll('a[data-has-children="true"]');
            allA.forEach(a => {
                const key = a.getAttribute('data-key')!;
                const icon = a.querySelector('.expand-icon') as HTMLElement;
                if (icon) {
                    if (this.expandedParents[level] === String(key) || this.expandedParents[level] === Number(key)) {
                        icon.style.transform = 'rotate(90deg)';
                    } else {
                        icon.style.transform = '';
                    }
                }
            });
        }
    }

    protected rebuildStacks() {
        const columnsContainer = this.container.lastChild as HTMLElement;
        if (!columnsContainer) return;
        columnsContainer.innerHTML = '';
        this.stacks = [];
        for (let i = 0; i < this.flatData.length; i++) {
            const stackDiv = document.createElement('div');
            stackDiv.className = 'flex-1 min-w-[130px] overflow-y-auto border-r border-base-200 last:border-r-0';
            stackDiv.setAttribute('data-stack', i.toString());
            columnsContainer.appendChild(stackDiv);
            this.stacks.push(stackDiv);
            this.renderStack(i);
        }
        // 重新应用所有展开状态
        for (let level = 0; level < this.expandedParents.length; level++) {
            const parentKey = this.expandedParents[level];
            if (parentKey !== undefined) {
                const parentNode = this.flatData[level]?.find(n => n.key === parentKey);
                if (parentNode) {
                    this.applyExpand(level, parentNode);
                }
            }
        }
    }

    // ---------- 选中逻辑 ----------
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
        const collect = (node: TreeNode): TreeNode[] => {
            let arr: TreeNode[] = [];
            if (node.nodes) {
                node.nodes.forEach(c => {
                    arr.push(c);
                    arr.push(...collect(c));
                });
            }
            return arr;
        };
        const descendants = collect(parentNode.originalNode);
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
        const keys = this.getAllDescendantKeys(parentNode.originalNode);
        this.selectedNodes = this.selectedNodes.filter(n => !keys.includes(n.key));
        this.refreshAllStacks();
        this.options.onChange(this.selectedNodes);
    }

    private getAllDescendantKeys(node: TreeNode): (string | number)[] {
        let keys: (string | number)[] = [];
        if (node.nodes) {
            node.nodes.forEach(c => {
                keys.push(c.key);
                keys.push(...this.getAllDescendantKeys(c));
            });
        }
        return keys;
    }

    // ---------- 搜索 ----------
    private handleSearch(keyword: string) {
        if (!keyword.trim()) {
            this.clearSearchResults();
            return;
        }
        this.searchResults = [];
        for (let s = 0; s < this.flatData.length; s++) {
            for (let i = 0; i < this.flatData[s].length; i++) {
                if (this.flatData[s][i].val.toLowerCase().includes(keyword.toLowerCase())) {
                    this.searchResults.push({ stack: s, index: i });
                }
            }
        }
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = 0;
        this.showSearchPanel();
        this.jumpToSearchResult(0);
    }

    private showSearchPanel() {
        if (this.searchResultPanel) this.searchResultPanel.remove();
        const panel = document.createElement('div');
        panel.className = 'absolute top-9 right-2 bg-base-100 border rounded p-1 flex gap-1 shadow z-10';
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
        this.container.appendChild(panel);
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

    public getValue(): TreeNode[] { return [...this.selectedNodes]; }

    public setValue(keys: (string | number)[]) {
        const newSelected: TreeNode[] = [];
        for (const key of keys) {
            const found = this.findNodeByKey(key);
            if (found) newSelected.push(found);
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

export type { CascadeTreeOptions } from './tree';