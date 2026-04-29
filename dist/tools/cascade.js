function renderCascadeSelector() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.CascadeSelector(container, data, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
            <tr><td>container</td><td>string | HTMLElement</td><td>是</td><td>挂载容器</td></tr>
            <tr><td>data</td><td>TreeNode[]</td><td>是</td><td>级联数据，每项包含 key、val 和可选的 nodes</td></tr>
            <tr><td>options</td><td>CascadeOptions</td><td>否</td><td>配置选项</td></tr>
        </table>

        <h3 class="mt-4">配置选项 (CascadeOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr><td>limit</td><td>number</td><td>0 (无限制)</td><td>最多可选中的叶子节点数</td></tr>
            <tr><td>searchable</td><td>boolean</td><td>true</td><td>是否显示搜索框</td></tr>
            <tr><td>placeholder</td><td>string</td><td>'-请选择-'</td><td>未选中时的占位文本</td></tr>
            <tr><td>selectedKeys</td><td>(string|number)[]</td><td>[]</td><td>初始选中的 key 数组</td></tr>
            <tr><td>parentNode</td><td>HTMLElement</td><td>document.body</td><td>右键菜单的挂载点</td></tr>
            <tr><td>onChange</td><td>(selectedNodes: TreeNode[]) => void</td><td>—</td><td>选中变化时的回调</td></tr>
            <tr><td>loadChildren</td><td>(node: TreeNode) => Promise&lt;TreeNode[]&gt;</td><td>—</td><td>异步加载子节点（支持懒加载）</td></tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>getValue()</td><td>获取当前选中的节点数组</td></tr>
            <tr><td>setValue(keys)</td><td>设置选中项（传入 key 数组）</td></tr>
            <tr><td>destroy()</td><td>销毁组件，清理事件和定时器</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>多列级联展开，点击有子节点的项会展开下一列，点击叶子节点即可选中。</li>
            <li>支持右键菜单快速全选/取消子级。</li>
            <li>搜索功能可快速定位并自动展开路径。</li>
        </ul>
    `;
    const demo = `<div id="cascadeSelectorTabs" class="mt-4"></div>`;
    return renderSection('📁 CascadeSelector 级联选择器', '多列级联选择，支持搜索、异步加载子节点。', api, demo);
}

function initCascadeSelector() {
    const container = document.getElementById('cascadeSelectorTabs');
    if (!container) return;

    // 示例数据（省市区）
    const mockData = [
        {
            key: '1', val: '北京市',
            nodes: [
                { key: '1-1', val: '朝阳区', nodes: [{ key: '1-1-1', val: '望京' }, { key: '1-1-2', val: '三里屯' }] },
                { key: '1-2', val: '海淀区', nodes: [{ key: '1-2-1', val: '中关村' }] }
            ]
        },
        {
            key: '2', val: '上海市',
            nodes: [
                { key: '2-1', val: '浦东新区', nodes: [{ key: '2-1-1', val: '陆家嘴' }, { key: '2-1-2', val: '张江' }] },
                { key: '2-2', val: '徐汇区', nodes: [{ key: '2-2-1', val: '漕河泾' }] }
            ]
        }
    ];

    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div id="cascadeDemo" class="max-w-lg"></div>
        <div id="cascadeResult" class="mt-2 text-xs text-success"></div>
    `;

    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const data = [
    { key: '1', val: '北京市', nodes: [
        { key: '1-1', val: '朝阳区', nodes: [
            { key: '1-1-1', val: '望京' },
            { key: '1-1-2', val: '三里屯' }
        ]}
    ]},
    { key: '2', val: '上海市', nodes: [...] }
];

new junkman.CascadeSelector('#cascadeDemo', data, {
    limit: 2,
    searchable: true,
    placeholder: '请选择地区',
    onChange: (nodes) => console.log(nodes)
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化级联选择器
    const cascadeContainer = effectDiv.querySelector('#cascadeDemo');
    const resultEl = effectDiv.querySelector('#cascadeResult');
    if (typeof junkman.CascadeSelector !== 'undefined' && cascadeContainer) {
        new junkman.CascadeSelector(cascadeContainer, mockData, {
            limit: 2,
            searchable: true,
            placeholder: '请选择地区',
            onChange: (nodes) => {
                if (resultEl) {
                    const names = nodes.map(n => n.val).join(', ');
                    resultEl.textContent = '已选: ' + (names || '无');
                }
            }
        });
    } else if (cascadeContainer) {
        cascadeContainer.innerHTML = '<p class="text-error text-sm">CascadeSelector 组件未加载</p>';
    }
}

function renderCascadeTree() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.CascadeTree(container, data, options)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
            <tr><td>container</td><td>string | HTMLElement</td><td>是</td><td>挂载容器</td></tr>
            <tr><td>data</td><td>TreeNode[]</td><td>是</td><td>树形数据</td></tr>
            <tr><td>options</td><td>CascadeTreeOptions</td><td>是</td><td>配置选项</td></tr>
        </table>

        <h3 class="mt-4">配置选项 (CascadeTreeOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr><td>searchable</td><td>boolean</td><td>true</td><td>是否显示搜索框</td></tr>
            <tr><td>draggable</td><td>boolean</td><td>false</td><td>是否启用节点拖拽迁移（需结合 onDragEnd）</td></tr>
            <tr><td>onDragEnd</td><td>(dragged, target, position) => Promise&lt;boolean&gt;</td><td>—</td><td>拖拽结束回调，返回 true 自动刷新树</td></tr>
            <tr><td>formRenderer</td><td>(node, type, context?) => HTMLElement</td><td>—</td><td>自定义模态框表单</td></tr>
            <tr><td>apiUrl</td><td>string</td><td>—</td><td>后端 API 根地址</td></tr>
            <tr><td>onInsert / onUpdate / onDelete / onMigrate / onExchange</td><td>函数</td><td>—</td><td>CRUD 回调（返回 true 表示成功）</td></tr>
            <tr><td>loadChildren</td><td>(node) => Promise&lt;TreeNode[]&gt;</td><td>—</td><td>异步加载子节点</td></tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>getData()</td><td>获取当前树数据</td></tr>
            <tr><td>setData(data)</td><td>设置新数据并刷新</td></tr>
            <tr><td>destroy()</td><td>销毁组件</td></tr>
        </table>

        <h3 class="mt-4">拖拽迁移</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>启用 <code>draggable: true</code> 后，节点可拖拽到其他节点上方/下方/内部。</li>
            <li>通过 <code>onDragEnd</code> 处理持久化，返回 <code>true</code> 自动刷新树。</li>
            <li>注意：节点必须设置 <code>data-node-key</code> 属性（组件已内置）。</li>
        </ul>
    `;
    const demo = `<div id="cascadeTreeTabs" class="mt-4"></div>`;
    return renderSection('🌲 CascadeTree 树形管理', '多级树形，支持增删改查、拖拽移动、异步加载。', api, demo);
}

function initCascadeTree() {
    const container = document.getElementById('cascadeTreeTabs');
    if (!container) return;

    // ---- 中国地级市测试数据 ----
    const cityData = [
        {
            key: 'gd', val: '广东省',
            nodes: [
                {
                    key: 'gd-sz', val: '深圳市',
                    nodes: [
                        { key: 'gd-sz-ns', val: '南山区' },
                        { key: 'gd-sz-ft', val: '福田区' },
                        { key: 'gd-sz-lh', val: '罗湖区' }
                    ]
                },
                {
                    key: 'gd-gz', val: '广州市',
                    nodes: [
                        { key: 'gd-gz-th', val: '天河区' },
                        { key: 'gd-gz-yx', val: '越秀区' }
                    ]
                },
                { key: 'gd-zh', val: '珠海市', nodes: [] }
            ]
        },
        {
            key: 'zj', val: '浙江省',
            nodes: [
                {
                    key: 'zj-hz', val: '杭州市',
                    nodes: [
                        { key: 'zj-hz-xh', val: '西湖区' },
                        { key: 'zj-hz-gs', val: '拱墅区' }
                    ]
                },
                { key: 'zj-nb', val: '宁波市', nodes: [] }
            ]
        },
        {
            key: 'js', val: '江苏省',
            nodes: [
                {
                    key: 'js-nj', val: '南京市',
                    nodes: [
                        { key: 'js-nj-xw', val: '玄武区' },
                        { key: 'js-nj-gl', val: '鼓楼区' }
                    ]
                },
                { key: 'js-sz', val: '苏州市', nodes: [] }
            ]
        }
    ];

    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <p class="text-sm font-bold mb-2">📌 拖拽节点重新组织行政区划（演示数据）</p>
        <div id="treeDemo" class="max-w-lg"></div>
        <div id="dragInfo" class="mt-2 text-xs text-info"></div>
    `;

    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const data = [
    { key: 'gd', val: '广东省', nodes: [
        { key: 'gd-sz', val: '深圳市', nodes: [...] },
        { key: 'gd-gz', val: '广州市', nodes: [...] }
    ]},
    { key: 'zj', val: '浙江省', nodes: [...] }
];

new junkman.CascadeTree('#treeDemo', data, {
    draggable: true,
    searchable: true,
    onDragEnd: async (dragged, target, position) => {
        console.log('移动', dragged.val, '到', target?.val, position);
        return true;  // 返回 true 自动刷新界面
    }
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化树组件
    const treeContainer = effectDiv.querySelector('#treeDemo');
    const infoEl = effectDiv.querySelector('#dragInfo');
    if (typeof junkman.CascadeTree !== 'undefined' && treeContainer) {
        const tree = new junkman.CascadeTree(treeContainer, cityData, {
            draggable: true,
            searchable: true,
            onDragEnd: async (dragged, target, position) => {
                if (infoEl) {
                    infoEl.textContent = `移动「${dragged.val}」→「${target?.val || '根'}」(${position})`;
                }
                // 模拟成功
                return true;
            }
        });
        // 暴露实例以便调试
        treeContainer._tree = tree;
    } else if (treeContainer) {
        treeContainer.innerHTML = '<p class="text-error text-sm">CascadeTree 组件未加载</p>';
    }
}