export interface FormFieldSchema {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'hidden';
    required?: boolean;
    placeholder?: string;
    options?: { key: string | number; value: string }[]; // for select
    defaultValue?: any;
    validation?: {
        pattern?: string;
        message?: string;
    };
}