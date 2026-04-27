import { dimensionalTree, FlattenedNode, TreeNode } from '../../aid/tree';
import { request } from '../../aid/request';
import { contextmenu } from '../../aid/contextmenu';
import { CascadeTreeOptions } from './types';
import { Modal } from '../modal/index';
import { Icon } from '../../aid/icon';
import { generateUniqueString } from '../../aid/random';

export class CascadeTree {
    protected container: HTMLElement;
    protected options: CascadeTreeOptions;            // 改为非 Required
    protected data: TreeNode[];
    protected flatData: FlattenedNode[][] = [];
    protected stacks: HTMLElement[] = [];
    protected searchInput: HTMLInputElement | null = null;
    protected searchDropdown: HTMLElement | null = null;
    protected searchDebounceTimer: number | null = null;
    protected uniqueId: string;
    protected expandedParents: (string | undefined)[] = [];

    private callbacks: Partial<Pick<CascadeTreeOptions, 'onInsert' | 'onUpdate' | 'onDelete' | 'onMigrate' | 'onExchange'>>;

    constructor(selector: string | HTMLElement, data: TreeNode[], options: CascadeTreeOptions) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) as HTMLElement : selector;
        if (!this.container) throw new Error('Container element not found');
        this.data = data;

        // 设置默认值，解决可选属性缺失问题
        this.options = {
            searchable: true,
            parentNode: document.body,
            formRenderer: undefined,        // 可选
            ...options,
        };

        this.callbacks = {
            onInsert: options.onInsert,
            onUpdate: options.onUpdate,
            onDelete: options.onDelete,
            onMigrate: options.onMigrate,
            onExchange: options.onExchange,
        };
        this.uniqueId = generateUniqueString(6);
        this.init();
    }

    // ---------- 初始化 ----------
    private init() {
        this.flatData = dimensionalTree(this.data);
        this.render();
        this.bindEvents();
    }

    // ---------- 界面渲染（无选择区域）----------
    private render() {
        this.container.innerHTML = '';
        this.container.className = 'flex flex-col gap-2 bg-base-100 p-2 rounded-lg border border-base-300 relative';
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
        // 搜索框
        if (this.options.searchable !== false) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input input-bordered input-sm w-full';
            input.placeholder = '搜索节点...';
            this.container.appendChild(input);
            this.searchInput = input;
        }

        // 列容器
        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'flex overflow-x-auto h-60 gap-1';
        this.container.appendChild(columnsContainer);

        // 生成所有列
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

    // 渲染某一列（无选中标记）
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

            const a = document.createElement('a');
            a.className = 'flex items-center justify-between py-1.5 px-2 hover:bg-base-200 cursor-pointer rounded';
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

            // --- 新增：右键菜单绑定（仅在此节点上）---
            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const menuItems = [];
                menuItems.push({ title: '新增子节点', func: () => this.insertChild(node) });
                menuItems.push({ title: '修改名称', func: () => this.updateNode(node) });
                menuItems.push({ title: '删除节点', func: () => this.deleteNode(node) });
                if (node.parentNodes.length > 0) {
                    menuItems.push({ title: '迁移到根', func: () => this.migrateToRoot(node) });
                }
                menuItems.push({ title: '交换节点', func: () => this.exchangeNode(node) });
                this.showContextMenu(a, menuItems, e);
            });

            li.appendChild(a);
            ul.appendChild(li);
        }
        stackDiv.appendChild(ul);
    }

    // 自定义右键菜单（绝对定位，点击外部关闭）
    private showContextMenu(anchor: HTMLElement, items: { title: string; func: () => void }[], event: MouseEvent) {
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

    // 刷新所有列（保留展开状态）
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
                    this.applyExpand(level, nodeData);
                }
            }
        }
    }

    // ---------- 展开/收起逻辑 ----------
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

    // ---------- 搜索（仅导航）----------
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
                setTimeout(() => target.classList.remove('!bg-yellow-100'), 1500);
            }
        }
    }

    // ---------- 事件绑定 ----------
    private bindEvents() {
        const columnsContainer = this.container.lastChild as HTMLElement;
        if (!columnsContainer) return;

        // 单击：展开/收起
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

        // 搜索输入
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
    }

    // ---------- 模态对话框（手动绑定事件）----------
    private showModal(content: HTMLElement, title: string): Promise<any> {
        return new Promise((resolve) => {
            const modal = new Modal({
                parentNode: this.container,
                title,
                gauze: true,
                aspect: { width: '90%', height: 'auto' },
            });
            modal.setContent(content);
            modal.make();          // 先构建 DOM

            const modalNode = modal.getNode();
            if (!modalNode) {
                resolve(null);
                return;
            }

            // 关闭按钮
            const closeBtn = modalNode.querySelector('.btn-circle');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    resolve(null);
                    modal.close();
                });
            }

            // 点击遮罩关闭
            modalNode.addEventListener('click', (e) => {
                if (e.target === modalNode) {
                    resolve(null);
                    modal.close();
                }
            });

            // 表单提交
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
                // 无表单（如自定义删除确认），视为确认操作
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
        } else if (type === 'exchange') {
            form.className = 'flex flex-col gap-2';
            // 用于提交的隐藏域
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'targetKey';
            form.appendChild(hiddenInput);

            // 外层容器
            const container = document.createElement('div');
            container.className = 'flex flex-col gap-1 relative';

            const label = document.createElement('label');
            label.className = 'text-sm';
            label.textContent = '目标节点';
            container.appendChild(label);

            // 搜索输入框（仅用于显示选中名称和检索）
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'input input-bordered input-sm w-full';
            searchInput.placeholder = '输入名称搜索...';
            container.appendChild(searchInput);

            // 下拉列表容器（初始隐藏）
            const dropdown = document.createElement('div');
            dropdown.className = 'hidden absolute top-full left-0 right-0 z-50 bg-base-100 border rounded shadow-lg max-h-40 overflow-y-auto mt-1';
            container.appendChild(dropdown);

            form.appendChild(container);

            // 事件绑定：搜索并展示匹配节点（排除当前节点）
            if (node) {
                // 扁平化整个树到一个数组（便于搜索）排除自身
                const allNodes = this.getAllNodes(this.data).filter(n => n.key != node.key);

                searchInput.addEventListener('input', () => {
                    const keyword = searchInput.value.trim().toLowerCase();
                    dropdown.innerHTML = '';
                    if (!keyword) {
                        dropdown.classList.add('hidden');
                        return;
                    }
                    const matched = allNodes.filter(n => n.val.toLowerCase().includes(keyword));
                    if (matched.length === 0) {
                        dropdown.classList.add('hidden');
                        return;
                    }
                    matched.forEach(m => {
                        const item = document.createElement('div');
                        item.className = 'px-2 py-1 hover:bg-base-200 cursor-pointer text-sm';
                        item.textContent = m.val;
                        item.addEventListener('click', () => {
                            searchInput.value = m.val;           // 显示名称
                            hiddenInput.value = String(m.key);    // 设置真实 Key
                            dropdown.classList.add('hidden');
                        });
                        dropdown.appendChild(item);
                    });
                    dropdown.classList.remove('hidden');
                });

                // 点击外部关闭下拉
                document.addEventListener('click', (e) => {
                    if (!container.contains(e.target as Node)) {
                        dropdown.classList.add('hidden');
                    }
                });
            }

            // 提交按钮
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.className = 'btn btn-sm btn-secondary mt-2';
            submitBtn.textContent = '确认交换';
            form.appendChild(submitBtn);
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

    // ---------- CRUD 操作 ----------
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
                    url: this.options.apiUrl,
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

    private async exchangeNode(flatNode: FlattenedNode) {
        const node = flatNode.originalNode;
        const form = this.getFormContent(node, 'exchange');
        const result = await this.showModal(form, '交换节点');
        if (!result || !result.targetKey) return;

        let success = false;
        if (this.callbacks.onExchange) {
            const targetNode = this.findNodeByKey(result.targetKey);
            if (targetNode) {
                success = !!(await this.callbacks.onExchange(node, targetNode));
            } else {
                console.warn('目标节点未找到');
            }
        } else {
            try {
                await request({
                    url: `${this.options.apiUrl}/exchange`,
                    method: 'POST',
                    data: { node_key: node.key, target_key: result.targetKey }
                });
                success = true;
            } catch (e) { console.error(e); }
        }
        if (success) await this.refreshData();
    }

    // ---------- 数据刷新 ----------
    private async refreshData() {
        try {
            const response = await request({ url: this.options.apiUrl, method: 'GET' });
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

    // ---------- 工具方法 ----------
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
}