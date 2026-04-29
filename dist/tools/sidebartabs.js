function renderSidebarTabs() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.SidebarTabs(options)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr><td>container</td><td>string | HTMLElement</td><td>是</td><td>—</td><td>整个布局挂载的容器</td></tr>
            <tr><td>items</td><td>SidebarTabItem[]</td><td>是</td><td>—</td><td>侧边栏菜单项数组，支持多级嵌套</td></tr>
            <tr><td>defaultActive</td><td>string</td><td>否</td><td>第一个可用项的 target</td><td>默认激活的页面标识</td></tr>
            <tr><td>contentId</td><td>string</td><td>否</td><td>'mainContent'</td><td>内容区域元素的 id</td></tr>
            <tr><td>onAfterRender</td><td>(target: string) => void</td><td>否</td><td>—</td><td>每次页面切换后的回调</td></tr>
        </table>

        <h3 class="mt-4">菜单项 (SidebarTabItem)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>label</td><td>string</td><td>显示文本</td></tr>
            <tr><td>target</td><td>string</td><td>唯一标识（叶子节点必填，用于匹配渲染函数）</td></tr>
            <tr><td>sub</td><td>SidebarTabItem[]</td><td>子菜单项，存在时该节点为折叠分组</td></tr>
            <tr><td>render</td><td>() => string</td><td>渲染函数，返回要显示的 HTML</td></tr>
            <tr><td>afterRender</td><td>() => void</td><td>渲染后的初始化回调</td></tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>navigateTo(target)</td><td>切换到指定 target 的页面</td></tr>
            <tr><td>destroy()</td><td>销毁组件，清空 DOM 和事件</td></tr>
        </table>
    `;
    const demo = `<div id="sidebartabsDemoTabs" class="mt-4"></div>`;
    return renderSection('📂 SidebarTabs 侧边栏布局', '多级侧边栏导航，配合内容展示，适合文档站。', api, demo);
}

function initSidebarTabs() {
    const outerContainer = document.getElementById('sidebartabsDemoTabs');
    if (!outerContainer) return;

    // 效果面板：放置一个挂载点（固定高度，防止破坏页面布局）
    const effectDiv = document.createElement('div');
    effectDiv.style.height = '400px';
    effectDiv.style.border = '1px solid hsl(var(--bc) / 0.2)';
    effectDiv.style.borderRadius = '0.5rem';
    effectDiv.style.overflow = 'hidden';
    effectDiv.innerHTML = `<div id="sbDemo" style="height:100%;"></div>`;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
new junkman.SidebarTabs({
    container: '#sbDemo',
    items: [
        { label: '首页', target: 'home', render: () => '<h2>🏠 首页</h2><p>欢迎使用 Junkman。</p>' },
        {
            label: '组件',
            sub: [
                { label: '按钮', target: 'button', render: () => '<h2>🔘 按钮</h2><p>按钮文档...</p>' },
                { label: '输入框', target: 'input', render: () => '<h2>📝 输入框</h2><p>输入框文档...</p>' }
            ]
        },
        { label: '关于', target: 'about', render: () => '<h2>📖 关于</h2><p>版本 1.0.0</p>' }
    ],
    defaultActive: 'home'
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(outerContainer, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化 SidebarTabs 演示
    new junkman.SidebarTabs({
        container: '#sbDemo',
        items: [
            { label: '首页', target: 'home', render: () => '<div style="padding:1rem"><h2>🏠 首页</h2><p>欢迎使用 Junkman 组件库。</p></div>' },
            {
                label: '组件',
                sub: [
                    { label: '按钮', target: 'button', render: () => '<div style="padding:1rem"><h2>🔘 按钮</h2><p>按钮文档内容...</p></div>' },
                    { label: '输入框', target: 'input', render: () => '<div style="padding:1rem"><h2>📝 输入框</h2><p>输入框文档内容...</p></div>' }
                ]
            },
            { label: '关于', target: 'about', render: () => '<div style="padding:1rem"><h2>📖 关于</h2><p>版本 1.0.0</p></div>' }
        ],
        defaultActive: 'home'
    });
}