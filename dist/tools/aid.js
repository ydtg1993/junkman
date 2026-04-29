function renderRequest() {
    const api = `<pre><code>junkman.request(options: RequestOptions)</code></pre>
      <h3>RequestOptions 主要属性</h3>
      <table class="api-table"><tr><th>属性</th><th>类型</th><th>说明</th></tr>
        <tr><td>url</td><td>string</td><td>请求地址</td></tr>
        <tr><td>signal</td><td>AbortSignal</td><td>取消信号</td></tr></table>`;
    const demo = `<button id="reqBtn" class="btn btn-primary btn-sm">发送请求</button>
      <button id="abortBtn" class="btn btn-error btn-sm hidden">取消</button>
      <pre id="reqResult" class="bg-base-100 p-2 mt-2 rounded"></pre>`;
    return renderSection('📡 request 网络请求', '支持取消、超时、进度。', api, demo);
}

function renderDOMBuilder() {
    const api = `<pre><code>junkman.createDOMFromTree(node, parent?)</code></pre>
      <h3>DOMNode 属性</h3>
      <table class="api-table"><tr><th>属性</th><th>类型</th><th>说明</th></tr>
        <tr><td>tag</td><td>string</td><td>标签名</td></tr>
        <tr><td>className</td><td>string</td><td>css类</td></tr></table>`;
    const demo = `<div id="domBuilderDemo"></div>`;
    return renderSection('🏗️ createDOMFromTree', '通过对象树创建 DOM。', api, demo);
}

function renderIcons() {
    const icons = ['trash','move','write','close','aspect','check','check_circle','caret_right','sub_loading','node'];
    const demo = `<div class="grid grid-cols-5 gap-2">${icons.map(icon => `<span class="flex items-center gap-1"><span>${junkman.Icon[icon]}</span> ${icon}</span>`).join('')}</div>`;
    return renderSection('🎨 Icon 图标', '内置 SVG 图标集合。', '', demo);
}

function renderDimensionalTree() {
    const api = `<pre><code>junkman.dimensionalTree(nodes)</code></pre>`;
    const demo = `<pre id="dimTreeResult" class="bg-base-100 p-2 rounded"></pre>`;
    return renderSection('🌲 dimensionalTree 树展平', '用于级联组件的核心工具。', api, demo);
}

function renderGlobalEvents() {
    const api = `<pre><code>new junkman.GlobalEventManager()</code></pre>
      <p><b>方法：</b> <code>add(target, event, listener)</code>，<code>removeAll()</code></p>`;
    return renderSection('🛠️ GlobalEventManager', '全局事件管理器。', api, '');
}

function initRequest() {
    const reqBtn = document.getElementById('reqBtn');
    const abortBtn = document.getElementById('abortBtn');
    const result = document.getElementById('reqResult');
    let controller;
    reqBtn?.addEventListener('click', async () => {
        controller = new AbortController();
        reqBtn.disabled = true; abortBtn.classList.remove('hidden'); result.textContent = '请求中...';
        try {
            const data = await junkman.request({ url: 'https://jsonplaceholder.typicode.com/posts/1', signal: controller.signal });
            result.textContent = JSON.stringify(data, null, 2);
            toast.show({ message: '请求成功', type: 'success' });
        } catch (e) { result.textContent = '错误: ' + e.message; }
        finally { reqBtn.disabled = false; abortBtn.classList.add('hidden'); }
    });
    abortBtn?.addEventListener('click', () => controller?.abort());
}

function initDOMBuilder() {
    const container = document.getElementById('domBuilderDemo');
    if (container) {
        const btn = junkman.createDOMFromTree({
            tag: 'button', className: 'btn btn-sm btn-primary', textContent: '点击我',
            events: { click: () => toast.show({ message: '动态按钮被点击', type: 'success' }) }
        });
        container.appendChild(btn);
    }
}

function initDimensionalTree() {
    const result = document.getElementById('dimTreeResult');
    if (result) {
        const flat = junkman.dimensionalTree(getTreeData());
        result.textContent = JSON.stringify(flat, (key, val) => key === 'originalNode' ? undefined : val, 2);
    }
}