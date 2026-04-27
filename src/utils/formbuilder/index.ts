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
            case 'select':
                input = document.createElement('select');
                input.className = 'select select-bordered select-sm w-full';
                if (field.options) {
                    for (const opt of field.options) {
                        const option = document.createElement('option');
                        option.value = String(opt.key);
                        option.textContent = opt.value;
                        input.appendChild(option);
                    }
                }
                break;
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