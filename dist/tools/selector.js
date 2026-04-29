function renderSelector() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Selector(container, data, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>container</td>
                <td>string | HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>挂载容器，支持选择器或 DOM 元素</td>
            </tr>
            <tr>
                <td>data</td>
                <td>{ [label]: value }</td>
                <td>是</td>
                <td>—</td>
                <td>选项映射对象，如 <code>{ "苹果": "1" }</code></td>
            </tr>
            <tr>
                <td>options.limit</td>
                <td>number</td>
                <td>否</td>
                <td>0</td>
                <td>最多可选中的数量，0 表示无限制</td>
            </tr>
            <tr>
                <td>options.placeholder</td>
                <td>string</td>
                <td>否</td>
                <td>'-select-'</td>
                <td>未选中时的占位文本</td>
            </tr>
            <tr>
                <td>options.direction</td>
                <td>SELECTOR_DIRECTION</td>
                <td>否</td>
                <td>Down</td>
                <td>弹出方向，支持 Down / Up / Mid / Right / RightUp / RightMid / Left / LeftUp / LeftMid / UD（自动上下）</td>
            </tr>
            <tr>
                <td>options.searchOff</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>是否禁用搜索框</td>
            </tr>
            <tr>
                <td>options.trigger</td>
                <td>(data) => void</td>
                <td>否</td>
                <td>—</td>
                <td>选中值变化时的回调，参数包含 <code>value</code>、<code>operate</code>、<code>select</code>、<code>insert</code>、<code>delete</code></td>
            </tr>
            <tr>
                <td>options.menuMaxHeight</td>
                <td>string</td>
                <td>否</td>
                <td>'150px'</td>
                <td>下拉菜单最大高度</td>
            </tr>
            <tr>
                <td>options.show</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>初始化后是否立即展开下拉</td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>selected(keys: string[])</td><td>设置初始选中的值数组，返回实例本身</td></tr>
            <tr><td>make()</td><td>渲染组件并返回实例</td></tr>
            <tr><td>destroy()</td><td>销毁组件，清理事件和 DOM</td></tr>
        </table>
    `;
    const demo = `<div id="selectorTabs" class="mt-4"></div>`;
    return renderSection('📋 Selector 下拉选择器', '多选下拉，支持搜索和方向控制。', api, demo);
}

function initSelector() {
    const container = document.getElementById('selectorTabs');
    if (!container) return;

    // 效果面板
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="mb-4">
                <p class="font-bold mb-1">1️⃣ 单选（limit:1）</p>
                <div id="selectorSingle"></div>
            </div>
            <div class="mb-4">
                <p class="font-bold mb-1">2️⃣ 多选（limit:3）</p>
                <div id="selectorMulti"></div>
            </div>
            <div class="mb-4">
                <p class="font-bold mb-1">3️⃣ 方向朝上 (Up)</p>
                <div id="selectorAuto"></div>
            </div>
        </div>
        <div class="mt-4">
            <p class="font-bold mb-1">4️⃣ 含搜索，无限制 (limit:0)</p>
            <div id="selectorSearch"></div>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 单选
new junkman.Selector('#selectorSingle',
    { "苹果": "1", "香蕉": "2", "橙子": "3", "葡萄": "4" },
    { limit: 1, placeholder: "请选择水果" }
).selected(['2']).make();

// 多选 limit=3
new junkman.Selector('#selectorMulti',
    { "红": "red", "绿": "green", "蓝": "blue", "黄": "yellow", "紫": "purple" },
    { limit: 3, placeholder: "最多选3个颜色" }
).selected(['red', 'green']).make();

// 方向 Up
new junkman.Selector('#selectorAuto',
    { "北京": "bj", "上海": "sh", "广州": "gz", "深圳": "sz" },
    { limit: 1, direction: junkman.SELECTOR_DIRECTION.Up, placeholder: "上弹出" }
).make();

// 含搜索，limit=0
new junkman.Selector('#selectorSearch',
    { "JavaScript": "js", "TypeScript": "ts", "Python": "py", "Rust": "rs", "Go": "go" },
    { limit: 0, placeholder: "选择编程语言（可搜索）", searchOff: false }
).selected(['js', 'ts']).make();
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 创建 Selector 示例
    // 单选
    new junkman.Selector(
        '#selectorSingle',
        { "苹果": "1", "香蕉": "2", "橙子": "3", "葡萄": "4" },
        { limit: 1, placeholder: "请选择水果" }
    ).selected(['2']).make();

    // 多选 limit=3
    new junkman.Selector(
        '#selectorMulti',
        { "红": "red", "绿": "green", "蓝": "blue", "黄": "yellow", "紫": "purple" },
        { limit: 3, placeholder: "最多选3个颜色" }
    ).selected(['red', 'green']).make();

    // 方向 Up
    new junkman.Selector(
        '#selectorAuto',
        { "北京": "bj", "上海": "sh", "广州": "gz", "深圳": "sz" },
        { limit: 1, direction: junkman.SELECTOR_DIRECTION.Up, placeholder: "上弹出" }
    ).make();

    // 含搜索，limit=0
    new junkman.Selector(
        '#selectorSearch',
        { "JavaScript": "js", "TypeScript": "ts", "Python": "py", "Rust": "rs", "Go": "go" },
        { limit: 0, placeholder: "选择编程语言（可搜索）", searchOff: false }
    ).selected(['js', 'ts']).make();
}

function renderSwitcher() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Switcher(container, data, options?)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>container</td>
                <td>string | HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>挂载容器，支持选择器或 DOM 元素</td>
            </tr>
            <tr>
                <td>data</td>
                <td>{ [label]: value }</td>
                <td>是</td>
                <td>—</td>
                <td>选项映射对象，如 <code>{ "男": "male" }</code></td>
            </tr>
            <tr>
                <td>options.limit</td>
                <td>number</td>
                <td>否</td>
                <td>0</td>
                <td>最多可选中的数量，0 表示无限制</td>
            </tr>
            <tr>
                <td>options.towards</td>
                <td>SELECTOR_TOWARDS</td>
                <td>否</td>
                <td>Horizontal</td>
                <td>排列方向：<code>Horizontal</code>（横向）或 <code>Vertical</code>（纵向）</td>
            </tr>
            <tr>
                <td>options.trigger</td>
                <td>(data) => void</td>
                <td>否</td>
                <td>—</td>
                <td>选中值变化时的回调，参数包含 <code>value</code>、<code>operate</code>、<code>select</code>、<code>insert</code>、<code>delete</code></td>
            </tr>
            <tr>
                <td>options.wrap</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>是否允许按钮换行</td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>selected(keys: string[])</td><td>设置初始选中的值数组，返回实例本身</td></tr>
            <tr><td>make()</td><td>渲染组件并返回实例</td></tr>
            <tr><td>destroy()</td><td>销毁组件，清理 DOM</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>基于 DaisyUI <code>btn-group</code> 样式，<code>Vertical</code> 方向时为垂直按钮组。</li>
            <li>选中和取消选中均有视觉反馈（<code>btn-active</code>）。</li>
            <li>超出 limit 限制时，自动移除最早选中的项。</li>
            <li><code>selected()</code> 可在 <code>make()</code> 之前或之后调用，后者会立即刷新 UI。</li>
        </ul>
    `;
    const demo = `<div id="switcherTabs" class="mt-4"></div>`;
    return renderSection('🔘 Switcher 切换器', '按钮组单选/多选切换，支持横向/纵向布局。', api, demo);
}

function initSwitcher() {
    const container = document.getElementById('switcherTabs');
    if (!container) return;

    // 效果面板
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="mb-4">
                <p class="font-bold mb-1">横向布局 (towards: Horizontal)</p>
                <div id="switcherHorizontal"></div>
            </div>
            <div class="mb-4">
                <p class="font-bold mb-1">纵向布局 (towards: Vertical)</p>
                <div id="switcherVertical"></div>
            </div>
        </div>
        <div class="mt-4">
            <p class="font-bold mb-1">多选横向 (limit:0)</p>
            <div id="switcherMulti"></div>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 横向单选
new junkman.Switcher('#switcherHorizontal',
    { "男": "male", "女": "female", "保密": "unknown" },
    { limit: 1, towards: junkman.SELECTOR_TOWARDS.Horizontal }
).selected(['male']).make();

// 纵向多选
const s2 = new junkman.Switcher('#switcherVertical',
    { "阅读": "read", "运动": "sport", "音乐": "music", "旅行": "travel" },
    { limit: 0, towards: junkman.SELECTOR_TOWARDS.Vertical }
).make();
s2.selected(['read', 'music']);

// 横向多选
new junkman.Switcher('#switcherMulti',
    { "大": "big", "中": "middle", "小": "small" },
    { limit: 0, towards: junkman.SELECTOR_TOWARDS.Horizontal }
).selected(['middle']).make();
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化 Switcher 示例
    // 横向单选
    new junkman.Switcher(
        '#switcherHorizontal',
        { "男": "male", "女": "female", "保密": "unknown" },
        { limit: 1, towards: junkman.SELECTOR_TOWARDS.Horizontal }
    ).selected(['male']).make();

    // 纵向多选
    const s2 = new junkman.Switcher(
        '#switcherVertical',
        { "阅读": "read", "运动": "sport", "音乐": "music", "旅行": "travel" },
        { limit: 0, towards: junkman.SELECTOR_TOWARDS.Vertical }
    ).make();
    s2.selected(['read', 'music']);

    // 横向多选
    new junkman.Switcher(
        '#switcherMulti',
        { "大": "big", "中": "middle", "小": "small" },
        { limit: 0, towards: junkman.SELECTOR_TOWARDS.Horizontal }
    ).selected(['middle']).make();
}

function renderToggle() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.Toggle(options)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
            <tr>
                <td>container</td>
                <td>string | HTMLElement</td>
                <td>是</td>
                <td>—</td>
                <td>开关挂载的容器（选择器或 DOM 元素）</td>
            </tr>
            <tr>
                <td>checked</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>初始选中状态</td>
            </tr>
            <tr>
                <td>size</td>
                <td>'sm' | 'md' | 'lg'</td>
                <td>否</td>
                <td>'md'</td>
                <td>开关尺寸</td>
            </tr>
            <tr>
                <td>disabled</td>
                <td>boolean</td>
                <td>否</td>
                <td>false</td>
                <td>是否禁用</td>
            </tr>
            <tr>
                <td>onChange</td>
                <td>(checked: boolean) => void</td>
                <td>否</td>
                <td>—</td>
                <td>状态变化回调</td>
            </tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>getValue()</td><td>获取当前开关状态（true/false）</td></tr>
            <tr><td>setValue(value)</td><td>设置开关状态，并触发 change 事件</td></tr>
            <tr><td>setDisabled(disabled)</td><td>设置禁用状态</td></tr>
            <tr><td>destroy()</td><td>销毁开关，移除 DOM</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>基于 DaisyUI <code>toggle</code> 样式。</li>
            <li>调用 <code>setValue</code> 时会自动触发 <code>onChange</code> 回调。</li>
            <li>通过 <code>size</code> 属性控制视觉大小。</li>
        </ul>
    `;
    const demo = `<div id="toggleTabs" class="mt-4"></div>`;
    return renderSection('🔘 Toggle 开关', '基于 DaisyUI 的单选开关，支持多种尺寸和禁用状态。', api, demo);
}

function initToggle() {
    const container = document.getElementById('toggleTabs');
    if (!container) return;

    // 效果面板：开关 + 状态文字
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <div id="toggleDemo"></div>
            <span id="toggleStatus" class="text-sm">关闭</span>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const status = document.getElementById('toggleStatus');
new junkman.Toggle({
    container: '#toggleDemo',
    size: 'md',
    onChange: (checked) => {
        status.textContent = checked ? '开启' : '关闭';
        toast.show({ message: \`开关: \${checked ? 'ON' : 'OFF'}\`, type: 'info' });
    }
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 初始化 Toggle（捕获状态元素）
    const statusEl = effectDiv.querySelector('#toggleStatus');
    new junkman.Toggle({
        container: '#toggleDemo',
        size: 'md',
        onChange: (checked) => {
            if (statusEl) statusEl.textContent = checked ? '开启' : '关闭';
            if (typeof toast !== 'undefined') {
                toast.show({ message: `开关: ${checked ? 'ON' : 'OFF'}`, type: 'info' });
            }
        }
    });
}