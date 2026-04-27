import { dimensionalTree, FlattenedNode, TreeNode } from '../../aid/tree';
import { Icon } from '../../aid/icon';
import { generateUniqueString } from '../../aid/random';
import { CascadeOptions } from './types';

export class CascadeSelector {
    protected container: HTMLElement;
    protected options: Required<CascadeOptions>;
    protected data: TreeNode[];
    protected flatData: FlattenedNode[][] = [];
    protected stacks: HTMLElement[] = [];
    protected selectedNodes: TreeNode[] = [];
    protected searchInput: HTMLInputElement | null = null;
    protected searchDropdown: HTMLElement | null = null;
    protected searchDebounceTimer: number | null = null;
    protected uniqueId: string;

    private expandedParents: (string | undefined)[] = [];

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
            onChange: () => { },
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
        this.container.className = 'flex flex-col gap-2 bg-base-100 p-2 rounded-lg border border-base-300 relative';
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
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
            if (stackLevel > 0) li.classList.add('hidden');

            const hasChildren = node.nodes && node.nodes.length > 0;
            const isSelected = this.selectedNodes.some(n => n.key === node.key);
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
                if (String(this.expandedParents[stackLevel]) === String(node.key)) {
                    expandIcon.style.transform = 'rotate(90deg)';
                }
                left.appendChild(expandIcon);
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'truncate';
            textSpan.textContent = node.val;
            left.appendChild(textSpan);
            a.appendChild(left);

            if (isSelected || partialSelected) {
                const mark = document.createElement('span');
                mark.className = isSelected ? 'text-success' : 'text-warning';
                mark.innerHTML = isSelected ? Icon.check : Icon.check_circle;
                a.appendChild(mark);
            }

            // ---------- 自定义右键菜单绑定（仅在有子节点时）----------
            if (hasChildren) {
                a.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showContextMenu(a, [
                        { title: '全选子级', func: () => this.selectAllChildren(node) },
                        { title: '取消全选', func: () => this.deselectAllChildren(node) },
                    ], e);
                });
            }

            li.appendChild(a);
            ul.appendChild(li);
        }
        stackDiv.appendChild(ul);
    }

    /**
     * 自定义右键菜单（绝对定位，点击外部自动关闭）
     */
    private showContextMenu(
        anchor: HTMLElement,
        items: { title: string; func: () => void }[],
        event: MouseEvent
    ) {
        // 移除已存在的菜单
        const existing = document.querySelector('.cascade-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('ul');
        menu.className = 'cascade-context-menu menu bg-base-200 rounded shadow-lg p-1 absolute z-50';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        menu.style.minWidth = '120px';

        items.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = item.title;
            a.className = 'block px-2 py-1 hover:bg-primary hover:text-primary-content rounded text-sm cursor-pointer';
            a.addEventListener('click', () => {
                menu.remove();
                item.func();
            });
            li.appendChild(a);
            menu.appendChild(li);
        });

        document.body.appendChild(menu);

        const closeHandler = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
                document.removeEventListener('contextmenu', closeHandler);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
            document.addEventListener('contextmenu', closeHandler);
        }, 0);
    }

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
        for (let level = 0; level < oldExpanded.length; level++) {
            const parentKey = oldExpanded[level];
            if (parentKey !== undefined) {
                const nodeData = this.flatData[level]?.find(n => String(n.key) === parentKey);
                if (nodeData) {
                    this.applyExpand(level, nodeData);
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

        // 单击事件：展开/收起 或 选中/取消选中（保持不变）
        columnsContainer.addEventListener('click', (e) => {
            const a = (e.target as HTMLElement).closest('a[data-key]') as HTMLElement;
            if (!a) return;
            const hasChildren = a.getAttribute('data-has-children') === 'true';
            const domKey = a.getAttribute('data-key')!;
            const stackLevel = parseInt(a.getAttribute('data-stack') || '0');
            const nodeData = this.flatData[stackLevel]?.find(n => String(n.key) === domKey);
            if (!nodeData) return;

            if (hasChildren) {
                if (this.expandedParents[stackLevel] === domKey) {
                    this.collapseFromLevel(stackLevel);
                } else {
                    this.expandToNextLevel(stackLevel, nodeData);
                }
            } else {
                if (this.isSelected(nodeData.key)) {
                    this.removeSelected(nodeData.key);
                } else {
                    this.addSelected(nodeData);
                }
            }
        });

        // 搜索输入处理（保持不变）
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = window.setTimeout(() => {
                    this.handleSearch(this.searchInput!.value.trim());
                }, 300);
            });
            this.searchInput.addEventListener('focus', () => {
                if (this.searchInput!.value.trim()) {
                    this.handleSearch(this.searchInput!.value.trim());
                }
            });
            document.addEventListener('click', (e) => {
                if (this.searchDropdown && !this.searchInput?.contains(e.target as Node) && !this.searchDropdown.contains(e.target as Node)) {
                    this.searchDropdown.remove();
                    this.searchDropdown = null;
                }
            });
        }

        // 注意：容器级右键监听已移除，改为在 renderStack 中为每个节点单独绑定
    }

    // ---------- 展开/收缩 ----------
    private expandToNextLevel(currentLevel: number, parentNode: FlattenedNode) {
        this.expandedParents[currentLevel] = String(parentNode.key);
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
        this.applyPathHighlight(currentLevel, parentNode);
    }

    private applyExpand(currentLevel: number, parentNode: FlattenedNode) {
        const nextLevel = currentLevel + 1;
        if (nextLevel >= this.stacks.length) return;
        const nextStackDiv = this.stacks[nextLevel];
        if (!nextStackDiv) return;

        const childrenKeys = (parentNode.nodes?.map(n => String(n.key)) || []) as string[];
        const allLi = nextStackDiv.querySelectorAll('li');
        allLi.forEach(li => li.classList.add('hidden'));

        allLi.forEach(li => {
            const el = li.querySelector('[data-key]') as HTMLElement;
            if (el && childrenKeys.includes(el.getAttribute('data-key')!)) {
                li.classList.remove('hidden');
            }
        });

        this.collapseDeeperLevels(nextLevel);
        const firstVisible = nextStackDiv.querySelector('li:not(.hidden)');
        if (firstVisible) {
            firstVisible.scrollIntoView({ block: 'nearest' });
        }
        this.updateExpandIcons(currentLevel);
    }

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
        this.expandedParents.length = level;
        for (let i = level + 1; i < this.stacks.length; i++) {
            const stackDiv = this.stacks[i];
            if (stackDiv) {
                const allLi = stackDiv.querySelectorAll('li');
                allLi.forEach(li => li.classList.add('hidden'));
            }
        }
        if (level >= 0) {
            const stackDiv = this.stacks[level];
            if (stackDiv) {
                const allA = stackDiv.querySelectorAll('a[data-key]');
                allA.forEach(a => a.classList.remove('opacity-40'));
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
                    if (this.expandedParents[level] === key) {
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
        for (let level = 0; level < this.expandedParents.length; level++) {
            const parentKey = this.expandedParents[level];
            if (parentKey !== undefined) {
                const nodeData = this.flatData[level]?.find(n => String(n.key) === parentKey);
                if (nodeData) {
                    this.applyExpand(level, nodeData);
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

    // ---------- 搜索（下拉菜单）----------
    private handleSearch(keyword: string) {
        if (this.searchDropdown) {
            this.searchDropdown.remove();
            this.searchDropdown = null;
        }
        if (!keyword) return;

        const matched: { stack: number; index: number; node: FlattenedNode }[] = [];
        for (let s = 0; s < this.flatData.length; s++) {
            for (let i = 0; i < this.flatData[s].length; i++) {
                const node = this.flatData[s][i];
                if (node.val.toLowerCase().includes(keyword.toLowerCase())) {
                    matched.push({ stack: s, index: i, node });
                }
            }
        }
        if (matched.length === 0) return;

        const dropdown = document.createElement('div');
        dropdown.className = 'absolute top-8 left-0 right-0 z-50 bg-base-100 border rounded shadow-lg max-h-48 overflow-y-auto';
        const ul = document.createElement('ul');
        ul.className = 'menu menu-xs p-0';
        matched.forEach(m => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = m.node.val;
            a.addEventListener('click', () => {
                this.navigateToNode(m.stack, m.index);
                dropdown.remove();
                this.searchDropdown = null;
            });
            li.appendChild(a);
            ul.appendChild(li);
        });
        dropdown.appendChild(ul);
        this.container.appendChild(dropdown);
        this.searchDropdown = dropdown;
    }

    private navigateToNode(stackLevel: number, index: number) {
        const targetFlat = this.flatData[stackLevel]?.[index];
        if (!targetFlat) return;

        this.expandedParents = targetFlat.parentNodes.map(p => String(p));
        this.refreshAllStacks();

        const stackDiv = this.stacks[stackLevel];
        if (stackDiv) {
            const target = stackDiv.querySelector(`[data-index="${index}"]`) as HTMLElement;
            if (target) {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                target.classList.add('!bg-yellow-100');
                setTimeout(() => target.classList.remove('!bg-yellow-100'), 1500);
            }
        }
    }

    // ---------- 公共接口 ----------
    public getValue(): TreeNode[] { return [...this.selectedNodes]; }

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

        this.expandedParents = [];
        if (newSelected.length > 0) {
            const firstNode = newSelected[0];
            let targetFlat: FlattenedNode | undefined;
            for (const levelData of this.flatData) {
                targetFlat = levelData.find(n => n.key === firstNode.key);
                if (targetFlat) break;
            }
            if (targetFlat) {
                for (let i = 0; i < targetFlat.parentNodes.length; i++) {
                    this.expandedParents[i] = String(targetFlat.parentNodes[i]);
                }
                if (targetFlat.nodes && targetFlat.nodes.length) {
                    this.expandedParents[targetFlat.stack] = String(firstNode.key);
                }
            }
        }

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