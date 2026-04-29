function renderPaginator() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Paginator(container, options)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>container</td>
                <td>string | HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>分页器挂载的选择器或 DOM 元素</td>
            </tr>
            <tr>
                <td>options</td>
                <td>PaginatorOptions</td>
                <td>是</td>
                <td>—</td>
                <td>配置对象，见下表</td>
            </tr>
        </table>

        <h3 class="mt-4">配置选项 (PaginatorOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>total</td>
                <td>number</td>
                <td>—</td>
                <td>数据总条数</td>
            </tr>
            <tr>
                <td>pageSize</td>
                <td>number</td>
                <td>—</td>
                <td>每页显示条数</td>
            </tr>
            <tr>
                <td>currentPage</td>
                <td>number</td>
                <td>1</td>
                <td>初始当前页码</td>
            </tr>
            <tr>
                <td>maxButtons</td>
                <td>number</td>
                <td>5</td>
                <td>最多显示的页码按钮数量（不含省略号）</td>
            </tr>
            <tr>
                <td>showJump</td>
                <td>boolean</td>
                <td>true</td>
                <td>是否显示跳转输入框</td>
            </tr>
            <tr>
                <td>showTotal</td>
                <td>boolean</td>
                <td>true</td>
                <td>是否显示总条数文字</td>
            </tr>
            <tr>
                <td>onPageChange</td>
                <td>(page: number, pageSize: number) => void</td>
                <td>—</td>
                <td>页码改变时的回调函数</td>
            </tr>
            <tr>
                <td>pageSizeOptions</td>
                <td>number[]</td>
                <td>[]</td>
                <td>每页条数切换选项，例如 <code>[10, 20, 50]</code>，不提供则隐藏切换器</td>
            </tr>
            <tr>
                <td>onPageSizeChange</td>
                <td>(pageSize: number) => void</td>
                <td>() => {}</td>
                <td>每页条数改变时的回调</td>
            </tr>
            <tr>
                <td>labels</td>
                <td>object</td>
                <td>见下方</td>
                <td>自定义文案，可用属性：prev / next / total / jump / pageSizeLabel</td>
            </tr>
            <tr>
                <td>disabled</td>
                <td>boolean</td>
                <td>false</td>
                <td>是否禁用整个分页器（通常在加载数据时使用）</td>
            </tr>
        </table>

        <h3 class="mt-4">默认文案</h3>
        <table class="api-table">
            <tr><th>属性</th><th>默认值</th></tr>
            <tr><td>prev</td><td>上一页</td></tr>
            <tr><td>next</td><td>下一页</td></tr>
            <tr><td>total</td><td>共 {total} 条</td></tr>
            <tr><td>jump</td><td>跳转</td></tr>
            <tr><td>pageSizeLabel</td><td>每页</td></tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>refresh(total, pageSize?)</td><td>更新总条数（及可选的每页条数）并重新渲染</td></tr>
            <tr><td>setDisabled(disabled)</td><td>设置分页器禁用/启用状态</td></tr>
            <tr><td>getCurrentPage()</td><td>获取当前页码</td></tr>
            <tr><td>getPageSize()</td><td>获取当前每页条数</td></tr>
            <tr><td>destroy()</td><td>销毁分页器，移除事件并清空 DOM</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>当总条数为 0 时，显示“暂无数据”提示。</li>
            <li>页码按钮自动生成省略号，中间显示当前页附近的按钮，两侧保留首尾页。</li>
            <li>跳转输入框支持回车确认。</li>
            <li>每页条数切换会自动重新计算页码并触发 <code>onPageSizeChange</code> 和 <code>onPageChange</code>。</li>
            <li>初始页码若超出范围会自动修正为最大页。</li>
        </ul>
    `;
    const demo = `<div id="paginatorTabs" class="mt-4"></div>`;
    return renderSection('📄 Paginator 分页器', '功能完整的分页组件，支持跳转、每页条数切换、禁用状态。', api, demo);
}


function initPaginator() {
    const container = document.getElementById('paginatorTabs');
    if (!container) return;

    // 效果面板：提供分页器挂载点与当前状态展示
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="mb-2 flex items-center gap-4 text-sm">
            <span id="pageInfo" class="text-base-content/70"></span>
            <span id="sizeInfo" class="text-base-content/70"></span>
        </div>
        <div id="paginatorDemo" class="mt-2"></div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const paginator = new junkman.Paginator('#paginatorDemo', {
    total: 100,
    pageSize: 10,
    currentPage: 1,
    maxButtons: 5,
    showJump: true,
    showTotal: true,
    pageSizeOptions: [10, 20, 50],
    onPageChange: (page, size) => {
        console.log(\`当前页: \${page}, 每页条数: \${size}\`);
        document.getElementById('pageInfo').textContent = \`当前页码: \${page}\`;
        document.getElementById('sizeInfo').textContent = \`每页条数: \${size}\`;
    },
    onPageSizeChange: (size) => {
        console.log(\`条数切换为: \${size}\`);
    },
    labels: {
        prev: '上一页',
        next: '下一页',
        total: '共 {total} 条',
        jump: '跳转',
        pageSizeLabel: '每页'
    }
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化分页器
    new junkman.Paginator('#paginatorDemo', {
        total: 100,
        pageSize: 10,
        currentPage: 1,
        maxButtons: 5,
        showJump: true,
        showTotal: true,
        pageSizeOptions: [10, 20, 50],
        onPageChange: (page, size) => {
            console.log(`当前页: ${page}, 每页条数: ${size}`);
            const pageInfo = document.getElementById('pageInfo');
            const sizeInfo = document.getElementById('sizeInfo');
            if (pageInfo) pageInfo.textContent = `当前页码: ${page}`;
            if (sizeInfo) sizeInfo.textContent = `每页条数: ${size}`;
        },
        onPageSizeChange: (size) => {
            console.log(`条数切换为: ${size}`);
        },
        labels: {
            prev: '上一页',
            next: '下一页',
            total: '共 {total} 条',
            jump: '跳转',
            pageSizeLabel: '每页'
        }
    });
}