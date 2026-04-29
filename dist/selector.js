function renderSelector() {
    const api = `<pre><code>new junkman.Selector(data, options)</code></pre>
    <h3>参数</h3>
    <table class="api-table"><tr><th>参数</th><th>说明</th></tr>
      <tr><td>data</td><td>选项映射 {label: value}</td></tr>
      <tr><td>limit</td><td>最多选中数</td></tr>
      <tr><td>placeholder</td><td>占位文本</td></tr>
      <tr><td>direction</td><td>弹出方向，支持 UD（自动上下）</td></tr></table>`;

    const demo = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div>
        <p class="font-bold mb-1">1️⃣ 单选（limit:1）</p>
        <div id="selectorSingle"></div>
      </div>
      <div>
        <p class="font-bold mb-1">2️⃣ 多选（limit:3）</p>
        <div id="selectorMulti"></div>
      </div>
    </div>
    <div class="mt-4">
      <p class="font-bold mb-1">4️⃣ 含搜索、limit:0（无限制）</p>
      <div id="selectorSearch"></div>
    </div>
  `;

    return renderSection('📋 Selector 下拉选择器', '多选下拉，支持搜索。', api, demo);
}

function renderSwitcher() {
    const api = `<pre><code>new junkman.Switcher(data, options)</code></pre>
    <p><b>特有：</b> <code>options.towards</code> 控制排列方向</p>`;

    const demo = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <div>
        <p class="font-bold mb-1">横向布局 (towards: Horizontal)</p>
        <div id="switcherHorizontal"></div>
      </div>
      <div>
        <p class="font-bold mb-1">纵向布局 (towards: Vertical)</p>
        <div id="switcherVertical"></div>
      </div>
    </div>
    <div class="mt-4">
      <p class="font-bold mb-1">多选横向 (limit:0)</p>
      <div id="switcherMulti"></div>
    </div>
  `;

    return renderSection('🔘 Switcher 切换器', '按钮组单选/多选切换。', api, demo);
}

function initSelector() {
    // 单选
    new junkman.Selector(
        { "苹果": "1", "香蕉": "2", "橙子": "3", "葡萄": "4" },
        {
            limit: 1,
            placeholder: "请选择水果",
            trigger: (d) => console.log(`单选选中值: ${d.value}`),
            parentNode: document.getElementById('selectorSingle')
}).selected(['2']).make();

    // 多选 limit=3
    new junkman.Selector(
        { "红": "red", "绿": "green", "蓝": "blue", "黄": "yellow", "紫": "purple" },
        {
            limit: 3,
            placeholder: "最多选3个颜色",
            trigger: (d) => console.log(`多选当前值: ${d.value}`),
            parentNode: document.getElementById('selectorMulti')
}).selected(['red', 'green']).make();

    // 含搜索，limit=0 无限制
    new junkman.Selector(
        { "JavaScript": "js", "TypeScript": "ts", "Python": "py", "Rust": "rs", "Go": "go" },
        {
            limit: 0,
            placeholder: "选择编程语言（可搜索）",
            searchOff: false,    // 默认就是开启搜索，这里显式示例
            trigger: (d) => console.log(`语言: ${d.value}`),
            parentNode: document.getElementById('selectorSearch')
        }).selected(['js', 'ts']).make();
}

function initSwitcher() {
    // 横向单选
    new junkman.Switcher(
        { "男": "male", "女": "female", "保密": "unknown" },
        {
            limit: 1,
            towards: junkman.SELECTOR_TOWARDS.Horizontal,  // 横向
            trigger: (d) => console.log(`性别: ${d.value}`),
            parentNode: document.getElementById('switcherHorizontal')
        }).selected(['male']).make();

    // 纵向多选
    new junkman.Switcher(
        { "阅读": "read", "运动": "sport", "音乐": "music", "旅行": "travel" },
        {
            limit: 0,
            towards: junkman.SELECTOR_TOWARDS.Vertical,    // 纵向
            trigger: (d) => console.log(`兴趣爱好: ${d.value}`),
            parentNode: document.getElementById('switcherVertical')
        }).selected(['read', 'music']).make();

    // 横向多选
    new junkman.Switcher(
        { "大": "big", "中": "middle", "小": "small" },
        {
            limit: 0,
            towards: junkman.SELECTOR_TOWARDS.Horizontal,
            trigger: (d) => console.log(`尺寸: ${d.value}`),
            parentNode: document.getElementById('switcherMulti')
        }).selected(['middle']).make();
}