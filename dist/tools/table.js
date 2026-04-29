function renderTable() {
    const api = `<pre><code>new junkman.Table(selector, columns, options)</code></pre>
      <h3>Column 类型</h3><p>支持 text, input, select, switcher 等。</p>`;
    const demo = `<div id="tableDemo"></div><button id="getTableDataBtn" class="btn btn-sm btn-outline mt-2">获取表格数据</button>`;
    return renderSection('📊 Table 可编辑表格', '内联编辑、排序、批量操作。', api, demo);
}

function initTable() {
    const container = document.getElementById('tableDemo');
    if (!container) return;

    const columns = [
        { name: "ID", field: "id", type: "text", width: "60px", pinned: "left" },
        { name: "姓名", field: "name", type: "input", editable: true, width: "120px" },
        { name: "邮箱", field: "email", type: "email", editable: true, width: "180px", config: { icon: "📧" } },
        { name: "城市", field: "city", type: "selector", editable: true, width: "180px",
            options: { list: [
                    { key: "京", value: "北京" },
                    { key: "沪", value: "上海" },
                    { key: "粤", value: "广州" },
                    { key: "深", value: "深圳" }
                ]}
        },
        { name: "状态", field: "status", type: "switcher", editable: true, width: "140px",
            options: { list: [
                    { key: "1", value: "启用" },
                    { key: "0", value: "禁用" }
                ]},
            config: { towards: "right" }
        },
        { name: "手机号", field: "phone", type: "input", editable: true, width: "140px" },
        { name: "创建时间", field: "created", type: "datetime-local", editable: true, width: "180px" },
        { name: "个人简介", field: "bio", type: "textarea", editable: true, width: "200px" },
        { name: "个人网站", field: "website", type: "url", editable: true, width: "200px" },
        { name: "头像", field: "avatar", type: "image", delay: false, width: "80px" },
        { name: "备注", field: "note", type: "text", width: "200px" },
        { name: "操作", field: "actions", type: "html", width: "80px" }  // 额外列制造横向滚动
    ];

    const table = new junkman.Table(container, columns, {
        sortable: true,
        deletable: true,
        maxHeight: "500px",   // 固定高度以出现纵向滚动条
        showBatchBar: true,
        onDataChange: (data) => console.log('数据变更:', data)
    });

    // 生成 60 条随机数据，字段值足够长以撑开宽度和高度
    const demoData = [];
    const cities = ["京", "沪", "粤", "深"];
    const statuses = ["1", "0"];
    const names = ["张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十", "小明", "小红"];
    for (let i = 1; i <= 60; i++) {
        const idx = i % names.length;
        demoData.push({
            id: i,
            name: names[idx] + i,
            email: `user${i}@example${i}.com`,
            city: cities[i % cities.length],
            status: statuses[i % 2],
            phone: `138${String(i).padStart(8, '0')}`,
            created: `2026-04-${String((i % 30) + 1).padStart(2, '0')}T10:00`,
            bio: `这是${names[idx]}的个人简介，编号${i}。`.repeat(3 + (i % 3)),
            website: `https://www.${names[idx].toLowerCase()}.com/page/${i}`,
            avatar: `https://picsum.photos/40/40?random=${i}`,
            note: `备注信息第${i}条：这是一个比较长的备注，用来测试横向滚动效果。`,
            actions: `<button class="btn btn-xs btn-info">详情</button>`
        });
    }
    table.loadData(demoData);

    // 获取数据按钮
    document.getElementById('getTableDataBtn')?.addEventListener('click', () =>
        alert(JSON.stringify(table.getData(), null, 2))
    );
}