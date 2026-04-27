// ============================================================
// Junkman 组件库 - 统一入口
// 本文件负责导出所有工具函数、UI 组件、枚举及 TypeScript 类型
// ============================================================

// ============================================================
// 📌 基础工具
// ============================================================

/** 右键菜单（contextmenu） */
export { contextmenu } from './aid/contextmenu';

/** 通用网络请求（request） */
export { request } from './aid/request';

/** 通过对象树快速创建 DOM（createDOMFromTree） */
export { createDOMFromTree } from './aid/dombuilder';

/** 内置 SVG 图标集合（Icon） */
export { Icon } from './aid/icon';

/** 树形数据展平工具（dimensionalTree） */
export { dimensionalTree } from './aid/tree';

/** 全局事件管理器（GlobalEventManager），用于统一管理事件并支持一次性清理 */
export { GlobalEventManager } from './aid/eventmanager';

// ============================================================
// 🖼️ 图片懒加载
// ============================================================

/** 图片延迟加载与悬停预览（imgDelay） */
export { imgDelay } from './aid/imgdelay';

// ============================================================
// 🔔 Toast 消息通知
// ============================================================

/** 消息通知组件（Toast） */
export { Toast } from './utils/toast/index';

// 注意：ToastPosition 是枚举值，需要作为值导出（不能只用 export type）
export { ToastPosition } from './utils/toast/index';

// ============================================================
// 📑 Tabs 标签页
// ============================================================

/** 标签页组件（Tabs），支持静态/异步内容、懒加载 */
export { Tabs } from './utils/tabs/index';

// ============================================================
// 📋 选择器组件
// ============================================================

// 由于 Menu 和 Switcher 需要通过命名空间向外暴露，这里先导入再使用
import { Menu as MenuClass } from './utils/selector/menu';
import { Switcher as SwitcherClass } from './utils/selector/switcher';

/** 选择器相关枚举（方向、朝向、模式） */
export { SELECTOR_DIRECTION, SELECTOR_TOWARDS, SELECTOR_MODE } from './utils/selector/init';

// ============================================================
// 🪟 模态框
// ============================================================

/** 模态框组件（Modal），支持远程加载、表单提交、自动清理 */
export { Modal } from './utils/modal/index';

// ============================================================
// 🌲 级联组件
// ============================================================

/** 级联选择器（CascadeSelector），支持搜索、多选、懒加载 */
export { CascadeSelector } from './utils/cascade';

/** 树形管理器（CascadeTree），支持右键菜单增删改查、拖拽排序、懒加载 */
export { CascadeTree } from './utils/cascade/tree';

// ============================================================
// 📊 表格
// ============================================================

/** 可编辑表格（EditableTable），支持内联编辑、拖拽排序、批量操作 */
export { EditableTable } from './utils/table';

// ============================================================
// 📝 表单构建器
// ============================================================

/** 表单构建器（FormBuilder），通过 Schema 快速生成表单 */
export { FormBuilder } from './utils/formbuilder/index';

// ============================================================
// 🧲 拖拽排序
// ============================================================

/** 独立列表拖拽排序（Sortable） */
export { Sortable } from './utils/sortable';

// ============================================================
// 📄 分页器
// ============================================================

/** 分页器（Paginator），支持跳转、每页条数切换 */
export { Paginator } from './utils/selector/paginator';

// ============================================================
// 🗂️ 侧边栏文档布局（SidebarTabs）
// ============================================================

/** 侧边栏导航 + 内容切换组件（SidebarTabs），常用于文档或配置页面 */
export { SidebarTabs } from './utils/sidebartabs/index';

// ============================================================
// 📦 兼容性命名空间（保留旧的 selector 对象写法）
// ============================================================
export const selector = {
    Menu: MenuClass,
    Switcher: SwitcherClass,
};

// ============================================================
// 🏷️ TypeScript 类型导出
// ============================================================

/** Toast 相关类型 */
export type { ToastOptions, ToastType } from './utils/toast/index';

/** Tabs 相关类型 */
export type { TabItem, TabsOptions } from './utils/tabs/index';

/** SidebarTabs 相关类型 */
export type { SidebarTabItem, SidebarTabsOptions } from './utils/sidebartabs/index';

/** 树形数据结构类型 */
export type { TreeNode, FlattenedNode } from './aid/tree';

/** 右键菜单类型 */
export type { ContextMenuItem, ContextMenuOptions } from './aid/contextmenu';

/** 网络请求相关类型 */
export type { RequestOptions, RequestError } from './aid/request';

/** 表单构建器字段类型 */
export type { FormFieldSchema } from './utils/formbuilder/types';

/** 级联选择器 / 树形管理器配置类型 */
export type { CascadeOptions, CascadeTreeOptions } from './utils/cascade/types';

/** 表格列与选项类型 */
export type { Column, TableOptions } from './utils/table/index';

/** 拖拽排序选项类型 */
export type { SortableOptions } from './utils/sortable/index';

/** 分页器配置类型 */
export type { PaginatorOptions } from './utils/selector/paginator';

/** 图片延迟加载选项类型 */
export type { ImgDelayOptions } from './aid/imgdelay';