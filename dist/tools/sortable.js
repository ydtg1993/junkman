function renderSortable() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Sortable(list, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>list</td>
                <td>HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>包含可排序项的容器元素（通常为 tbody 或 div）</td>
            </tr>
            <tr>
                <td>options</td>
                <td>SortableOptions</td>
                <td>否</td>
                <td>{}</td>
                <td>配置对象，见下表</td>
            </tr>
        </table>

        <h3 class="mt-4">配置选项 (SortableOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>direction</td>
                <td>'vertical' | 'horizontal'</td>
                <td>'vertical'</td>
                <td>拖拽排序方向</td>
            </tr>
            <tr>
                <td>handle</td>
                <td>string</td>
                <td>''</td>
                <td>拖拽手柄的 CSS 选择器，不设置则整个项都可拖拽</td>
            </tr>
            <tr>
                <td>animationSpeed</td>
                <td>number</td>
                <td>180</td>
                <td>动画速度（预留，当前未使用）</td>
            </tr>
            <tr>
                <td>onSort</td>
                <td>(order: (string | number)[]) => void</td>
                <td>() => {}</td>
                <td>排序完成后的回调，接收新的 id 顺序数组（id 来自 data-id 属性）</td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>destroy()</td><td>移除所有事件监听，清理残留节点</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>每个可排序项必须添加 <code>data-sortable-item</code> 属性。</li>
            <li>拖拽时显示半透明克隆体和占位符（虚线框）。</li>
            <li>支持自动滚动，靠近边缘时列表自动滚动。</li>
            <li>可配合 Table 组件的行排序使用。</li>
        </ul>
    `;
    const demo = `<div id="sortableTabs" class="mt-4"></div>`;
    return renderSection('↕️ Sortable 拖拽排序', '轻量拖拽排序库，支持垂直/水平方向，可自定义手柄。', api, demo);
}

function initSortable() {
    const container = document.getElementById('sortableTabs');
    if (!container) return;

    // 效果面板：可排序列表 + 排序后结果展示
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <p class="text-sm mb-2">拖拽下方卡片调整顺序：</p>
        <div id="sortableList" class="space-y-1">
            <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 A</div>
            <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 B</div>
            <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 C</div>
            <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 D</div>
        </div>
        <div class="mt-2 text-xs text-base-content/60" id="sortOrder"></div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const list = document.getElementById('sortableList');
new junkman.Sortable(list, {
    direction: 'vertical',
    onSort: (order) => {
        console.log('新顺序:', order);
    }
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化 Sortable
    const listEl = effectDiv.querySelector('#sortableList');
    if (!listEl) return;

    const orderEl = effectDiv.querySelector('#sortOrder');
    new junkman.Sortable(listEl, {
        direction: 'vertical',
        onSort: (order) => {
            if (orderEl) orderEl.textContent = `当前顺序: ${order.join(' → ')}`;
        }
    });
}