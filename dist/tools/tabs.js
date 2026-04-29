function renderTabs() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Tabs(container, options)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>container</td>
                <td>string | HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>标签页挂载的容器</td>
            </tr>
            <tr>
                <td>options</td>
                <td>TabsOptions</td>
                <td>是</td>
                <td>—</td>
                <td>配置对象，见下表</td>
            </tr>
        </table>

        <h3 class="mt-4">配置选项 (TabsOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>tabs</td>
                <td>TabItem[]</td>
                <td>—</td>
                <td>标签页数组，每个项包含 <code>label</code>、<code>content</code> 等</td>
            </tr>
            <tr>
                <td>type</td>
                <td>'boxed' | 'lifted' | 'bordered'</td>
                <td>'boxed'</td>
                <td>标签样式类型</td>
            </tr>
            <tr>
                <td>activeIndex</td>
                <td>number</td>
                <td>0</td>
                <td>初始激活的标签索引</td>
            </tr>
            <tr>
                <td>lazy</td>
                <td>boolean</td>
                <td>false</td>
                <td>静态内容是否懒加载（仅激活时渲染）</td>
            </tr>
            <tr>
                <td>parentNode</td>
                <td>HTMLElement</td>
                <td>—</td>
                <td>父节点（通常由 <code>container</code> 代替）</td>
            </tr>
        </table>

        <h3 class="mt-4">标签项 (TabItem)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>必填</th><th>说明</th></tr>
            <tr>
                <td>label</td>
                <td>string</td>
                <td>是</td>
                <td>标签按钮的文字</td>
            </tr>
            <tr>
                <td>content</td>
                <td>string | HTMLElement | (signal: AbortSignal) => Promise</td>
                <td>是</td>
                <td>标签内容。可以是 HTML 字符串、DOM 元素，或异步加载函数（接收 AbortSignal）</td>
            </tr>
            <tr>
                <td>disabled</td>
                <td>boolean</td>
                <td>否</td>
                <td>是否禁用该标签</td>
            </tr>
            <tr>
                <td>onActive</td>
                <td>() => void</td>
                <td>否</td>
                <td>标签激活时的回调</td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>setActive(index)</td><td>切换到指定索引的标签页</td></tr>
            <tr><td>getActiveIndex()</td><td>获取当前激活的标签索引</td></tr>
            <tr><td>destroy()</td><td>销毁标签页，取消异步请求并清空 DOM</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>静态内容可通过 <code>lazy: true</code> 实现懒加载，未激活的标签不会立即渲染。</li>
            <li>异步内容始终懒加载，激活时显示 spinner，加载完成后替换内容。</li>
            <li>切换标签时会自动取消前一个未完成的异步请求（通过 AbortSignal）。</li>
            <li>支持 DaisyUI 的 <code>tabs-boxed</code> / <code>tabs-lifted</code> / <code>tabs-bordered</code> 样式。</li>
        </ul>
    `;
    const demo = `<div id="tabsTabs" class="mt-4"></div>`;
    return renderSection('📑 Tabs 标签页', '支持异步加载、懒加载、样式切换的标签页组件。', api, demo);
}

function initTabs() {
    const container = document.getElementById('tabsTabs');
    if (!container) return;

    // 效果面板：放置一个示例 Tabs 容器
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div id="tabsExample"></div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
new junkman.Tabs('#tabsExample', {
    type: 'boxed',
    tabs: [
        {
            label: '静态内容',
            content: '<div class="p-2">这是静态渲染的标签页内容。</div>'
        },
        {
            label: '异步加载',
            content: async (signal) => {
                // 模拟网络请求
                const result = await new Promise((resolve) => {
                    const timer = setTimeout(() => resolve('<div class="p-2">异步加载完成！</div>'), 1000);
                    signal.addEventListener('abort', () => {
                        clearTimeout(timer);
                        throw new Error('Aborted');
                    });
                });
                return result;
            }
        },
        {
            label: '禁用标签',
            content: '无法点击',
            disabled: true
        }
    ]
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化示例 Tabs
    new junkman.Tabs('#tabsExample', {
        type: 'boxed',
        tabs: [
            {
                label: '静态内容',
                content: '<div class="p-2 text-sm">这是直接渲染的静态内容。</div>'
            },
            {
                label: '异步加载',
                content: async (signal) => {
                    // 模拟延迟，并支持取消
                    const result = await new Promise((resolve, reject) => {
                        const timer = setTimeout(() => resolve('<div class="p-2 text-sm">✅ 异步内容加载完成。</div>'), 1000);
                        signal.addEventListener('abort', () => {
                            clearTimeout(timer);
                            reject(new Error('Aborted'));
                        });
                    });
                    return result;
                }
            },
            {
                label: '禁用标签',
                content: '无法点击',
                disabled: true
            }
        ]
    });
}