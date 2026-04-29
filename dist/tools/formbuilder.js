function renderFormBuilder() {
    const api = `
        <h3>构造函数</h3>
        <pre><code>new junkman.FormBuilder(schema)</code></pre>

        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>说明</th></tr>
            <tr><td>schema</td><td>FormFieldSchema[]</td><td>表单字段定义数组</td></tr>
        </table>

        <h3 class="mt-4">字段定义 (FormFieldSchema)</h3>
        <table class="api-table">
            <tr><th>属性</th><th>类型</th><th>说明</th></tr>
            <tr><td>name</td><td>string</td><td>表单字段名称（用于提交数据）</td></tr>
            <tr><td>label</td><td>string</td><td>标签</td></tr>
            <tr><td>type</td><td>'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'widget'</td><td>控件类型，其中 <code>widget</code> 为自定义组件</td></tr>
            <tr><td>widgetName</td><td>string</td><td>当 type 为 'widget' 时，指定已注册的组件名称</td></tr>
            <tr><td>widgetOptions</td><td>object</td><td>传递给组件工厂的额外配置</td></tr>
            <tr><td>options</td><td>{ key, value }[]</td><td>用于 select / selector / switcher 的选项列表</td></tr>
            <tr><td>placeholder</td><td>string</td><td>占位符</td></tr>
            <tr><td>defaultValue</td><td>any</td><td>默认值</td></tr>
            <tr><td>required</td><td>boolean</td><td>是否必填</td></tr>
            <tr><td>validation</td><td>object</td><td>HTML5 校验规则 { pattern, message }</td></tr>
        </table>

        <h3 class="mt-4">静态方法：注册组件</h3>
        <pre><code>FormBuilder.registerWidget(name, factory)</code></pre>
        <p class="text-sm mb-2">注册一个可在 schema 中通过 <code>widgetName</code> 使用的自定义组件。</p>
        <table class="api-table">
            <tr><th>参数</th><th>类型</th><th>说明</th></tr>
            <tr><td>name</td><td>string</td><td>组件名称，对应 schema 中的 <code>widgetName</code></td></tr>
            <tr><td>factory</td><td>(container, field, onChange) => WidgetInstance</td>
                <td>组件工厂函数，接收挂载容器、字段配置、值变化回调。<br>
                    返回对象包含 <code>setValue</code>、<code>getValue</code>、<code>destroy</code> 方法。</td></tr>
        </table>

        <h3 class="mt-4">实例方法</h3>
        <table class="api-table">
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td>build()</td><td>生成表单 DOM 元素（含提交按钮），可直接插入容器</td></tr>
        </table>

        <h3 class="mt-4">行为说明</h3>
        <ul class="list-disc ml-6 text-sm">
            <li>所有控件值会自动同步至隐藏的 <code>&lt;input&gt;</code>，确保表单提交能正确收集数据。</li>
            <li>注册的组件通过工厂模式与表单耦合，数据变更自动写入隐藏域。</li>
            <li>预置的 <b>Toggle</b>、<b>Selector</b>、<b>Switcher</b> 均可通过注册后直接使用。</li>
        </ul>
    `;
    const demo = `<div id="formbuilderTabs" class="mt-4"></div>`;
    return renderSection('📋 FormBuilder 表单构建器', '基于 schema 生成表单，支持注册任意组件（Toggle / Selector / Switcher 等）。', api, demo);
}

function initFormBuilder() {
    const container = document.getElementById('formbuilderTabs');
    if (!container) return;

    // 效果面板
    const effectDiv = document.createElement('div');
    effectDiv.innerHTML = `
        <div id="formDemo" class="max-w-md"></div>
        <div id="formResult" class="mt-3 text-sm font-mono whitespace-pre-wrap"></div>
    `;

    // 代码面板
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<pre><code class="language-javascript">${escapeHTML(`
// ---------- 注册常用组件 ----------
FormBuilder.registerWidget('toggle', (container, field, onChange) => {
    const toggle = new junkman.Toggle({
        container: container,
        size: 'sm',
        checked: field.defaultValue ?? false,
        onChange: (checked) => onChange(checked)
    });
    return {
        setValue: (val) => toggle.setValue(val),
        getValue: () => toggle.getValue(),
        destroy: () => toggle.destroy()
    };
});

FormBuilder.registerWidget('selector', (container, field, onChange) => {
    const data = {};
    if (field.options) {
        field.options.forEach(opt => { data[opt.value] = String(opt.key); });
    }
    const multiple = field.widgetOptions?.multiple ?? false;
    const selector = new junkman.Selector(container, data, {
        limit: multiple ? 0 : 1,
        placeholder: field.placeholder || '请选择',
        searchOff: true,
        trigger: (d) => onChange(d.select)
    });
    selector.selected([String(field.defaultValue || '')]).make();
    return {
        setValue: (val) => selector.selected(Array.isArray(val) ? val : [val]),
        getValue: () => selector.selectData,
        destroy: () => selector.destroy()
    };
});

FormBuilder.registerWidget('switcher', (container, field, onChange) => {
    const data = {};
    if (field.options) {
        field.options.forEach(opt => { data[opt.value] = String(opt.key); });
    }
    const towards = field.widgetOptions?.towards ?? 0; // Horizontal
    const switcher = new junkman.Switcher(container, data, {
        limit: 1,
        towards: towards,
        trigger: (d) => onChange(d.select[0])
    });
    switcher.selected([String(field.defaultValue || '')]).make();
    return {
        setValue: (val) => switcher.selected([val]),
        getValue: () => switcher.selectData[0],
        destroy: () => switcher.destroy()
    };
});

// ---------- 构建表单 ----------
const schema = [
    { name: 'username', label: '用户名', type: 'text', required: true, placeholder: '请输入用户名' },
    { name: 'enabled', label: '启用状态', type: 'widget', widgetName: 'toggle', defaultValue: true },
    {
        name: 'city',
        label: '所在城市',
        type: 'widget',
        widgetName: 'selector',
        options: [
            { key: 'bj', value: '北京' },
            { key: 'sh', value: '上海' },
            { key: 'gz', value: '广州' }
        ],
        defaultValue: 'bj',
        widgetOptions: { multiple: false }
    },
    {
        name: 'gender',
        label: '性别',
        type: 'widget',
        widgetName: 'switcher',
        options: [
            { key: 'male', value: '男' },
            { key: 'female', value: '女' }
        ],
        defaultValue: 'male',
        widgetOptions: { towards: 0 }
    }
];

const form = new FormBuilder(schema).build();
document.getElementById('formDemo').appendChild(form);
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    document.getElementById('formResult').textContent = '提交数据: ' + JSON.stringify(data, null, 2);
});
    `.trim())}</code></pre>`;

    new junkman.Tabs(container, {
        tabs: [
            { label: '效果', content: effectDiv },
            { label: '代码', content: codeDiv }
        ]
    });

    // ---------- 实际初始化 ----------
    const formDemo = effectDiv.querySelector('#formDemo');
    const resultEl = effectDiv.querySelector('#formResult');

    // 1. 注册组件（如果表单中要使用）
    if (typeof junkman.FormBuilder !== 'undefined') {
        // 注册 Toggle
        junkman.FormBuilder.registerWidget('toggle', (container, field, onChange) => {
            const toggle = new junkman.Toggle({
                container: container,
                size: 'sm',
                checked: field.defaultValue ?? false,
                onChange: (checked) => onChange(checked)
            });
            return {
                setValue: (val) => toggle.setValue(val),
                getValue: () => toggle.getValue(),
                destroy: () => toggle.destroy()
            };
        });

        // 注册 Selector
        junkman.FormBuilder.registerWidget('selector', (container, field, onChange) => {
            const data = {};
            if (field.options) {
                field.options.forEach(opt => { data[opt.value] = String(opt.key); });
            }
            const multiple = field.widgetOptions?.multiple ?? false;
            const selector = new junkman.Selector(container, data, {
                limit: multiple ? 0 : 1,
                placeholder: field.placeholder || '请选择',
                searchOff: true,
                trigger: (d) => onChange(d.select)
            });
            selector.selected([String(field.defaultValue || '')]).make();
            return {
                setValue: (val) => selector.selected(Array.isArray(val) ? val : [val]),
                getValue: () => selector.selectData,
                destroy: () => selector.destroy()
            };
        });

        // 注册 Switcher
        junkman.FormBuilder.registerWidget('switcher', (container, field, onChange) => {
            const data = {};
            if (field.options) {
                field.options.forEach(opt => { data[opt.value] = String(opt.key); });
            }
            const towards = field.widgetOptions?.towards ?? 0;
            const switcher = new junkman.Switcher(container, data, {
                limit: 1,
                towards: towards,
                trigger: (d) => onChange(d.select[0])
            });
            switcher.selected([String(field.defaultValue || '')]).make();
            return {
                setValue: (val) => switcher.selected([val]),
                getValue: () => switcher.selectData[0],
                destroy: () => switcher.destroy()
            };
        });

        // 2. 构建表单
        const schema = [
            { name: 'username', label: '用户名', type: 'text', required: true, placeholder: '请输入用户名' },
            { name: 'enabled', label: '启用状态', type: 'widget', widgetName: 'toggle', defaultValue: true },
            {
                name: 'city',
                label: '所在城市',
                type: 'widget',
                widgetName: 'selector',
                options: [
                    { key: 'bj', value: '北京' },
                    { key: 'sh', value: '上海' },
                    { key: 'gz', value: '广州' }
                ],
                defaultValue: 'bj',
                widgetOptions: { multiple: false }
            },
            {
                name: 'gender',
                label: '性别',
                type: 'widget',
                widgetName: 'switcher',
                options: [
                    { key: 'male', value: '男' },
                    { key: 'female', value: '女' }
                ],
                defaultValue: 'male',
                widgetOptions: { towards: 0 }
            }
        ];

        const form = new junkman.FormBuilder(schema).build();
        if (formDemo) formDemo.appendChild(form);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {};
            formData.forEach((value, key) => { data[key] = value; });
            if (resultEl) resultEl.textContent = '提交数据: ' + JSON.stringify(data, null, 2);
        });
    } else {
        if (formDemo) formDemo.innerHTML = '<p class="text-error">FormBuilder 组件未加载</p>';
    }
}