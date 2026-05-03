# Junkman

基于 **TypeScript + Tailwind CSS + DaisyUI** 的前端组件库，提供丰富的 UI 组件和工具函数。  
支持选择器、级联选择器、树形管理器、可编辑表格、拖拽排序、模态框、表单构建器等常用 Web 界面构件。  
打包为 **UMD** 格式，可通过 `<script>` 标签直接使用，也可作为 ES 模块导入。
适合非组件化架构
在传统多页应用、或者正在向现代前端过渡的项目中，命令式 API 比声明式组件更容易集成，不会破坏现有代码结构。

- “daisyUI 的 JS 伴侣” 让 daisyUI 从纯视觉库，升级为可直接调用的功能组件库，而不改变原有的样式体系。

- 极低的调用成本一行代码创建复杂的交互组件，无需预先写 DOM、处理状态、处理无障碍，适合快速开发和动态场景。

- 框架零依赖，普适性极强 传统 Web 项目、Laravel/Rails 的模板、Alpine.js 增强页、甚至简单的 .html 文件，都能直接使用，不需要投入 React/Vue 整个生态。

- 主题化天然无缝 因为底层就是 daisyUI 的类名组合，你项目里用到的所有主题、设计令牌，弹窗/抽屉/通知等都会自动匹配，不会出现“通知组件样式跟不上项目主题”的问题。

## ✨ 特性

- 🧩 **丰富的组件**：右键菜单、级联选择器、多选下拉、开关切换、分页器、表格、拖拽排序、模态框……
- 🎨 **基于 DaisyUI**：继承优秀的 UI 设计，支持主题切换（暗黑/明亮）。
- 🚀 **TypeScript 支持**：完整的类型定义，提高开发体验。
- 🛡️ **资源管理**：所有组件提供 `destroy()` 方法，自动清理事件与 DOM，避免内存泄漏。
- 📦 **零框架依赖**：纯原生 JavaScript 实现，兼容任何前端技术栈。
- 📚 **完善的文档 & 交互式 Demo**：开箱即用的 HTML 页面，可预览所有组件并查看 API 说明。

## [在线演示文档](https://es-d-3504472620260430-019dd58f-dd5c-7794-a6b3-f68861625efe.codepen.dev/)

### 🚀 安装与使用

```
# 安装依赖
npm install

# 构建 CSS（Tailwind + DaisyUI）
npm run build:css

# 构建 JavaScript（Rollup + TypeScript）
npm run build

# 开启开发服务器（可选）
npm run dev
```

> 打包产物：dist/junkman.js 和 dist/junkman.css

### 直接引入打包文件

```html
<!DOCTYPE html>
<html>
<head>
  <link href="./junkman.css" rel="stylesheet">
</head>
<body>
  <div id="app"></div>
  <script src="./junkman.js"></script>
  <script>
    // 全局变量 junkman
    const { contextmenu, Modal, CascadeSelector } = junkman;

    contextmenu(document.querySelectorAll('.box'), [
      { title: '复制', func: () => alert('已复制') }
    ]);

    const modal = new Modal({ title: '提示' });
    modal.setContent('<p>Hello Junkman!</p>');
    modal.make();
  </script>
</html>
```

### 📖 交互式文档

> 项目包含一个完整的 dist/index.html（基于 DaisyUI 样式），左侧导航选择组件，右侧展示说明、参数表格和可交互的演示。
