export interface FormFieldSchema {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'widget';   // 新增 widget
    required?: boolean;
    placeholder?: string;
    options?: { key: string | number; value: string }[];
    defaultValue?: any;
    validation?: {
        pattern?: string;
        message?: string;
    };
    // 自定义组件配置
    widgetName?: string;            // 注册的组件名称
    widgetOptions?: Record<string, any>;  // 传递给工厂的额外参数
}

/** 组件工厂函数的返回值 */
export interface WidgetInstance {
    /** 设置当前值 */
    setValue?: (value: any) => void;
    /** 获取当前值 */
    getValue?: () => any;
    /** 销毁组件 */
    destroy?: () => void;
}