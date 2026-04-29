import { FormFieldSchema, WidgetInstance } from './types';

export class FormBuilder {
    // 组件注册表
    private static widgets = new Map<string, (container: HTMLElement, field: FormFieldSchema, onChange: (value: any) => void) => WidgetInstance>();

    /**
     * 注册一个自定义组件
     * @param name 组件名称（schema 中 widgetName 对应的值）
     * @param factory 组件工厂函数。接收容器、字段配置、值变化回调，需返回一个包含 setValue/getValue/destroy 的对象
     */
    public static registerWidget(
        name: string,
        factory: (container: HTMLElement, field: FormFieldSchema, onChange: (value: any) => void) => WidgetInstance
    ) {
        FormBuilder.widgets.set(name, factory);
    }

    constructor(private schema: FormFieldSchema[]) {}

    public build(): HTMLElement {
        const form = document.createElement('form');
        form.className = 'flex flex-col gap-2';
        for (const field of this.schema) {
            form.appendChild(this.createField(field));
        }
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'btn btn-sm btn-primary mt-2';
        submit.textContent = '确认';
        form.appendChild(submit);
        return form;
    }

    private createField(field: FormFieldSchema): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-control';
        const label = document.createElement('label');
        label.className = 'label';
        label.textContent = field.label;
        wrapper.appendChild(label);

        // ----- 自定义组件处理 -----
        if (field.type === 'widget' && field.widgetName && FormBuilder.widgets.has(field.widgetName)) {
            const factory = FormBuilder.widgets.get(field.widgetName)!;
            const container = document.createElement('div');
            // 创建隐藏 input，用于表单提交
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = field.name;
            if (field.defaultValue !== undefined) {
                hiddenInput.value = String(field.defaultValue);
            }
            if (field.required) hiddenInput.required = true;
            wrapper.appendChild(hiddenInput);

            // 调用工厂函数
            const instance = factory(container, field, (newValue) => {
                hiddenInput.value = String(newValue);
                // 触发原生 change 事件，方便外部监听
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // 初始化默认值
            if (field.defaultValue !== undefined && instance.setValue) {
                instance.setValue(field.defaultValue);
            }

            wrapper.appendChild(container);
            // 存储实例以便销毁（可选，这里不强制清理，由外部管理）
            return wrapper;
        }

        // ----- 原生控件处理（保持不变） -----
        let input: HTMLElement;
        switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
                input = document.createElement('input');
                (input as HTMLInputElement).type = field.type;
                (input as HTMLInputElement).className = 'input input-bordered input-sm w-full';
                if (field.required) (input as HTMLInputElement).required = true;
                if (field.placeholder) (input as HTMLInputElement).placeholder = field.placeholder;
                if (field.defaultValue !== undefined) (input as HTMLInputElement).value = field.defaultValue;
                break;
            case 'textarea':
                input = document.createElement('textarea');
                input.className = 'textarea textarea-bordered textarea-sm w-full';
                if (field.defaultValue) input.textContent = field.defaultValue;
                break;
            case 'select': {
                // ...原有 select 实现（保持原样）...
                const hiddenSelect = document.createElement('select');
                hiddenSelect.className = 'absolute w-0 h-0 opacity-0 -z-10';
                if (field.name) hiddenSelect.name = field.name;
                if (field.required) hiddenSelect.required = true;
                if (field.placeholder) {
                    const placeholderOpt = document.createElement('option');
                    placeholderOpt.value = '';
                    placeholderOpt.textContent = field.placeholder;
                    placeholderOpt.disabled = true;
                    placeholderOpt.selected = true;
                    hiddenSelect.appendChild(placeholderOpt);
                }
                if (field.options) {
                    for (const opt of field.options) {
                        const option = document.createElement('option');
                        option.value = String(opt.key);
                        option.textContent = opt.value;
                        if (field.defaultValue !== undefined && String(opt.key) === String(field.defaultValue)) {
                            option.selected = true;
                        }
                        hiddenSelect.appendChild(option);
                    }
                }
                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown dropdown-bottom w-full';
                const triggerBtn = document.createElement('button');
                triggerBtn.type = 'button';
                triggerBtn.className = 'btn btn-sm btn-outline w-full justify-between';
                const refreshButtonText = () => {
                    const selectedVal = hiddenSelect.value;
                    const selectedOption = field.options?.find(o => String(o.key) === selectedVal);
                    triggerBtn.innerHTML = `${selectedOption?.value || field.placeholder || '请选择'} <span class="text-xs">▼</span>`;
                };
                refreshButtonText();
                const menu = document.createElement('ul');
                menu.className = 'dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full z-50';
                menu.style.maxHeight = '200px';
                menu.style.overflowY = 'auto';
                if (field.options) {
                    for (const opt of field.options) {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.textContent = opt.value;
                        a.addEventListener('click', (e) => {
                            e.preventDefault();
                            hiddenSelect.value = String(opt.key);
                            hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            refreshButtonText();
                            dropdown.classList.remove('dropdown-open');
                        });
                        li.appendChild(a);
                        menu.appendChild(li);
                    }
                }
                triggerBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdown.classList.toggle('dropdown-open');
                });
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target as Node)) {
                        dropdown.classList.remove('dropdown-open');
                    }
                });
                dropdown.appendChild(triggerBtn);
                dropdown.appendChild(menu);
                wrapper.appendChild(hiddenSelect);
                wrapper.appendChild(dropdown);
                return wrapper;
            }
            case 'checkbox':
                input = document.createElement('input');
                (input as HTMLInputElement).type = 'checkbox';
                input.className = 'checkbox checkbox-sm';
                if (field.defaultValue) (input as HTMLInputElement).checked = true;
                break;
            default:
                input = document.createElement('input');
                input.className = 'input input-bordered input-sm w-full';
        }

        if (field.name) input.setAttribute('name', field.name);
        if (field.validation?.pattern) {
            input.setAttribute('pattern', field.validation.pattern);
            if (field.validation.message) input.setAttribute('title', field.validation.message);
        }
        wrapper.appendChild(input);
        return wrapper;
    }
}