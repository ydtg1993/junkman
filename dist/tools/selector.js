// ==================== 渲染区域（仅提供骨架） ====================
function renderSelector() {
    const api = `<pre><code>new junkman.Selector(container,data, options)</code></pre>
    <h3>参数</h3>
    <table class="api-table"><tr><th>参数</th><th>说明</th></tr>
      <tr><td>container</td><td>容器dom, #id查询, .class查询</td></tr>
      <tr><td>data</td><td>选项映射 {label: value}</td></tr>
      <tr><td>options.limit</td><td>最多选中数</td></tr>
      <tr><td>options.placeholder</td><td>占位文本</td></tr>
      <tr><td>options.direction</td><td>弹出方向 Down | Up | Mid | Right | RightUp | RightMid | Left | LeftUp | LeftMid,</td></tr></table>`;
    const demo = `<div id="selectorTabs" class="mt-4"></div>`;
    return renderSection('📋 Selector 下拉选择器', '多选下拉，支持搜索。', api, demo);
}

function renderSwitcher() {
    const api = `<pre><code>new junkman.Switcher(container,data, options)</code></pre>
    <h3>参数</h3>
    <table class="api-table">
      <tr><th>参数</th><th>说明</th></tr>
      <tr><td>container</td><td>容器dom, #id查询, .class查询</td></tr>
      <tr><td>data</td><td>选项映射 <code>{label: value}</code></td></tr>
      <tr><td>options.limit</td><td>最多选中数，<code>0</code> 为无限制</td></tr>
      <tr><td>options.towards</td><td>排列方向，可选 <code>junkman.SELECTOR_TOWARDS.Horizontal</code>（横向）或 <code>Vertical</code>（纵向）</td></tr>
      <tr><td>options.trigger</td><td>选中回调函数 <code>(data) => void</code></td></tr>
    </table>`;
    const demo = `<div id="switcherTabs" class="mt-4"></div>`;
    return renderSection('🔘 Switcher 切换器', '按钮组单选/多选切换。', api, demo);
}

// ==================== 业务初始化（纯渲染） ====================
function initSelector() {
    // 单选
    new junkman.Selector(
        '#selectorSingle',                           // 容器选择器
        { "苹果": "1", "香蕉": "2", "橙子": "3", "葡萄": "4" },
        {
            limit: 1,
            placeholder: "请选择水果",
            trigger: (d) => console.log(`单选选中值: ${d.value}`),
        }
    ).selected(['2']).make();

    // 多选 limit=3
    new junkman.Selector(
        '#selectorMulti',
        { "红": "red", "绿": "green", "蓝": "blue", "黄": "yellow", "紫": "purple" },
        {
            limit: 3,
            placeholder: "最多选3个颜色",
            trigger: (d) => console.log(`多选当前值: ${d.value}`),
        }
    ).selected(['red', 'green']).make();

    // 方向 Up
    new junkman.Selector(
        '#selectorAuto',
        { "北京": "bj", "上海": "sh", "广州": "gz", "深圳": "sz" },
        {
            limit: 1,
            direction: junkman.SELECTOR_DIRECTION.Up,
            placeholder: "自动上下弹出",
            trigger: (d) => console.log(`城市: ${d.value}`),
        }
    ).make();

    // 含搜索，limit=0
    new junkman.Selector(
        '#selectorSearch',
        { "JavaScript": "js", "TypeScript": "ts", "Python": "py", "Rust": "rs", "Go": "go" },
        {
            limit: 0,
            placeholder: "选择编程语言（可搜索）",
            searchOff: false,
            trigger: (d) => console.log(`语言: ${d.value}`),
        }
    ).selected(['js', 'ts']).make();
}

function initSwitcher() {
    new junkman.Switcher(
        '#switcherHorizontal',
        { "男": "male", "女": "female", "保密": "unknown" },
        {
            limit: 1,
            towards: junkman.SELECTOR_TOWARDS.Horizontal,
            trigger: (d) => console.log(`性别: ${d.value}`),
        }
    ).selected(['male']).make();

    new junkman.Switcher(
        '#switcherVertical',
        { "阅读": "read", "运动": "sport", "音乐": "music", "旅行": "travel" },
        {
            limit: 0,
            towards: junkman.SELECTOR_TOWARDS.Vertical,
            trigger: (d) => console.log(`兴趣爱好: ${d.value}`),
        }
    ).selected(['read', 'music']).make();

    new junkman.Switcher(
        '#switcherMulti',
        { "大": "big", "中": "middle", "小": "small" },
        {
            limit: 0,
            towards: junkman.SELECTOR_TOWARDS.Horizontal,
            trigger: (d) => console.log(`尺寸: ${d.value}`),
        }
    ).selected(['middle']).make();
}

// ==================== Tab 构建 + 自动调用业务 ====================
function initSelectorTabs() {
    const container = document.getElementById('selectorTabs');
    if (!container) return;

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
                <p class="font-bold mb-1">3️⃣ 方向朝上 Up</p>
                <div id="selectorAuto"></div>
            </div>
        </div>
        <div class="mt-4">
            <p class="font-bold mb-1">4️⃣ 含搜索、limit:0（无限制）</p>
            <div id="selectorSearch"></div>
        </div>
    `;

    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 单选
new junkman.Selector(
    '#selectorSingle', // 容器选择器
    { "苹果": "1", "香蕉": "2", "橙子": "3", "葡萄": "4" },
    { limit: 1, placeholder: "请选择水果", parentNode: document.getElementById('selectorSingle') }
).selected(['2']).make();

// 多选 limit=3
new junkman.Selector(
    '#selectorMulti',
    { "红": "red", "绿": "green", "蓝": "blue", "黄": "yellow", "紫": "purple" },
    { limit: 3, placeholder: "最多选3个颜色", parentNode: document.getElementById('selectorMulti') }
).selected(['red', 'green']).make();

// 自动方向 UD
new junkman.Selector(
    '#selectorAuto',
    { "北京": "bj", "上海": "sh", "广州": "gz", "深圳": "sz" },
    { limit: 1, direction: junkman.SELECTOR_DIRECTION.Up, placeholder: "上弹出", parentNode: document.getElementById('selectorAuto') }
).make();

// 含搜索，limit=0
new junkman.Selector(
    '#selectorSearch',
    { "JavaScript": "js", "TypeScript": "ts", "Python": "py", "Rust": "rs", "Go": "go" },
    { limit: 0, placeholder: "选择编程语言（可搜索）", searchOff: false, parentNode: document.getElementById('selectorSearch') }
).selected(['js', 'ts']).make();
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // 此时 DOM 已就位，执行业务初始化
    initSelector();
}

function initSwitcherTabs() {
    const container = document.getElementById('switcherTabs');
    if (!container) return;

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

    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// 横向单选
new junkman.Switcher(
    '#switcherHorizontal',
    { "男": "male", "女": "female", "保密": "unknown" },
    { limit: 1, towards: junkman.SELECTOR_TOWARDS.Horizontal, parentNode: document.getElementById('switcherHorizontal') }
).selected(['male']).make();

// 纵向多选
new junkman.Switcher(
    '#switcherVertical',
    { "阅读": "read", "运动": "sport", "音乐": "music", "旅行": "travel" },
    { limit: 0, towards: junkman.SELECTOR_TOWARDS.Vertical, parentNode: document.getElementById('switcherVertical') }
).selected(['read', 'music']).make();

// 横向多选
new junkman.Switcher(
    '#switcherMulti',
    { "大": "big", "中": "middle", "小": "small" },
    { limit: 0, towards: junkman.SELECTOR_TOWARDS.Horizontal, parentNode: document.getElementById('switcherMulti') }
).selected(['middle']).make();
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    initSwitcher();
}

function renderToggle() {
    const api = `
        <pre><code>new junkman.Toggle({ container, size?, checked?, onChange? })</code></pre>
        <h3>参数</h3>
        <table class="api-table">
            <tr><th>属性</th><th>说明</th></tr>
            <tr><td>container</td><td>挂载容器</td></tr>
            <tr><td>size</td><td>尺寸 'sm'|'md'|'lg'</td></tr>
            <tr><td>checked</td><td>初始状态</td></tr>
            <tr><td>onChange</td><td>变化回调</td></tr>
        </table>
    `;
    const demo = `<div id="toggleTabs" class="mt-4"></div>`;
    return renderSection('🔘 Toggle 开关', '基于 DaisyUI toggle 样式。', api, demo);
}

function initToggleTabs() {
    const container = document.getElementById('toggleTabs');
    if (!container) return;

    // 效果面板
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div id="toggleDemo" class="flex items-center gap-2">
            <span id="toggleStatus" class="text-sm">关闭</span>
        </div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
const status = document.getElementById('toggleStatus');
new junkman.Toggle({
    container: document.getElementById('toggleDemo'),
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

    // DOM 就绪后初始化 Toggle 组件
    const status = effectDiv.querySelector('#toggleStatus');
    new junkman.Toggle({
        container: effectDiv.querySelector('#toggleDemo'),
        size: 'md',
        onChange: (checked) => {
            if (status) status.textContent = checked ? '开启' : '关闭';
            toast.show({ message: `开关: ${checked ? 'ON' : 'OFF'}`, type: 'info' });
        }
    });
}