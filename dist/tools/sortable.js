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

    // ---------- 效果面板 ----------
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="space-y-6">
            <!-- 1. 垂直列表 -->
            <div>
                <p class="font-bold text-sm mb-1">1️⃣ 垂直列表排序</p>
                <div id="sortVertical" class="space-y-1">
                    <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 A</div>
                    <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 B</div>
                    <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 C</div>
                    <div data-sortable-item class="flex items-center gap-2 p-2 bg-base-200 rounded border cursor-grab">📌 项目 D</div>
                </div>
                <div class="text-xs text-base-content/60 mt-1" id="sortVerticalOrder"></div>
            </div>

            <!-- 2. 水平列表 -->
            <div>
                <p class="font-bold text-sm mb-1">2️⃣ 水平列表排序</p>
                <div id="sortHorizontal" class="flex gap-2 w-80">
                    <div data-sortable-item class="flex-shrink-0 p-2 bg-base-200 rounded border cursor-grab">🔴 红</div>
                    <div data-sortable-item class="flex-shrink-0 p-2 bg-base-200 rounded border cursor-grab">🟢 绿</div>
                    <div data-sortable-item class="flex-shrink-0 p-2 bg-base-200 rounded border cursor-grab">🔵 蓝</div>
                    <div data-sortable-item class="flex-shrink-0 p-2 bg-base-200 rounded border cursor-grab">🟡 黄</div>
                </div>
                <div class="text-xs text-base-content/60 mt-1" id="sortHorizontalOrder"></div>
            </div>

            <!-- 3. 网格布局 (auto 模式) -->
            <div>
                <p class="font-bold text-sm mb-1">3️⃣ 网格布局排序 (auto)</p>
                <div id="sortGrid" class="grid grid-cols-3 gap-2 w-80" style=" display: grid;grid-template-columns: 1fr 1fr 1fr 1fr;">
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">1</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">2</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">3</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">4</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">5</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">6</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">7</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">8</div>
                    <div data-sortable-item class="w-14 h-16 flex items-center justify-center bg-base-200 rounded border cursor-grab">9</div>
                </div>
                <div class="text-xs text-base-content/60 mt-1" id="sortGridOrder"></div>
            </div>
        </div>
    `;

    // ---------- 代码面板 ----------
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 垂直排序
new junkman.Sortable(document.getElementById('sortVertical'), {
    direction: 'vertical',
    onSort: (order) => console.log(order)
});

// 水平排序
new junkman.Sortable(document.getElementById('sortHorizontal'), {
    direction: 'horizontal',
    onSort: (order) => console.log(order)
});

// 网格排序（auto 模式，多行多列）
new junkman.Sortable(document.getElementById('sortGrid'), {
    direction: 'auto',
    onSort: (order) => console.log(order)
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 实例化 Sortable
    const v = document.getElementById('sortVertical');
    const vo = document.getElementById('sortVerticalOrder');
    if (v) new junkman.Sortable(v, { direction: 'vertical', onSort: order => { if (vo) vo.textContent = `顺序: ${order.join(' → ')}`; } });

    const h = document.getElementById('sortHorizontal');
    const ho = document.getElementById('sortHorizontalOrder');
    if (h) new junkman.Sortable(h, { direction: 'horizontal', onSort: order => { if (ho) ho.textContent = `顺序: ${order.join(' → ')}`; } });

    const g = document.getElementById('sortGrid');
    const go = document.getElementById('sortGridOrder');
    if (g) new junkman.Sortable(g, { direction: 'auto', onSort: order => { if (go) go.textContent = `顺序: ${order.join(' → ')}`; } });
}