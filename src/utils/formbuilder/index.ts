import { FormFieldSchema } from './types';

export class FormBuilder {
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
                // ---------- 隐藏的原生 <select>（用于表单验证与值收集）----------
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

                // ---------- 构建 DaisyUI Dropdown 结构 ----------
                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown dropdown-bottom w-full';

                const triggerBtn = document.createElement('button');
                triggerBtn.type = 'button';
                triggerBtn.className = 'btn btn-sm btn-outline w-full justify-between';

                // 更新按钮显示文本
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
                            // 更新隐藏 select 的值
                            hiddenSelect.value = String(opt.key);
                            // 触发 change 事件（便于外部监听）
                            hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            // 刷新按钮文本
                            refreshButtonText();
                            // 关闭下拉菜单
                            dropdown.classList.remove('dropdown-open');
                        });
                        li.appendChild(a);
                        menu.appendChild(li);
                    }
                }

                // 按钮点击切换下拉
                triggerBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdown.classList.toggle('dropdown-open');
                });

                // 点击外部关闭下拉
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target as Node)) {
                        dropdown.classList.remove('dropdown-open');
                    }
                });

                dropdown.appendChild(triggerBtn);
                dropdown.appendChild(menu);

                wrapper.appendChild(hiddenSelect);
                wrapper.appendChild(dropdown);
                return wrapper; // 直接返回，无需执行后续通用添加
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