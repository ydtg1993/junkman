// src/utils/selector/switcher.ts
import { Selector } from "./index";
import { SELECTOR_MODE, SELECTOR_TOWARDS, SelectorInterface } from "./init";
import { createDOMFromTree } from "../../aid/dombuilder";

export class Switcher extends Selector implements SelectorInterface {
    private _buildOptions(): {}[] {
        let tree = [];
        let line = 0;
        let select = this.select;
        const optionClass = 'btn btn-sm'; // 统一使用按钮样式
        for (let name in select) {
            if (!select.hasOwnProperty(name)) continue;
            this.value_line_hash[select[name]] = line;
            line++;
            tree.push({
                attributes: { 'data-name': name, 'data-value': select[name] },
                className: optionClass,
                textContent: name,
                events: {
                    click: (e: Event, option: HTMLElement) => {
                        if (this.selectData.indexOf(select[name]) !== -1) {
                            // cancel
                            this._tagCal(select[name], SELECTOR_MODE.Delete);
                            option.classList.remove('btn-active');
                            return;
                        }
                        this._tagCal(select[name], SELECTOR_MODE.Insert);
                        // 处理限制数量
                        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                            this.triggerEvent.enable = false;
                            let index = this.value_line_hash[this.selectData[0].toString()] + 1;
                            let popOpt = this.parentNode.querySelector(
                                `.${this.towards === SELECTOR_TOWARDS.Vertical ? 'btn-group-vertical' : 'btn-group'}>button:nth-child(${index})`
                            );
                            if (popOpt instanceof HTMLElement) popOpt.click();
                            this.triggerEvent.enable = true;
                        }
                        option.classList.add('btn-active');
                    }
                }
            });
        }
        return tree;
    }

    make(): this {
        const isVertical = this.towards === SELECTOR_TOWARDS.Vertical;
        const containerClass = isVertical ? 'btn-group btn-group-vertical' : 'btn-group';

        let domTree = {
            className: containerClass,
            nodes: this._buildOptions()
        };

        createDOMFromTree(domTree, this.parentNode);

        (async () => {
            this.delayExec();
        })();
        return this;
    }
}