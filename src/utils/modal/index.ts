import { createDOMFromTree } from "../../aid/dombuilder";
import { generateUniqueString } from "../../aid/random";
import { request } from "../../aid/request";
import { Icon } from "../../aid/icon";

export class Modal {
    protected xhr: { url: string; method?: string; data?: any } | undefined;
    protected content: string | HTMLElement | undefined;
    protected DOM!: HTMLElement;
    protected title: string = '';
    protected windowStyles: {
        width?: string;
        height?: string;
    } = {
        width: '80%',
        height: '80%',
    };
    protected parentNode: HTMLElement = document.body;
    protected gauze: boolean = false;
    protected unique: string = '';
    protected timeout: number = -1;
    protected headerHidden: boolean = false;
    protected submitHandler?: (formData: FormData) => Promise<void>;
    protected delayedEvents: { selector: string; event: string; handler: Function }[] = [];

    constructor(options: {
        title?: string;
        aspect?: { width?: string; height?: string };
        position?: { x?: string; y?: string };
        gauze?: boolean;
        headerHidden?: boolean;
        timeout?: number;
        parentNode?: HTMLElement;
    }) {
        this.unique = generateUniqueString(10);
        if (options.title) this.title = options.title;
        if (options.gauze) this.gauze = options.gauze;
        if (options.timeout) this.timeout = options.timeout;
        if (options.headerHidden !== undefined) this.headerHidden = options.headerHidden;
        if (options.aspect) {
            if (options.aspect.width) this.windowStyles.width = options.aspect.width;
            if (options.aspect.height) this.windowStyles.height = options.aspect.height;
        }
        if (options.parentNode instanceof HTMLElement) {
            this.parentNode = options.parentNode;
        }
    }

    public setContent(content: any) {
        if (typeof content === 'string' || content instanceof HTMLElement) {
            this.content = content;
        } else {
            console.error('type of content error!');
        }
        return this;
    }

    public setLinkContent(response: string) {
        const body = this.DOM.querySelector('.modal-body') as HTMLElement;
        if (body) {
            body.innerHTML = '';
            body.appendChild(document.createRange().createContextualFragment(response));
        }
    }

    public close() {
        if (this.DOM && this.DOM.parentNode) {
            this.parentNode.removeChild(this.DOM);
        }
    }

    public bindEvent(selector: string, event: string, handler: Function) {
        this.delayedEvents.push({ selector, event, handler });
        return this;
    }

    public getNode() {
        return this.DOM;
    }

    public setUrl(url: string, method: string = 'GET', data?: any) {
        this.xhr = { url, method, data };
        return this;
    }

    public bindSubmit(selector: string, onSubmit: (formData: FormData) => Promise<void>) {
        this.submitHandler = onSubmit;
        return this;
    }

    make() {
        // ----- 遮罩层 -----
        const overlay = document.createElement('div');
        overlay.className = 'modal modal-open';
        overlay.setAttribute('unique', this.unique);

        // ----- 内容盒子 -----
        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box relative';
        if (this.windowStyles.width) modalBox.style.width = this.windowStyles.width;
        if (this.windowStyles.height) modalBox.style.height = this.windowStyles.height;

        // ----- 关闭按钮（角落）-----
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-sm btn-circle absolute right-2 top-2';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', () => this.close());
        modalBox.appendChild(closeBtn);

        // ----- 标题（可选）-----
        if (!this.headerHidden && this.title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'font-bold text-lg mb-4';
            titleEl.textContent = this.title;
            modalBox.appendChild(titleEl);
        }

        // ----- 主体内容区域 -----
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (this.content !== undefined) {
            if (typeof this.content === 'string') {
                body.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                body.appendChild(this.content);
            }
        }
        modalBox.appendChild(body);

        overlay.appendChild(modalBox);
        this.DOM = overlay;
        this.parentNode.appendChild(overlay);

        // ----- 点击背景关闭 -----
        if (this.gauze) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close();
            });
        }

        // ----- 超时关闭 -----
        if (this.timeout > 0) {
            setTimeout(() => this.close(), this.timeout * 1000);
        }

        // ----- 远程内容加载 -----
        if (this.xhr) {
            body.innerHTML = '<div class="flex justify-center items-center h-24"><span class="loading loading-spinner loading-lg"></span></div>';
            request({
                url: this.xhr.url,
                method: this.xhr.method || 'GET',
                data: this.xhr.data || {},
            })
                .then((resp: any) => {
                    body.innerHTML = '';
                    if (typeof resp === 'string') {
                        body.innerHTML = resp;
                    } else if (resp && resp.html) {
                        body.innerHTML = resp.html;
                    } else {
                        body.innerHTML = '<div class="text-error">内容格式错误</div>';
                    }
                    // 绑定延迟事件
                    for (const ev of this.delayedEvents) {
                        const el = this.DOM.querySelector(ev.selector);
                        if (el) el.addEventListener(ev.event, (e) => ev.handler(e, el));
                    }
                })
                .catch(() => {
                    body.innerHTML = '<div class="flex justify-center items-center h-24 text-error">加载失败</div>';
                });
        }

        // 绑定延迟事件（初次）
        for (const ev of this.delayedEvents) {
            const el = this.DOM.querySelector(ev.selector);
            if (el) el.addEventListener(ev.event, (e) => ev.handler(e, el));
        }

        // 绑定表单提交
        if (this.submitHandler && this.xhr) {
            const form = this.DOM.querySelector('form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    await this.submitHandler!(formData);
                });
            }
        }
    }
}