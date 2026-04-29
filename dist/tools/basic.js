function renderContextmenu() {
    const api = `<h3>调用方式</h3><pre><code>junkman.contextmenu(elements, items, options?)</code></pre>
      <h3>参数</h3>
      <table class="api-table"><tr><th>参数</th><th>类型</th><th>说明</th></tr>
        <tr><td>elements</td><td>HTMLElement[]</td><td>要绑定的元素[多个]</td></tr>
        <tr><td>items</td><td>ContextMenuItem[]</td><td>菜单项 { title, func? }</td></tr>
        <tr><td>options.width</td><td>string</td><td>菜单宽度</td></tr></table>`;
    const demo = `<div id="contextmenuTabs" class="mt-4"></div>`;
    return renderSection('📌 contextmenu 右键菜单', '自定义右键菜单，边界检测，可销毁。', api, demo);
}

function initContextmenuTabs() {
    const container = document.getElementById('contextmenuTabs');
    if (!container) return;

    // 效果面板
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <p>右键下方方块：</p>
        <div class="flex gap-2">
            <div class="btn btn-active btn-info cm-box">右键1</div>
            <div class="btn btn-active btn-info cm-box">右键2</div>
        </div>
        <button class="btn btn-xs btn-outline mt-2" id="destroyCMBtn">销毁菜单</button>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const boxes = document.querySelectorAll('.cm-box');
const destroyFn = junkman.contextmenu(boxes, [
    { title: '复制', func: () => toast.show({ message: '复制成功', type: 'success' }) },
    { title: '粘贴', func: () => toast.show({ message: '粘贴成功', type: 'success' }) },
    { title: '控制台输出', func: () => console.log('右键点击') }
]);

document.getElementById('destroyCMBtn')?.addEventListener('click', () => {
    destroyFn();
    toast.show({ message: '菜单已销毁', type: 'success' });
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // DOM 就绪后绑定右键菜单
    const boxes = effectDiv.querySelectorAll('.cm-box');
    const destroyFn = junkman.contextmenu(boxes, [
        { title: '复制', func: () => toast.show({ message: '复制成功', type: 'success' }) },
        { title: '粘贴', func: () => toast.show({ message: '粘贴成功', type: 'success' }) },
        { title: '控制台输出', func: () => console.log('右键点击') }
    ]);
    effectDiv.querySelector('#destroyCMBtn')?.addEventListener('click', () => {
        destroyFn();
        toast.show({ message: '菜单已销毁', type: 'success' });
    });
}

function renderToast() {
    const api = `<pre><code>new junkman.Toast(position?: ToastPosition)</code></pre>
      <h3>ToastPosition 枚举</h3>
      <table class="api-table"><tr><th>成员</th><th>值</th></tr>
        <tr><td>TopLeft</td><td>top-left</td></tr><tr><td>TopRight</td><td>top-right</td></tr></table>`;
    const demo = `<div id="toastTabs" class="mt-4"></div>`;
    return renderSection('🔔 Toast 消息通知', '基于 DaisyUI Alert，支持九个方位。', api, demo);
}

function initToastTabs() {
    const container = document.getElementById('toastTabs');
    if (!container) return;

    // 效果面板
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="flex flex-wrap gap-2">
            <button class="btn btn-xs btn-info" id="toastInfo">信息</button>
            <button class="btn btn-xs btn-success" id="toastSuccess">成功</button>
            <button class="btn btn-xs btn-warning" id="toastWarning">警告</button>
            <button class="btn btn-xs btn-error" id="toastError">错误</button>
            <button class="btn btn-xs btn-outline" id="toastCenter">中间提示</button>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const toast = new junkman.Toast(junkman.ToastPosition.TopRight);
const centerToast = new junkman.Toast(junkman.ToastPosition.MiddleCenter);
    
toast.show({message:'信息提示', type:'info'});
toast.show({message:'操作成功', type:'success'});
toast.show({message:'请注意', type:'warning'});
toast.show({message:'错误发生', type:'error'});
centerToast.show({message:'中间通知', type:'info', duration:0});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 绑定按钮事件（假设全局 toast / centerToast 已创建）
    effectDiv.querySelector('#toastInfo')?.addEventListener('click', () => toast.show({message:'信息提示', type:'info'}));
    effectDiv.querySelector('#toastSuccess')?.addEventListener('click', () => toast.show({message:'操作成功', type:'success'}));
    effectDiv.querySelector('#toastWarning')?.addEventListener('click', () => toast.show({message:'请注意', type:'warning'}));
    effectDiv.querySelector('#toastError')?.addEventListener('click', () => toast.show({message:'错误发生', type:'error'}));
    effectDiv.querySelector('#toastCenter')?.addEventListener('click', () => centerToast.show({message:'中间通知', type:'info', duration:0}));
}

function renderImgLoader() {
    const api = `<pre><code>junkman.ImgLoader(elements, time?, options?)</code></pre>
      <h3>参数</h3>
      <table class="api-table"><tr><th>参数</th><th>类型</th><th>说明</th></tr>
        <tr><td>elements</td><td>HTMLElement[]</td><td>图片元素数组</td></tr>
        <tr><td>time</td><td>number</td><td>延迟加载间隔</td></tr>
        <tr><td>options.zoom</td><td>boolean</td><td>悬停放大</td></tr>
        <tr><td>options.width</td><td>number</td><td>悬停放大:宽度</td></tr>
        <tr><td>options.height</td><td>number</td><td>悬停放大:高度</td></tr>
        <tr><td>options.mode</td><td>string</td><td>sync | async</td><td>同步加载,异步加载</td></tr>
        </table>`;
    const demo = `<div id="imgLoaderTabs" class="mt-4"></div>`;
    return renderSection('🖼️ ImgLoader 图片加载器', '延迟加载 data-src，带骨架屏，支持放大预览。', api, demo);
}

function initImgLoaderTabs() {
    const container = document.getElementById('imgLoaderTabs');
    if (!container) return;

    // 效果面板：两组图片分别演示 sync / async
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="mb-4">
            <p class="font-bold mb-1">🔹 逐个加载（sync）</p>
            <div id="imgSyncDemo" class="flex gap-2">
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=1" />
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=2" />
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=3" />
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=4" />
            </div>
        </div>
        <div>
            <p class="font-bold mb-1">🔹 同时加载（async）</p>
            <div id="imgAsyncDemo" class="flex gap-2">
                <img class="w-14 max-h-12object-cover" data-src="https://picsum.photos/200?random=5" />
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=6" />
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=7" />
                <img class="w-14 max-h-12 object-cover" data-src="https://picsum.photos/200?random=8" />
            </div>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 逐个延迟加载 (mode: 'sync')
const syncImgs = document.querySelectorAll('#imgSyncDemo img');
junkman.ImgLoader(syncImgs, 500, { zoom: true, width: 250, height: -1, mode: 'sync' });

// 同时加载 (mode: 'async')
const asyncImgs = document.querySelectorAll('#imgAsyncDemo img');
junkman.ImgLoader(asyncImgs, 0, { zoom: true, width: 250, height: -1, mode: 'async' });
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化两组图片，分别使用同步/异步模式
    const syncImgs = effectDiv.querySelectorAll('#imgSyncDemo img');
    const asyncImgs = effectDiv.querySelectorAll('#imgAsyncDemo img');

    junkman.ImgLoader(Array.from(syncImgs), 500, { zoom: true, width: 250, height: -1, mode: 'sync' });
    junkman.ImgLoader(Array.from(asyncImgs), 0, { zoom: true, width: 250, height: -1, mode: 'async' });
}