function renderModal() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Modal(options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>options.title</td>
                <td>string</td>
                <td>否</td>
                <td>''</td>
                <td>模态框标题</td>
            </tr>
            <tr>
                <td>options.aspect</td>
                <td>{ width?: string; height?: string }</td>
                <td>否</td>
                <td>{ width: '80%', height: '80%' }</td>
                <td>模态框宽高</td>
            </tr>
            <tr>
                <td>options.gauze</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>是否点击背景关闭</td>
            </tr>
            <tr>
                <td>options.headerHidden</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>是否隐藏标题栏</td>
            </tr>
            <tr>
                <td>options.timeout</td>
                <td>number</td>
                <td>否</td>
                <td>-1（不自动关闭）</td>
                <td>自动关闭秒数，大于0生效</td>
            </tr>
            <tr>
                <td>options.parentNode</td>
                <td>HTMLElement</td>
                <td>否</td>
                <td>document.body</td>
                <td>挂载的父节点</td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>setContent(content)</td><td>设置静态内容（字符串或 HTMLElement）</td></tr>
            <tr><td>setLinkContent(html)</td><td>直接向 body 注入 HTML 片段</td></tr>
            <tr><td>setUrl(url, method?, data?)</td><td>通过 XHR 加载远程内容并渲染</td></tr>
            <tr><td>bindSubmit(onSubmit)</td><td>绑定表单提交处理函数，接收 FormData</td></tr>
            <tr><td>bindEvent(selector, event, handler)</td><td>绑定延迟事件（用于异步加载的 DOM）</td></tr>
            <tr><td>make()</td><td>构建并显示模态框</td></tr>
            <tr><td>close()</td><td>关闭模态框，释放所有资源</td></tr>
            <tr><td>getNode()</td><td>获取模态框根 DOM 元素</td></tr>
            <tr><td>destroy()</td><td>销毁（同 close）</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>基于 DaisyUI <code>modal</code> 样式。</li>
            <li>通过 AbortController 统一管理事件和请求，避免内存泄漏。</li>
            <li>支持超时自动关闭。</li>
            <li><code>setUrl</code> 会自动显示 loading，完成后替换为返回的 HTML。</li>
        </ul>
    `;
    const demo = `<div id="modalTabs" class="mt-4"></div>`;
    return renderSection('🪟 Modal 模态框', '基于 DaisyUI 的模态框，支持远程加载、表单提交、超时关闭。', api, demo);
}

function initModal() {
    const container = document.getElementById('modalTabs');
    if (!container) return;

    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="flex flex-wrap gap-2">
            <button id="modalBtn1" class="btn btn-xs btn-primary">静态内容</button>
            <button id="modalBtn2" class="btn btn-xs btn-secondary">表单提交</button>
            <button id="modalBtn3" class="btn btn-xs btn-accent">XHR 远程加载</button>
            <button id="modalBtn4" class="btn btn-xs btn-warning">5秒超时</button>
        </div>
        <div id="modalMsg" class="mt-2 text-xs text-success"></div>
    `;

    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 1. 静态内容
const m1 = new junkman.Modal({ title: '静态模态框', aspect: { width: '400px', height: 'auto' }, gauze: true });
m1.setContent('<div class="p-2">这是纯静态内容</div>');
document.getElementById('modalBtn1').onclick = () => m1.make();

// 2. 表单提交
const m2 = new junkman.Modal({ title: '表单', gauze: true });
m2.setContent(\`<form><input name="msg" class="input input-bordered input-sm w-full" placeholder="输入..."/><button class="btn btn-sm btn-primary mt-2">提交</button></form>\`);
m2.bindSubmit(async (fd) => { alert('收到：' + fd.get('msg')); m2.close(); });
document.getElementById('modalBtn2').onclick = () => m2.make();

// 3. XHR 远程加载 HTML
const m3 = new junkman.Modal({ title: '远程内容', gauze: true });
m3.setUrl('https://httpbin.org/html');  // 返回一段 HTML
document.getElementById('modalBtn3').onclick = () => m3.make();

// 4. 超时关闭
const m4 = new junkman.Modal({ title: '5秒自动关闭', gauze: true, timeout: 5 });
m4.setContent('<p>5秒后自动关闭...</p>');
document.getElementById('modalBtn4').onclick = () => m4.make();
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 实例化四个模态框
    const modal1 = new junkman.Modal({
        title: '静态模态框',
        aspect: { width: '400px', height: 'auto' },
        gauze: true
    });
    modal1.setContent('<div class="p-2">这是纯静态内容，没有任何异步加载。</div>');

    const modal2 = new junkman.Modal({
        title: '表单提交示例',
        gauze: true
    });
    modal2.setContent(`
        <form class="flex flex-col gap-2">
            <input name="msg" class="input input-bordered input-sm w-full" placeholder="请输入一些文字" />
            <button type="submit" class="btn btn-sm btn-primary">提交</button>
        </form>
    `);
    modal2.bindSubmit(async (formData) => {
        const msg = formData.get('msg');
        const msgEl = document.getElementById('modalMsg');
        if (msgEl) msgEl.textContent = '表单提交内容：' + (msg || '(空)');
        modal2.close();
    });

    const modal3 = new junkman.Modal({
        title: '远程加载 HTML',
        gauze: true,
        aspect: { width: '600px', height: '400px' }
    });
    modal3.setUrl('https://httpbin.org/html');   // 返回胡适的一段英文

    const modal4 = new junkman.Modal({
        title: '5秒后自动关闭',
        gauze: true,
        timeout: 5
    });
    modal4.setContent('<p class="p-2">这个模态框将在 <b>5 秒</b> 后自动关闭。</p>');

    // 绑定按钮事件
    document.getElementById('modalBtn1')?.addEventListener('click', () => modal1.make());
    document.getElementById('modalBtn2')?.addEventListener('click', () => modal2.make());
    document.getElementById('modalBtn3')?.addEventListener('click', () => modal3.make());
    document.getElementById('modalBtn4')?.addEventListener('click', () => modal4.make());
}