function renderTable() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Table(container, columns, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>container</td>
                <td>string | HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>表格挂载的选择器或 DOM 元素</td>
            </tr>
            <tr>
                <td>columns</td>
                <td>Column[]</td>
                <td>是</td>
                <td>—</td>
                <td>列定义数组，每列包含字段名、类型、宽度等配置</td>
            </tr>
            <tr>
                <td>options</td>
                <td>TableOptions</td>
                <td>否</td>
                <td>{}</td>
                <td>表格全局选项，见下表</td>
            </tr>
        </table>

        <h3 class="mt-4">列定义 (Column)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>name</td><td>string</td><td>列标题</td></tr>
            <tr><td>field</td><td>string</td><td>数据字段名</td></tr>
            <tr><td>type</td><td>string</td><td>列类型，支持：'text' / 'input' / 'selector' / 'date' / 'image' / 'textarea' / 'number' / 'email' / 'password' / 'checkbox' / 'toggle' / 'switcher' / 'html' / 'time' / 'datetime-local' / 'url' / 'selection'</td></tr>
            <tr><td>width</td><td>string</td><td>列宽（例如 '120px'），不设置则由内容撑开</td></tr>
            <tr><td>align</td><td>'left'|'center'|'right'</td><td>文本对齐，默认左对齐</td></tr>
            <tr><td>pinned</td><td>'left'|'right'</td><td>固定列，不会随横向滚动而移动</td></tr>
            <tr><td>editable</td><td>boolean</td><td>是否可编辑（部分类型有效）</td></tr>
            <tr><td>options</td><td>object</td><td>用于 'selector'/'switcher' 的选项列表 {list, multiple?}</td></tr>
            <tr><td>config</td><td>object</td><td>额外配置，如 icon、pattern、validationMessage、attributes、towards 等</td></tr>
            <tr><td>delay</td><td>boolean</td><td>图片列是否启用延迟加载（配合 ImgLoader）</td></tr>
            <tr><td>zoomOptions</td><td>any</td><td>图片列的缩放选项</td></tr>
        </table>

        <h3 class="mt-4">全局选项 (TableOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr><td>sortable</td><td>boolean</td><td>true</td><td>是否启用拖拽排序</td></tr>
            <tr><td>deletable</td><td>boolean</td><td>true</td><td>是否显示行删除按钮</td></tr>
            <tr><td>hover</td><td>boolean</td><td>true</td><td>是否启用行悬停效果</td></tr>
            <tr><td>maxHeight</td><td>string</td><td>'400px'</td><td>表格最大高度，超出出现纵向滚动条</td></tr>
            <tr><td>updateUrl</td><td>string</td><td>''</td><td>单元格更新请求的 URL</td></tr>
            <tr><td>deleteUrl</td><td>string</td><td>''</td><td>行删除请求的 URL</td></tr>
            <tr><td>onDataChange</td><td>(data: any[]) => void</td><td>()=>{}</td><td>数据变更回调</td></tr>
            <tr><td>onSort</td><td>(order, originalData) => any[]</td><td>默认映射排序</td><td>自定义排序函数，需返回排序后的数据</td></tr>
            <tr><td>showBatchBar</td><td>boolean</td><td>true</td><td>是否显示批量操作栏</td></tr>
            <tr><td>onBatchDelete</td><td>(rows: any[]) => Promise&lt;any&gt;</td><td>—</td><td>批量删除回调</td></tr>
            <tr><td>onBatchUpdate</td><td>(rows, field, value) => Promise&lt;any&gt;</td><td>—</td><td>批量更新回调</td></tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>loadData(data)</td><td>加载数据并渲染表格</td></tr>
            <tr><td>getData()</td><td>获取当前数据</td></tr>
            <tr><td>setData(data)</td><td>设置数据并刷新</td></tr>
            <tr><td>getSelectedRows()</td><td>获取当前勾选的行数据</td></tr>
            <tr><td>refresh()</td><td>刷新表格视图</td></tr>
            <tr><td>destroy()</td><td>销毁表格，释放资源</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>表格固定使用 DaisyUI 的 <code>table-zebra</code> 和边框样式。</li>
            <li>内容超出容器时出现横向和纵向滚动条（已内置细条美化样式）。</li>
            <li>支持行内编辑（input/select/switcher 等），编辑后触发 <code>onDataChange</code> 和可选的远程更新。</li>
            <li>图片列可通过 <code>delay: true</code> 启用 ImgLoader 懒加载。</li>
            <li>启用排序后，行可拖拽排序，并通过 <code>onSort</code> 自定义排序逻辑。</li>
        </ul>
    `;
    const demo = `<div id="tableTabs" class="mt-4"></div>`;
    return renderSection('📊 Table 表格', '支持丰富列类型、排序、批量操作、图片懒加载的表格组件。', api, demo);
}

function initTable() {
    const container = document.getElementById('tableTabs');
    if (!container) return;

    // 效果面板：表格挂载点
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div id="tableDemo" class="mt-2 max-w-full"></div>
        <div class="mt-2 flex gap-2">
            <button class="btn btn-xs btn-outline" id="getTableDataBtn">获取数据</button>
            <button class="btn btn-xs btn-outline" id="clearTableSelectionBtn">清除选中</button>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const columns = [
    { name: '选择', field: 'sel', type: 'selection', width: '40px' },
    { name: '姓名', field: 'name', type: 'input', width: '120px' },
    { name: '邮箱', field: 'email', type: 'email', config: { icon: '📧' } },
    { name: '城市', field: 'city', type: 'selector', width: '120px',
      options: { list: [{ key: '京', value: '北京' }, { key: '沪', value: '上海' }] } },
    { name: '头像', field: 'avatar', type: 'image', delay: true, width: '64px' },
    { name: '状态', field: 'status', type: 'switcher', width: '120px',
      options: { list: [{ key: '1', value: '启用' }, { key: '0', value: '禁用' }] },
      config: { towards: junkman.SELECTOR_TOWARDS.Horizontal } }
];

const table = new junkman.Table('#tableDemo', columns, {
    sortable: true,
    deletable: true,
    maxHeight: '400px',
    showBatchBar: true,
    onDataChange: (data) => console.log('数据变更:', data),
    onBatchDelete: async (rows) => console.log('批量删除:', rows)
});

table.loadData([
    { id: 1, name: '张三', email: 'zhang@example.com', city: '京', avatar: 'https://picsum.photos/40/40?random=1', status: '1' },
    { id: 2, name: '李四', email: 'li@example.com', city: '沪', avatar: 'https://picsum.photos/40/40?random=2', status: '0' },
    // ... 更多数据
]);
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 列定义
    const columns = [
        { name: '选择', field: 'sel', type: 'selection', width: '40px' },
        { name: '姓名', field: 'name', type: 'input', width: '120px' },
        { name: '邮箱', field: 'email', type: 'email', config: { icon: '📧' } },
        {
            name: '城市',
            field: 'city',
            type: 'selector',
            width: '120px',
            options: {
                list: [
                    { key: '京', value: '北京' },
                    { key: '沪', value: '上海' },
                    { key: '粤', value: '广州' },
                    { key: '深', value: '深圳' }
                ]
            }
        },
        { name: '头像', field: 'avatar', type: 'image', delay: true, width: '64px' },
        {
            name: '状态',
            field: 'status',
            type: 'switcher',
            width: '120px',
            options: { list: [{ key: '1', value: '启用' }, { key: '0', value: '禁用' }] },
            config: { towards: junkman.SELECTOR_TOWARDS.Horizontal }
        }
    ];

    const table = new junkman.Table('#tableDemo', columns, {
        sortable: true,
        deletable: true,
        maxHeight: '400px',
        showBatchBar: true,
        onDataChange: (data) => console.log('数据变更:', data),
        onBatchDelete: async (rows) => console.log('批量删除:', rows)
    });

    // 示例数据
    const demoData = [];
    for (let i = 1; i <= 30; i++) {
        demoData.push({
            id: i,
            name: `用户${i}`,
            email: `user${i}@example.com`,
            city: ['京', '沪', '粤', '深'][i % 4],
            avatar: `https://picsum.photos/40/40?random=${i}`,
            status: i % 2 === 0 ? '1' : '0'
        });
    }
    table.loadData(demoData);

    // 按钮事件
    document.getElementById('getTableDataBtn')?.addEventListener('click', () => {
        alert(JSON.stringify(table.getData().map(row => ({ ...row, avatar: row.avatar ? '...' : '' })), null, 2));
    });
    document.getElementById('clearTableSelectionBtn')?.addEventListener('click', () => {
        // 通过访问内部 selectedRows 比较 hack，可改用公共方法，这里演示简单清除
        // 实际 Table 没有公开清除选中方法，我们重新加载相同数据会清除选中
        table.loadData(demoData);
    });
}