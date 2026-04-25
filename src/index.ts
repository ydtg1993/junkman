import {contextmenu} from './aid/contextmenu';
import {request} from './aid/request';
import {createDOMFromTree} from './aid/dombuilder'
import {imgDelay} from "./aid/imgdelay";
import {Icon} from "./aid/icon";
import {Menu} from './utils/selector/menu';
import {SELECTOR_DIRECTION,SELECTOR_TOWARDS,SELECTOR_MODE} from './utils/selector/init'
import {Switcher} from "./utils/selector/switcher";
import {Modal} from "./utils/modal/index";
import { CascadeSelector } from './utils/cascade';
import { CascadeTree } from './utils/cascade/tree';
import { EditableTable } from './utils/table';
import { Sortable } from './utils/sortable';
import { Paginator } from './utils/selector/paginator';
import { dimensionalTree } from './aid/tree';

const selector = {
    /**
     * @class Menu
     * @param dom   type:HTMLDocument   description: bind parent node
     * @param select    type:{key:value,...}    description: select options data
     *
     * @function limit(num:int)     description: preset selected options limit number
     * @function selected(params)   params:[value,...]
     * @function settings(params)   description: preset menu select placeholder,options max height, options popup direction
     *      params: {
     *          placeholder:string,
     *          height:string,
     *          direction:junkman.SELECTOR_DIRECTION
     *     }
     * @function useHiddenInput(name:string)    description: use hidden input save data
     * @function trigger    description: preset callback function in the event on click option
     *      callback: (data)=>{
     *          data.value      description: current selected value
     *          data.operate    description: insert or delete
     *          data.select     description: selected options
     *          data.insert     description: selected options except beginning selected
     *          data.delete     description: deleted from the beginning selected
     *      }
     * @function make   description: :build document
     */
    Menu: Menu,

    Switcher:Switcher,
};

// 基础工具
export { request, contextmenu, createDOMFromTree, imgDelay, Icon, dimensionalTree };
// 模态框
export { Modal };
// 选择器组件
export { selector, SELECTOR_DIRECTION, SELECTOR_TOWARDS, SELECTOR_MODE };
export { Menu, Switcher };
// 级联组件
export { CascadeSelector, CascadeTree };
// 表格组件
export { EditableTable };
// 拖拽排序
export { Sortable };
// 分页器
export { Paginator };