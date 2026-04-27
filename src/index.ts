// ──────────────────────── 基础工具 ────────────────────────
export { contextmenu } from './aid/contextmenu';
export { request } from './aid/request';
export { createDOMFromTree } from './aid/dombuilder';
export { Icon } from './aid/icon';
export { dimensionalTree } from './aid/tree';
export { GlobalEventManager } from './aid/eventmanager';

// ──────────────────────── 图片懒加载 ────────────────────────
export { imgDelay } from './aid/imgdelay';

// ──────────────────────── Toast 消息通知 ────────────────────────
export { Toast } from './utils/toast/index';

// ──────────────────────── Tabs 标签页 ────────────────────────
export { Tabs } from './utils/tabs/index';

// ──────────────────────── 选择器组件 ────────────────────────
import { Menu as MenuClass } from './utils/selector/menu';
import { Switcher as SwitcherClass } from './utils/selector/switcher';

export { SELECTOR_DIRECTION, SELECTOR_TOWARDS, SELECTOR_MODE } from './utils/selector/init';

// ──────────────────────── 模态框 ────────────────────────
export { Modal } from './utils/modal/index';

// ──────────────────────── 级联组件 ────────────────────────
export { CascadeSelector } from './utils/cascade';
export { CascadeTree } from './utils/cascade/tree';

// ──────────────────────── 表格 ────────────────────────
export { EditableTable } from './utils/table';

// ──────────────────────── 表单构建器 ────────────────────────
export { FormBuilder } from './utils/formbuilder/index';

// ──────────────────────── 拖拽排序 ────────────────────────
export { Sortable } from './utils/sortable';

// ──────────────────────── 分页器 ────────────────────────
export { Paginator } from './utils/selector/paginator';

// ──────────────────────── 兼容性命名空间 ────────────────────────
export const selector = {
    Menu: MenuClass,
    Switcher: SwitcherClass,
};

// ──────────────────────── 类型导出 ────────────────────────
export { ToastPosition } from './utils/toast/index';
export type { ToastOptions, ToastType } from './utils/toast/index';
export type { TabItem, TabsOptions } from './utils/tabs/index';
export type { TreeNode, FlattenedNode } from './aid/tree';
export type { ContextMenuItem, ContextMenuOptions } from './aid/contextmenu';
export type { RequestOptions, RequestError } from './aid/request';
export type { FormFieldSchema } from './utils/formbuilder/types';
export type { CascadeOptions, CascadeTreeOptions } from './utils/cascade/types';
export type { Column, TableOptions } from './utils/table/index';
export type { SortableOptions } from './utils/sortable/index';
export type { PaginatorOptions } from './utils/selector/paginator';
export type { ImgDelayOptions } from './aid/imgdelay';