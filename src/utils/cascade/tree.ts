import { dimensionalTree, FlattenedNode, TreeNode } from '../../aid/tree';
import { request } from '../../aid/request';
import { CascadeTreeOptions } from './types';
import { Modal } from '../modal/index';
import { Icon } from '../../aid/icon';
import { generateUniqueString } from '../../aid/random';
import { GlobalEventManager } from '../../aid/eventmanager';
import { TreeDragDrop } from './tree-dragdrop';

export class CascadeTree {
    protected container: HTMLElement;
    protected options: CascadeTreeOptions;
    protected data: TreeNode[];
    protected flatData: FlattenedNode[][] = [];
    protected stacks: HTMLElement[] = [];
    protected searchInput: HTMLInputElement | null = null;
    protected searchDropdown: HTMLElement | null = null;
    protected searchDebounceTimer: number | null = null;
    protected uniqueId: string;
    protected expandedParents: (string | undefined)[] = [];

    private callbacks: Partial<Pick<CascadeTreeOptions, 'onInsert' | 'onUpdate' | 'onDelete' | 'onMigrate'>>;
    private globalEvents = new GlobalEventManager();
    private treeDragDrop?: TreeDragDrop;

    constructor(selector: string | HTMLElement, data: TreeNode[], options: CascadeTreeOptions) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Container element not found');
        this.data = data;

        this.options = {
            searchable: true,
            parentNode: document.body,
            formRenderer: undefined,
            ...options,
        };

        this.callbacks = {
            onInsert: options.onInsert,
            onUpdate: options.onUpdate,
            onDelete: options.onDelete,
            onMigrate: options.onMigrate,
        };
        this.uniqueId = generateUniqueString(6);
        this.init();
    }

    private init() {
        this.flatData = dimensionalTree(this.data);
        this.render();
        this.bindEvents();
        if (this.options.draggable) {
            this.treeDragDrop = new TreeDragDrop({
                container: this.container,
                getFlattenedNodes: () => this.data,
                onDragEnd: async (dragged, target, position) => {
                    if (this.options.onDragEnd) {
                        const success = await this.options.onDragEnd(dragged, target, position);
                        if (success) await this.refreshData();
                    } else {
                        this.moveNode(dragged, target, position);
                        await this.refreshData();
                    }
                }
            });
        }
    }

    private render() {
        this.container.innerHTML = '';
        this.container.className = 'flex flex-col gap-2 bg-base-100 p-2 rounded-lg border border-base-300 relative';
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        if (this.options.searchable !== false) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input input-bordered input-sm w-full';
            input.placeholder = '搜索节点...';
            this.container.appendChild(input);
            this.searchInput = input;
        }

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

        // 获取当前层级展开的父节点
        const activeParentKey = this.expandedParents[stackLevel];

        for (let idx = 0; idx < nodes.length; idx++) {
            const node = nodes[idx];
            const li = document.createElement('li');
            if (stackLevel > 0) li.classList.add('hidden');

            const hasChildren = (node.nodes && node.nodes.length > 0) || !!this.options.loadChildren;

            const a = document.createElement('a');
            let aClass = 'flex items-center justify-between py-1.5 px-2 hover:bg-base-200 cursor-pointer rounded';
            // 高亮逻辑：如果当前层有活动父节点，且当前节点非活动父节点，则置灰
            if (activeParentKey !== undefined && String(node.key) !== activeParentKey) {
                aClass += ' opacity-40';
            }
            a.className = aClass;
            a.setAttribute('data-key', String(node.key));
            a.setAttribute('data-stack', String(stackLevel));
            a.setAttribute('data-index', String(idx));
            a.setAttribute('data-has-children', hasChildren ? 'true' : 'false');
            a.setAttribute('draggable', 'true');

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

            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const menuItems = [
                    { title: '新增子节点', func: () => this.insertChild(node) },
                    { title: '修改名称', func: () => this.updateNode(node) },
                    { title: '删除节点', func: () => this.deleteNode(node) },
                ];
                if (node.parentNodes.length > 0) {
                    menuItems.push({ title: '迁移到根', func: () => this.migrateToRoot(node) });
                }
                this.showContextMenu(a, menuItems, e);
            });

            li.appendChild(a);
            ul.appendChild(li);
        }
        stackDiv.appendChild(ul);
    }

    private showContextMenu(anchor: HTMLElement, items: { title: string; func: () => void }[], event: MouseEvent) {
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
            }
        };
        this.globalEvents.add(document, 'click', closeHandler);
        this.globalEvents.add(document, 'contextmenu', closeHandler);
    }

    private refreshAllStacks() {
        const oldExpanded = [...this.expandedParents];
        for (let i = 0; i < this.flatData.length; i++) {
            this.renderStack(i);
        }
        for (let level = 0; level < oldExpanded.length; level++) {
            const parentKey = oldExpanded[level];
            if (parentKey !== undefined) {
                const nodeData = this.flatData[level]?.find(n => String(n.key) === parentKey);
                if (nodeData) {
                    this.applyExpand(level, nodeData, false);
                }
            }
        }
    }

    private async expandToNextLevel(currentLevel: number, parentNode: FlattenedNode) {
        // 先设置展开状态，以便 rebuildStacks 时能恢复
        this.expandedParents[currentLevel] = String(parentNode.key);
        this.expandedParents.length = currentLevel + 1;

        const node = parentNode.originalNode;
        if ((!node.nodes || node.nodes.length === 0) && this.options.loadChildren) {
            const expandIcon = this.getExpandIconElement(currentLevel, node.key);
            if (expandIcon) expandIcon.innerHTML = Icon.sub_loading;
            try {
                const children = await this.options.loadChildren(node);
                node.nodes = children;
                this.flatData = dimensionalTree(this.data);
                this.rebuildStacks(); // 会保留 expandedParents 并应用展开
            } catch (e) {
                console.error('加载子节点失败', e);
            }
            if (expandIcon) expandIcon.innerHTML = Icon.caret_right;
            return;
        }

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

    private getExpandIconElement(stackLevel: number, key: string | number): HTMLElement | null {
        const stackDiv = this.stacks[stackLevel];
        if (!stackDiv) return null;
        const a = stackDiv.querySelector(`a[data-key="${String(key)}"]`) as HTMLElement;
        return a ? a.querySelector('.expand-icon') : null;
    }

    private applyExpand(currentLevel: number, parentNode: FlattenedNode, clearHighlight = true) {
        const nextLevel = currentLevel + 1;
        if (nextLevel >= this.stacks.length) return;
        const nextStackDiv = this.stacks[nextLevel];
        if (!nextStackDiv) return;

        // 只在主动展开时清除下级旧的高亮（刷新/重建时不需要）
        if (clearHighlight) {
            const allAInNext = nextStackDiv.querySelectorAll('a[data-key]');
            allAInNext.forEach(a => {
                if (a.classList.contains('opacity-40')) {
                    a.classList.remove('opacity-40');
                }
            });
        }

        // ... 其余展开逻辑不变 ...
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
        const activeKey = String(parentNode.key);

        allA.forEach(a => {
            const key = a.getAttribute('data-key')!;
            if (key === activeKey) {
                if (a.classList.contains('opacity-40')) {
                    a.classList.remove('opacity-40');
                }
            } else {
                if (!a.classList.contains('opacity-40')) {
                    a.classList.add('opacity-40');
                }
            }
        });
    }

    private collapseFromLevel(level: number) {
        this.expandedParents.length = level;
        // 移除当前列及所有更深列的高亮
        for (let i = level; i < this.stacks.length; i++) {
            const stackDiv = this.stacks[i];
            if (stackDiv) {
                const allA = stackDiv.querySelectorAll('a[data-key]');
                allA.forEach(a => a.classList.remove('opacity-40'));
            }
        }
        // 隐藏更深层的 li
        for (let i = level + 1; i < this.stacks.length; i++) {
            const stackDiv = this.stacks[i];
            if (stackDiv) {
                const allLi = stackDiv.querySelectorAll('li');
                allLi.forEach(li => li.classList.add('hidden'));
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
                    this.applyExpand(level, nodeData, false);
                }
            }
        }
    }

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
        if (targetFlat.nodes && targetFlat.nodes.length) {
            this.expandedParents[stackLevel] = String(targetFlat.key);
        }
        this.refreshAllStacks();

        const stackDiv = this.stacks[stackLevel];
        if (stackDiv) {
            const target = stackDiv.querySelector(`[data-index="${index}"]`) as HTMLElement;
            if (target) {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                target.classList.add('!bg-yellow-100');
                target.style.color = 'black';
                setTimeout(() => {
                    target.classList.remove('!bg-yellow-100');
                    target.style.color = 'unset';
                }, 1500);
            }
        }
    }

    private bindEvents() {
        const columnsContainer = this.container.lastChild as HTMLElement;
        if (!columnsContainer) return;

        // 搜索关闭全局事件（仅绑定一次）
        this.globalEvents.add(document, 'click', (e: MouseEvent) => {
            if (this.searchDropdown &&
                !this.searchInput?.contains(e.target as Node) &&
                !this.searchDropdown.contains(e.target as Node)) {
                this.searchDropdown.remove();
                this.searchDropdown = null;
            }
        });

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
            }
        });

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
        }
    }

    // ---------- 模态对话框 ----------
    private showModal(content: HTMLElement, title: string): Promise<any> {
        return new Promise((resolve) => {
            const modal = new Modal({
                parentNode: this.container,
                title,
                gauze: true,
                aspect: { width: '90%', height: 'auto' },
            });
            modal.setContent(content);
            modal.make();

            const modalNode = modal.getNode();
            if (!modalNode) {
                resolve(null);
                return;
            }

            const closeBtn = modalNode.querySelector('.btn-circle');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    resolve(null);
                    modal.close();
                });
            }

            modalNode.addEventListener('click', (e) => {
                if (e.target === modalNode) {
                    resolve(null);
                    modal.close();
                }
            });

            const form = modalNode.querySelector('form') as HTMLFormElement;
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data: any = {};
                    formData.forEach((value, key) => { data[key] = value; });
                    resolve(data);
                    modal.close();
                });
            } else {
                resolve({});
                modal.close();
            }
        });
    }

    // ---------- 表单生成 ----------
    private defaultFormContent(node: TreeNode | null, type: string, context?: any): HTMLElement {
        const form = document.createElement('form');
        form.className = 'flex flex-col gap-2';
        if (type === 'insert' || type === 'update') {
            form.innerHTML = `
        <label class="text-sm">名称</label>
        <input name="val" class="input input-bordered input-sm w-full" value="${type === 'update' ? node?.val || '' : ''}" required />
        <button type="submit" class="btn btn-sm btn-primary mt-2">确认</button>
      `;
        } else if (type === 'delete') {
            form.innerHTML = `
        <p class="text-sm text-error">确定要删除节点「${node?.val}」及其所有子节点吗？</p>
        <button type="submit" class="btn btn-sm btn-error mt-2">确认删除</button>
      `;
        } else if (type === 'migrate') {
            form.innerHTML = `
        <p class="text-sm">将「${node?.val}」移至根目录？</p>
        <button type="submit" class="btn btn-sm btn-warning mt-2">确认迁移</button>
      `;
        }
        return form;
    }

    private getAllNodes(nodes: TreeNode[]): TreeNode[] {
        let result: TreeNode[] = [];
        for (const node of nodes) {
            result.push(node);
            if (node.nodes) {
                result = result.concat(this.getAllNodes(node.nodes));
            }
        }
        return result;
    }

    private getFormContent(node: TreeNode | null, type: string, context?: any): HTMLElement {
        if (this.options.formRenderer) {
            const custom = this.options.formRenderer(node, type as any, context);
            if (custom) return custom;
        }
        return this.defaultFormContent(node, type, context);
    }

    // ---------- CRUD ----------
    private async insertChild(parentNode: FlattenedNode) {
        const form = this.getFormContent(parentNode.originalNode, 'insert', { parent: parentNode.originalNode });
        const result = await this.showModal(form, '新增节点');
        if (!result || !result.val) return;

        let success = false;
        if (this.callbacks.onInsert) {
            success = !!(await this.callbacks.onInsert(parentNode.originalNode.key, { val: result.val }));
        } else {
            try {
                await request({
                    url: this.options.apiUrl!,
                    method: 'POST',
                    data: { parent_id: parentNode.originalNode.key, val: result.val, ...result }
                });
                success = true;
            } catch (e) { console.error(e); }
        }
        if (success) await this.refreshData();
    }

    private async updateNode(flatNode: FlattenedNode) {
        const node = flatNode.originalNode;
        const form = this.getFormContent(node, 'update');
        const result = await this.showModal(form, '修改节点');
        if (!result || !result.val || result.val === node.val) return;

        let success = false;
        if (this.callbacks.onUpdate) {
            success = !!(await this.callbacks.onUpdate(node, result.val));
        } else {
            try {
                await request({
                    url: `${this.options.apiUrl}/${node.key}`,
                    method: 'PUT',
                    data: { val: result.val, ...result }
                });
                success = true;
            } catch (e) { console.error(e); }
        }
        if (success) await this.refreshData();
    }

    private async deleteNode(flatNode: FlattenedNode) {
        const node = flatNode.originalNode;
        const form = this.getFormContent(node, 'delete');
        const result = await this.showModal(form, '删除节点');
        if (!result) return;

        let success = false;
        if (this.callbacks.onDelete) {
            success = !!(await this.callbacks.onDelete(node));
        } else {
            try {
                await request({
                    url: `${this.options.apiUrl}/${node.key}`,
                    method: 'DELETE'
                });
                success = true;
            } catch (e) { console.error(e); }
        }
        if (success) await this.refreshData();
    }

    private async migrateToRoot(flatNode: FlattenedNode) {
        const node = flatNode.originalNode;
        const form = this.getFormContent(node, 'migrate');
        const result = await this.showModal(form, '迁移到根');
        if (!result) return;

        let success = false;
        const targetKey = 0;
        if (this.callbacks.onMigrate) {
            success = !!(await this.callbacks.onMigrate(node, targetKey));
        } else {
            try {
                await request({
                    url: `${this.options.apiUrl}/migrate`,
                    method: 'POST',
                    data: { node_key: node.key, target_key: targetKey }
                });
                success = true;
            } catch (e) { console.error(e); }
        }
        if (success) await this.refreshData();
    }

    // ---------- 节点移动 ----------
    private moveNode(dragged: TreeNode, target: TreeNode, position: 'before' | 'after' | 'inside') {
        this.removeNodeFromTree(this.data, dragged);
        if (position === 'inside') {
            if (!target.nodes) target.nodes = [];
            target.nodes.push(dragged);
        } else {
            this.insertNodeAdjacent(this.data, target, dragged, position);
        }
    }

    private removeNodeFromTree(nodes: TreeNode[], node: TreeNode) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].key === node.key) {
                nodes.splice(i, 1);
                return;
            }
            if (nodes[i].nodes) this.removeNodeFromTree(nodes[i].nodes!, node);
        }
    }

    private insertNodeAdjacent(nodes: TreeNode[], target: TreeNode, newNode: TreeNode, position: 'before' | 'after') {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].key === target.key) {
                if (position === 'before') nodes.splice(i, 0, newNode);
                else nodes.splice(i + 1, 0, newNode);
                return;
            }
            if (nodes[i].nodes) this.insertNodeAdjacent(nodes[i].nodes!, target, newNode, position);
        }
    }

    private async refreshData() {
        try {
            const response = await request({ url: this.options.apiUrl!, method: 'GET' });
            const newData = Array.isArray(response) ? response : response.data || response;
            if (Array.isArray(newData)) {
                this.data = newData;
                this.flatData = dimensionalTree(newData);
                this.rebuildStacks();
            }
        } catch (e) {
            console.error('刷新树数据失败', e);
        }
    }

    private findNodeByKey(key: string | number, nodes: TreeNode[] = this.data): TreeNode | null {
        for (const node of nodes) {
            if (node.key == key) return node;
            if (node.nodes) {
                const found = this.findNodeByKey(key, node.nodes);
                if (found) return found;
            }
        }
        return null;
    }

    public getData(): TreeNode[] {
        return this.data;
    }

    public setData(data: TreeNode[]) {
        this.data = data;
        this.flatData = dimensionalTree(data);
        this.rebuildStacks();
    }

    public destroy() {
        this.treeDragDrop?.destroy();
        this.globalEvents.removeAll();
        if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
        this.container.innerHTML = '';
    }
}