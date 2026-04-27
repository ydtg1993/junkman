import { generateUniqueString } from "../../aid/random";
import { request } from "../../aid/request";

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

    // 资源管理
    private controller: AbortController = new AbortController();
    private timeoutTimer: number | null = null;
    private xhrAbortController: AbortController | null = null;

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
        const body = this.DOM?.querySelector('.modal-body') as HTMLElement;
        if (body) {
            body.innerHTML = '';
            body.appendChild(document.createRange().createContextualFragment(response));
        }
    }

    /**
     * 关闭模态框，释放所有事件和定时器
     */
    public close() {
        // 取消所有通过 AbortController 绑定的事件
        this.controller.abort();

        // 清除超时定时器
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }

        // 取消正在进行的 XHR 请求
        if (this.xhrAbortController) {
            this.xhrAbortController.abort();
            this.xhrAbortController = null;
        }

        // 移除 DOM（如果仍然挂载在父节点中）
        if (this.DOM && this.DOM.parentNode) {
            // 注意：parentNode 可能不是 this.parentNode（如果调用过 setLinkContent 等不会有影响）
            this.DOM.parentNode.removeChild(this.DOM);
        }

        // 重置 AbortController 以便可能再次 make() 复用（需手动再次 make）
        this.controller = new AbortController();
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

    /**
     * 绑定表单提交处理器（不再强制要求 xhr）
     */
    public bindSubmit(onSubmit: (formData: FormData) => Promise<void>) {
        this.submitHandler = onSubmit;
        return this;
    }

    make() {
        // 确保之前的资源被清理
        this.controller.abort();
        this.controller = new AbortController();

        // ----- 遮罩层 -----
        const overlay = document.createElement('div');
        overlay.className = 'modal modal-open';
        overlay.setAttribute('unique', this.unique);
        this.DOM = overlay;

        // ----- 内容盒子 -----
        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box relative';
        if (this.windowStyles.width) modalBox.style.width = this.windowStyles.width;
        if (this.windowStyles.height) modalBox.style.height = this.windowStyles.height;

        // ----- 关闭按钮（使用 AbortController 绑定）-----
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-sm btn-circle absolute right-2 top-2';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', () => this.close(), { signal: this.controller.signal });
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
        this.parentNode.appendChild(overlay);

        // ----- 点击背景关闭 -----
        if (this.gauze) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close();
            }, { signal: this.controller.signal });
        }

        // ----- 超时关闭 -----
        if (this.timeout > 0) {
            this.timeoutTimer = window.setTimeout(() => this.close(), this.timeout * 1000);
        }

        // ----- 远程内容加载（支持取消）-----
        if (this.xhr) {
            body.innerHTML = '<div class="flex justify-center items-center h-24"><span class="loading loading-spinner loading-lg"></span></div>';

            // 创建可取消的请求
            const abortController = new AbortController();
            this.xhrAbortController = abortController;

            request({
                url: this.xhr.url,
                method: this.xhr.method || 'GET',
                data: this.xhr.data || {},
                signal: abortController.signal,
            })
                .then((resp: any) => {
                    // 如果模态框已被关闭，则不再更新 DOM
                    if (!this.DOM || !this.DOM.parentNode) return;

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
                        if (el) {
                            el.addEventListener(ev.event, (e) => ev.handler(e, el), { signal: this.controller.signal });
                        }
                    }
                })
                .catch((err) => {
                    // 如果是主动取消，不显示错误
                    if (err?.name === 'AbortError' || err?.message === 'Request cancelled') return;
                    if (this.DOM && this.DOM.parentNode) {
                        body.innerHTML = '<div class="flex justify-center items-center h-24 text-error">加载失败</div>';
                    }
                })
                .finally(() => {
                    this.xhrAbortController = null;
                });
        }

        // 绑定延迟事件（初次，静态内容）
        for (const ev of this.delayedEvents) {
            const el = this.DOM.querySelector(ev.selector);
            if (el) {
                el.addEventListener(ev.event, (e) => ev.handler(e, el), { signal: this.controller.signal });
            }
        }

        // ----- 表单提交处理（不再依赖 xhr）-----
        if (this.submitHandler) {
            const form = this.DOM.querySelector('form') as HTMLFormElement;
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    await this.submitHandler!(formData);
                }, { signal: this.controller.signal });
            }
        }
    }

    /**
     * 销毁模态框（等同于 close，但强调彻底清理）
     */
    public destroy() {
        this.close();
    }
}