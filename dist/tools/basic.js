function renderContextmenu() {
    const api = `
        <h3>函数签名</h3>
        <pre><code>junkman.contextmenu(elements, items, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>说明</th></tr>
            <tr>
                <td>elements</td>
                <td>HTMLElement[]</td>
                <td>要绑定右键菜单的 DOM 元素数组</td>
            </tr>
            <tr>
                <td>items</td>
                <td>ContextMenuItem[]</td>
                <td>
                    菜单项数组，每项包含：<br>
                    <code>title: string</code> 显示文字<br>
                    <code>func?: (event) => void</code> 点击回调，<b>不存在时视为禁用项</b>
                </td>
            </tr>
            <tr>
                <td>options</td>
                <td>ContextMenuOptions</td>
                <td>可选配置对象，见下表</td>
            </tr>
        </table>

        <h3 class="mt-4">配置选项 (ContextMenuOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>width</td>
                <td>string</td>
                <td><code>'auto'</code></td>
                <td>菜单宽度，例如 <code>'200px'</code>；默认由内容决定</td>
            </tr>
            <tr>
                <td>className</td>
                <td>string</td>
                <td><code>''</code></td>
                <td>菜单元素的额外 CSS 类名</td>
            </tr>
            <tr>
                <td>preventInnerContext</td>
                <td>boolean</td>
                <td><code>true</code></td>
                <td>是否阻止在菜单内部再次触发右键菜单</td>
            </tr>
        </table>

        <h3 class="mt-4">返回值</h3>
        <p>返回一个 <code>destroy()</code> 函数，调用后将解绑所有事件并移除当前菜单。</p>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>右键目标元素时，会在鼠标位置打开自定义菜单。</li>
            <li>自动检测菜单边界，避免超出视口。</li>
            <li>点击菜单外部、滚动页面或鼠标离开菜单，菜单自动关闭。</li>
            <li>如果菜单项的 <code>func</code> 缺失，该项会显示为禁用样式（灰色不可点击）。</li>
        </ul>
    `;
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
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Toast(position?: ToastPosition)</code></pre>
        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>说明</th></tr>
            <tr>
                <td>position</td>
                <td>ToastPosition</td>
                <td>通知容器的固定位置，默认为 <code>TopRight</code></td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <pre><code>toast.show(options: ToastOptions)</code></pre>
        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>说明</th></tr>
            <tr>
                <td>message</td>
                <td>string</td>
                <td>通知文本内容</td>
            </tr>
            <tr>
                <td>type</td>
                <td>ToastType</td>
                <td>通知类型，可选 <code>'info'</code> / <code>'success'</code> / <code>'warning'</code> / <code>'error'</code>，默认 <code>'info'</code></td>
            </tr>
            <tr>
                <td>duration</td>
                <td>number</td>
                <td>自动关闭时间（毫秒），<code>0</code> 表示不自动关闭，默认 <code>3000</code></td>
            </tr>
            <tr>
                <td>closable</td>
                <td>boolean</td>
                <td>是否显示手动关闭按钮，默认 <code>true</code></td>
            </tr>
        </table>

        <h3 class="mt-4">枚举：ToastPosition</h3>
        <table class="api-table">
            <tr><th>成员</th><th>值</th><th>说明</th></tr>
            <tr><td>TopLeft</td><td>top-left</td><td>左上角</td></tr>
            <tr><td>TopCenter</td><td>top-center</td><td>顶部居中</td></tr>
            <tr><td>TopRight</td><td>top-right</td><td>右上角（默认）</td></tr>
            <tr><td>MiddleLeft</td><td>middle-left</td><td>左侧垂直居中</td></tr>
            <tr><td>MiddleCenter</td><td>middle-center</td><td>屏幕正中央</td></tr>
            <tr><td>MiddleRight</td><td>middle-right</td><td>右侧垂直居中</td></tr>
            <tr><td>BottomLeft</td><td>bottom-left</td><td>左下角</td></tr>
            <tr><td>BottomCenter</td><td>bottom-center</td><td>底部居中</td></tr>
            <tr><td>BottomRight</td><td>bottom-right</td><td>右下角</td></tr>
        </table>
    `;
    const demo = `<div id="toastTabs" class="mt-4"></div>`;
    return renderSection('🔔 Toast 消息通知', '基于 DaisyUI Alert，支持九个方位，动画进出。', api, demo);
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
    const api = `
        <h3>函数签名</h3>
        <pre><code>junkman.ImgLoader(doms, time?, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>doms</td>
                <td>HTMLElement[]</td>
                <td>是</td>
                <td>—</td>
                <td>需要处理的图片元素数组，<b>必须为 <code>&lt;img&gt;</code> 元素</b>，通过 <code>data-src</code> 指定真实图片地址</td>
            </tr>
            <tr>
                <td>time</td>
                <td>number</td>
                <td>否</td>
                <td>200</td>
                <td>每个图片加载间隔（毫秒），仅在 <code>mode='sync'</code> 时有效</td>
            </tr>
            <tr>
                <td>options</td>
                <td>ImgLoaderOptions</td>
                <td>否</td>
                <td>{}</td>
                <td>配置对象，见下表</td>
            </tr>
        </table>

        <h3 class="mt-4">配置选项 (ImgLoaderOptions)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>zoom</td>
                <td>boolean</td>
                <td><code>false</code></td>
                <td>是否启用悬停放大预览</td>
            </tr>
            <tr>
                <td>width</td>
                <td>number</td>
                <td><code>300</code></td>
                <td>预览图宽度（像素），配合 <code>zoom: true</code> 使用</td>
            </tr>
            <tr>
                <td>height</td>
                <td>number</td>
                <td><code>0</code></td>
                <td>预览图高度（像素）：<br>
                    <code>&gt; 0</code> 固定高度；<br>
                    <code>= 0</code> 按比例自适应；<br>
                    <code>&lt; 0</code> 自动限制不超出视口</td>
            </tr>
            <tr>
                <td>previewClass</td>
                <td>string</td>
                <td><code>''</code></td>
                <td>预览图额外的 CSS 类名</td>
            </tr>
            <tr>
                <td>mode</td>
                <td>'sync' | 'async'</td>
                <td><code>'sync'</code></td>
                <td>加载模式：<br>
                    <code>'sync'</code> 逐个延迟加载，间隔由 <code>time</code> 决定；<br>
                    <code>'async'</code> 所有图片同时加载</td>
            </tr>
        </table>

        <h3 class="mt-4">返回值</h3>
        <p>返回一个 <code>destroy()</code> 函数，调用后取消所有未执行的加载、移除预览图、清理事件监听和骨架屏样式。</p>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>自动为每个 <code>&lt;img&gt;</code> 元素添加骨架屏动画，直到真实图片加载完成。</li>
            <li>通过 <code>data-src</code> 属性指定真实图片地址，加载前使用透明占位图防止浏览器默认占位符。</li>
            <li>骨架屏尺寸会自动根据元素当前显示尺寸固定，避免坍塌。</li>
            <li>启用 <code>zoom</code> 后，鼠标悬停会在固定定位预览大图，智能避开屏幕边缘。</li>
            <li>避免重复处理：同一张图片只会被加载一次（通过 <code>data-loaded</code> 标记）。</li>
        </ul>
    `;
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