function renderRequest() {
    const api = `
        <h3>函数签名</h3>
        <pre><code>junkman.request(options)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr><td>url</td><td>string</td><td>是</td><td>—</td><td>请求地址</td></tr>
            <tr><td>method</td><td>string</td><td>否</td><td>'GET'</td><td>HTTP 方法</td></tr>
            <tr><td>header</td><td>Record&lt;string, string&gt;</td><td>否</td><td>{}</td><td>自定义请求头</td></tr>
            <tr><td>data</td><td>Record | FormData</td><td>否</td><td>{}</td><td>请求体数据，GET 时自动拼接为查询参数</td></tr>
            <tr><td>timeout</td><td>number</td><td>否</td><td>30000</td><td>超时时间（毫秒）</td></tr>
            <tr><td>responseType</td><td>XMLHttpRequestResponseType</td><td>否</td><td>'json'</td><td>响应数据类型</td></tr>
            <tr><td>signal</td><td>AbortSignal</td><td>否</td><td>—</td><td>取消请求的信号</td></tr>
            <tr><td>onUploadProgress</td><td>(event: ProgressEvent) => void</td><td>否</td><td>—</td><td>上传进度回调</td></tr>
            <tr><td>throwOnHttpError</td><td>boolean</td><td>否</td><td>true</td><td>是否在 HTTP 错误状态码时抛出异常</td></tr>
        </table>

        <h3 class="mt-4">返回值</h3>
        <p>返回 <code>Promise&lt;any&gt;</code>，根据 <code>responseType</code> 自动解析。</p>

        <h3 class="mt-4">错误类型 (RequestError)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>type</td><td>'timeout' | 'network' | 'abort' | 'http' | 'parse'</td><td>错误类别</td></tr>
            <tr><td>status</td><td>number</td><td>HTTP 状态码（http 错误时存在）</td></tr>
            <tr><td>response</td><td>any</td><td>服务器返回的内容</td></tr>
        </table>
    `;
    const demo = `<div id="requestTabs" class="mt-4"></div>`;
    return renderSection('🌐 request 网络请求', '基于 XMLHttpRequest 的轻量请求工具，支持超时、取消、上传进度。', api, demo);
}

function initRequest() {
    const container = document.getElementById('requestTabs');
    if (!container) return;

    // 效果面板：请求按钮 + 结果展示
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="flex gap-2 mb-2">
            <button id="sendRequestBtn" class="btn btn-xs btn-primary">发送 GET 请求</button>
            <button id="abortRequestBtn" class="btn btn-xs btn-error hidden">取消请求</button>
        </div>
        <div id="requestStatus" class="text-xs text-base-content/60 mb-1"></div>
        <pre id="requestResult" class="text-xs bg-base-200 p-2 rounded max-h-48 overflow-auto"></pre>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 基本 GET 请求
junkman.request({
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET',
    timeout: 5000
}).then(data => {
    console.log(data);
}).catch(err => {
    console.error(err.type, err.message);
});

// 带取消的请求
const controller = new AbortController();
junkman.request({
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    signal: controller.signal
}).catch(err => {
    if (err.type === 'abort') console.log('请求已取消');
});
controller.abort(); // 取消请求
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 绑定事件
    const sendBtn = effectDiv.querySelector('#sendRequestBtn');
    const abortBtn = effectDiv.querySelector('#abortRequestBtn');
    const statusEl = effectDiv.querySelector('#requestStatus');
    const resultEl = effectDiv.querySelector('#requestResult');

    let currentController = null;

    sendBtn.addEventListener('click', () => {
        if (statusEl) statusEl.textContent = '请求中...';
        if (resultEl) resultEl.textContent = '';
        if (sendBtn) sendBtn.disabled = true;
        if (abortBtn) abortBtn.classList.remove('hidden');

        currentController = new AbortController();

        junkman.request({
            url: 'https://jsonplaceholder.typicode.com/posts/1',
            method: 'GET',
            timeout: 10000,
            signal: currentController.signal
        }).then(data => {
            if (statusEl) statusEl.textContent = '请求成功';
            if (resultEl) resultEl.textContent = JSON.stringify(data, null, 2);
        }).catch(err => {
            if (err.type === 'abort') {
                if (statusEl) statusEl.textContent = '请求已取消';
                if (resultEl) resultEl.textContent = '请求被用户取消';
            } else {
                if (statusEl) statusEl.textContent = `请求失败: ${err.type}`;
                if (resultEl) resultEl.textContent = err.message;
            }
        }).finally(() => {
            if (sendBtn) sendBtn.disabled = false;
            if (abortBtn) abortBtn.classList.add('hidden');
            currentController = null;
        });
    });

    abortBtn.addEventListener('click', () => {
        if (currentController) {
            currentController.abort();
        }
    });
}

function renderDOMBuilder() {
    const api = `
        <h3>函数签名</h3>
        <pre><code>junkman.createDOMFromTree(node, parent?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
            <tr><td>node</td><td>DOMNode</td><td>是</td><td>描述 DOM 结构的树对象</td></tr>
            <tr><td>parent</td><td>HTMLElement</td><td>否</td><td>父容器，提供时自动将生成元素追加到该容器</td></tr>
        </table>

        <h3 class="mt-4">树节点属性 (DOMNode)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>tag</td><td>string</td><td>HTML 标签名，默认 <code>'div'</code></td></tr>
            <tr><td>className</td><td>string</td><td>CSS 类名</td></tr>
            <tr><td>attributes</td><td>Record&lt;string, string&gt;</td><td>属性键值对</td></tr>
            <tr><td>textContent</td><td>string</td><td>文本内容</td></tr>
            <tr><td>styles</td><td>Partial&lt;CSSStyleDeclaration&gt;</td><td>内联样式</td></tr>
            <tr><td>events</td><td>Record&lt;string, (event, dom) => void&gt;</td><td>事件监听，键为事件名</td></tr>
            <tr><td>nodes</td><td>string | HTMLElement | DOMNode[] | 混合数组</td><td>子节点，支持字符串（HTML）、元素或树节点数组</td></tr>
        </table>

        <h3 class="mt-4">返回值</h3>
        <p>返回生成的根 <code>HTMLElement</code>。</p>
    `;
    const demo = `<div id="dombuilderTabs" class="mt-4"></div>`;
    return renderSection('🧱 createDOMFromTree 树形转DOM', '用 JSON 描述界面，快速生成 DOM。', api, demo);
}

function initDOMBuilder() {
    const container = document.getElementById('dombuilderTabs');
    if (!container) return;

    // 效果面板：放置一个输出区域
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `<div id="dombuilderDemo"></div>`;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const tree = {
    tag: 'div',
    className: 'card w-80 bg-base-100 shadow-xl',
    nodes: [
        {
            tag: 'div',
            className: 'card-body',
            nodes: [
                { tag: 'h2', className: 'card-title', textContent: 'Hello!' },
                { tag: 'p', textContent: '这是由 createDOMFromTree 生成的卡片。' },
                {
                    tag: 'button',
                    className: 'btn btn-sm btn-primary mt-2',
                    textContent: '点我',
                    events: {
                        click: (e, dom) => alert('按钮被点击！')
                    }
                }
            ]
        }
    ]
};

junkman.createDOMFromTree(tree, document.getElementById('dombuilderDemo'));
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 实际构建演示 DOM
    const demoContainer = effectDiv.querySelector('#dombuilderDemo');
    if (!demoContainer) return;

    const tree = {
        tag: 'div',
        className: 'card w-80 bg-base-100 shadow-xl',
        nodes: [
            {
                tag: 'div',
                className: 'card-body',
                nodes: [
                    { tag: 'h2', className: 'card-title', textContent: 'Hello!' },
                    { tag: 'p', textContent: '这是由 createDOMFromTree 生成的卡片。' },
                    {
                        tag: 'button',
                        className: 'btn btn-sm btn-primary mt-2',
                        textContent: '点我',
                        events: {
                            click: (e, dom) => alert('按钮被点击！')
                        }
                    }
                ]
            }
        ]
    };

    // 调用工具函数
    if (typeof junkman.createDOMFromTree === 'function') {
        junkman.createDOMFromTree(tree, demoContainer);
    } else {
        demoContainer.innerHTML = '<p class="text-error">createDOMFromTree 未加载</p>';
    }
}

function renderIcons() {
    const icons = ['trash','move','write','close','aspect','check','check_circle','caret_right','sub_loading','node'];
    const demo = `<div class="grid grid-cols-5 gap-2">${icons.map(icon => `<span class="flex items-center gap-1"><span>${junkman.Icon[icon]}</span> ${icon}</span>`).join('')}</div>`;
    return renderSection('🎨 Icon 图标', '内置 SVG 图标集合。', '', demo);
}

function renderDimensionalTree() {
    const api = `
        <h3>函数签名</h3>
        <pre><code>junkman.dimensionalTree(nodes, stack?, parents?, output?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr><td>nodes</td><td>TreeNode[]</td><td>是</td><td>—</td><td>树形节点数组，每个节点包含 key、val 和可选的 children 节点</td></tr>
            <tr><td>stack</td><td>number</td><td>否</td><td>0</td><td>当前层级（内部递归使用，外部调用时无需传入）</td></tr>
            <tr><td>parents</td><td>(string|number)[]</td><td>否</td><td>[]</td><td>祖先 key 数组（内部递归使用）</td></tr>
            <tr><td>output</td><td>FlattenedNode[][]</td><td>否</td><td>[]</td><td>输出数组载体（内部递归使用）</td></tr>
        </table>

        <h3 class="mt-4">树节点 (TreeNode)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>key</td><td>string | number</td><td>唯一标识</td></tr>
            <tr><td>val</td><td>string</td><td>显示文本</td></tr>
            <tr><td>nodes</td><td>TreeNode[]</td><td>子节点数组，可选</td></tr>
        </table>

        <h3 class="mt-4">展平节点 (FlattenedNode)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>key</td><td>string | number</td><td>节点 key</td></tr>
            <tr><td>val</td><td>string</td><td>节点文本</td></tr>
            <tr><td>nodes</td><td>TreeNode[]</td><td>原始子节点</td></tr>
            <tr><td>stack</td><td>number</td><td>所在层级（从 0 开始）</td></tr>
            <tr><td>parentNodes</td><td>(string|number)[]</td><td>所有祖先的 key 列表</td></tr>
            <tr><td>originalNode</td><td>TreeNode</td><td>原始节点引用</td></tr>
        </table>

        <h3 class="mt-4">返回值</h3>
        <p>返回 <code>FlattenedNode[][]</code>，一个按层级索引的二维数组，<code>output[0]</code> 为第一层，<code>output[1]</code> 为第二层，依此类推。</p>
    `;
    const demo = `<div id="dimensionalTreeTabs" class="mt-4"></div>`;
    return renderSection('🌳 dimensionalTree 树形展平', '将树形结构按层级分区，常用于级联选择器列渲染。', api, demo);
}

function initDimensionalTree() {
    const container = document.getElementById('dimensionalTreeTabs');
    if (!container) return;

    // 示例树数据
    const sampleTree = [
        {
            key: '1', val: '亚洲',
            nodes: [
                { key: '1-1', val: '中国',
                    nodes: [
                        { key: '1-1-1', val: '北京' },
                        { key: '1-1-2', val: '上海' }
                    ]
                },
                { key: '1-2', val: '日本',
                    nodes: [
                        { key: '1-2-1', val: '东京' }
                    ]
                }
            ]
        },
        { key: '2', val: '欧洲',
            nodes: [
                { key: '2-1', val: '法国' }
            ]
        }
    ];

    // 效果面板：输入树与输出展平结果
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="flex gap-4">
            <div class="flex-1">
                <p class="text-sm font-bold mb-1">🌲 原始树</p>
                <pre id="treeInput" class="text-xs bg-base-200 p-2 rounded max-h-48 overflow-auto"></pre>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold mb-1">📂 展平结果（按层级）</p>
                <pre id="treeOutput" class="text-xs bg-base-200 p-2 rounded max-h-48 overflow-auto"></pre>
            </div>
        </div>
        <p class="text-xs mt-2 text-base-content/60">每一层输出为 FlattenedNode 数组，包含 stack 和 parentNodes 信息。</p>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const tree = [
    { key: '1', val: '亚洲', nodes: [...] },
    { key: '2', val: '欧洲', nodes: [...] }
];

const flattened = junkman.dimensionalTree(tree);

// flattened[0] 为第一层（洲），flattened[1] 为第二层（国家）...
console.log(flattened);
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 展示原始树
    const treeInputEl = effectDiv.querySelector('#treeInput');
    if (treeInputEl) {
        treeInputEl.textContent = JSON.stringify(sampleTree, null, 2);
    }

    // 计算并展示展平结果
    if (typeof junkman.dimensionalTree === 'function') {
        const flattened = junkman.dimensionalTree(sampleTree);
        const treeOutputEl = effectDiv.querySelector('#treeOutput');
        if (treeOutputEl) {
            // 只显示关键字段以减少输出长度
            const simplified = flattened.map(level => level.map(node => ({
                key: node.key,
                val: node.val,
                stack: node.stack,
                parentNodes: node.parentNodes
            })));
            treeOutputEl.textContent = JSON.stringify(simplified, null, 2);
        }
    } else {
        const treeOutputEl = effectDiv.querySelector('#treeOutput');
        if (treeOutputEl) {
            treeOutputEl.textContent = 'dimensionalTree 方法未加载';
        }
    }
}

function renderGlobalEvents() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.GlobalEventManager()</code></pre>
        <p class="text-sm mb-2">创建一个全局事件管理器实例，用于统一管理事件监听，便于批量清理。</p>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>参数</th><th>说明</th></tr>
            <tr>
                <td>add(target, type, listener)</td>
                <td>
                    target: EventTarget<br>
                    type: string<br>
                    listener: (e: Event) => void
                </td>
                <td>添加事件监听，内部调用 <code>target.addEventListener</code> 并记录。</td>
            </tr>
            <tr>
                <td>removeAll()</td>
                <td>—</td>
                <td>移除所有通过该实例添加的事件监听，并清空记录。</td>
            </tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>通常用于组件内部，集中管理事件，在组件销毁时调用 <code>removeAll</code> 避免内存泄漏。</li>
            <li>可以多次调用 <code>add</code> 添加不同目标或事件，<code>removeAll</code> 一次性全部移除。</li>
        </ul>
    `;
    const demo = `<div id="globalEventsTabs" class="mt-4"></div>`;
    return renderSection('🌐 GlobalEventManager 全局事件管理', '统一添加/移除事件监听，常用于组件销毁时清理。', api, demo);
}

function initGlobalEvents() {
    const container = document.getElementById('globalEventsTabs');
    if (!container) return;

    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="space-y-2">
            <button id="geAddBtn" class="btn btn-xs btn-primary">启动事件监听</button>
            <button id="geRemoveBtn" class="btn btn-xs btn-error" disabled>销毁（移除监听）</button>
            <div class="text-sm">点击计数：<span id="geCounter" class="font-bold">0</span></div>
            <div id="geStatus" class="text-xs text-base-content/60"></div>
        </div>
    `;

    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const manager = new GlobalEventManager();
let count = 0;
const handler = () => { count++; document.getElementById('count').textContent = count; };
// 添加 document 的 click 事件
manager.add(document, 'click', handler);
// 销毁时
manager.removeAll();
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化演示逻辑
    const addBtn = effectDiv.querySelector('#geAddBtn');
    const removeBtn = effectDiv.querySelector('#geRemoveBtn');
    const counterEl = effectDiv.querySelector('#geCounter');
    const statusEl = effectDiv.querySelector('#geStatus');

    let manager = null;
    let count = 0;
    const handler = () => {
        count++;
        if (counterEl) counterEl.textContent = String(count);
    };

    addBtn.addEventListener('click', () => {
        if (manager) return;
        manager = new junkman.GlobalEventManager();
        manager.add(document, 'click', handler);
        addBtn.disabled = true;
        removeBtn.disabled = false;
        if (statusEl) statusEl.textContent = '✅ 事件监听已启用，点击页面任意处增加计数';
    });

    removeBtn.addEventListener('click', () => {
        if (!manager) return;
        manager.removeAll();
        manager = null;
        addBtn.disabled = false;
        removeBtn.disabled = true;
        if (statusEl) statusEl.textContent = '🚫 事件监听已销毁，点击页面不再计数';
        // 重置计数器
        count = 0;
        if (counterEl) counterEl.textContent = '0';
    });
}