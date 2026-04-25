import { createDOMFromTree } from "../../aid/dombuilder";
import { generateUniqueString } from "../../aid/random";
import { request } from "../../aid/request";
import { Icon } from "../../aid/icon";

export class Modal {
    protected xhr: { url: string; method?: string; data?: any; callback?: () => void } | undefined;
    protected content: string | HTMLElement | undefined;
    protected DOM!: HTMLElement;
    protected title: string = '';
    protected windowStyles: {
        width?: any;
        height?: any;
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    } = {
        width: '80%',
        height: '80%',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto',
    };
    protected parentNode: HTMLElement = document.body;
    protected fullscreen: boolean = false;
    protected gauze: boolean = false;
    protected unique: string = '';
    protected timeout: number = -1;
    protected headerHidden: boolean = false;
    protected enlarge: boolean = false;
    protected submitHandler?: (formData: FormData) => Promise<void>;
    protected delayedEvents: { selector: string; event: string; handler: Function }[] = [];
    protected window_position_auto = [true, true];
    private closeTimer: number | null = null;
    private resizeHandler: (() => void) | null = null;

    constructor(options: {
        title?: string;
        aspect?: { width?: string; height?: string };
        position: { x?: string; y?: string };
        fullscreen?: boolean;
        close?: boolean;
        gauze?: boolean;
        headerHidden?: boolean;
        timeout?: number;
        zIndex?: number;
        parentNode?: HTMLElement;
    }) {
        this.unique = generateUniqueString(10);
        if (options.title) this.title = options.title;
        if (options.gauze) this.gauze = options.gauze;
        if (options.fullscreen) this.fullscreen = options.fullscreen;
        if (options.timeout) this.timeout = options.timeout;
        if (options.zIndex && options.zIndex > 0) {
            (this.windowStyles as any).zIndex = options.zIndex;
        }
        if (options.headerHidden) this.headerHidden = options.headerHidden;
        if (options.aspect) {
            if (options.aspect.width) this.windowStyles.width = options.aspect.width;
            if (options.aspect.height) this.windowStyles.height = options.aspect.height;
        }
        if (options.position) {
            if (options.position.x) {
                if (options.position.x.charAt(0) === 'L') {
                    this.windowStyles.left = options.position.x.substring(1);
                } else if (options.position.x.charAt(0) === 'R') {
                    this.windowStyles.right = options.position.x.substring(1);
                }
                this.window_position_auto[0] = false;
            }
            if (options.position.y) {
                if (options.position.y.charAt(0) === 'T') {
                    this.windowStyles.top = options.position.y.substring(1);
                } else if (options.position.y.charAt(0) === 'B') {
                    this.windowStyles.bottom = options.position.y.substring(1);
                }
                this.window_position_auto[1] = false;
            }
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
        this.DOM.querySelector('.modal-body')?.appendChild(
            document.createRange().createContextualFragment(response)
        );
    }

    public close() {
        if (this.closeTimer) clearTimeout(this.closeTimer);
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        this.parentNode.removeChild(this.DOM);
    }

    private bindResize() {
        this.resizeHandler = () => this.buildPosition();
        window.addEventListener('resize', this.resizeHandler);
    }

    public bindEvent(selector: string, event: string, handler: Function) {
        this.delayedEvents.push({ selector, event, handler });
        return this;
    }

    public getNode() {
        return this.DOM;
    }

    private buildHeader() {
        const headerTree = {
            className: 'flex items-center justify-between bg-neutral text-neutral-content p-2 rounded-t-lg',
            nodes: [
                { textContent: this.title, className: 'flex-1 text-sm font-semibold' },
                {
                    tag: 'span',
                    events: {
                        click: () => {
                            if (!this.enlarge) {
                                this.buildFullscreen();
                                this.enlarge = true;
                            } else {
                                this.resize();
                                this.enlarge = false;
                            }
                        },
                    },
                    nodes: Icon.aspect,
                    className: 'cursor-pointer mx-1',
                },
                {
                    tag: 'span',
                    events: { click: () => this.close() },
                    nodes: Icon.close,
                    className: 'cursor-pointer mx-1',
                },
            ],
        };
        return headerTree;
    }

    private buildPosition() {
        const w = this.DOM.querySelector('.modal-box') as HTMLElement;
        if (!w) return;
        if (this.window_position_auto[0]) {
            const left = (window.innerWidth - w.clientWidth) / 2;
            w.style.left = `${left}px`;
        }
        if (this.window_position_auto[1]) {
            const top = (window.innerHeight - w.clientHeight) / 2;
            w.style.top = `${top}px`;
        }
    }

    private buildFullscreen() {
        const w = this.DOM.querySelector('.modal-box') as HTMLElement;
        if (!w) return;
        w.style.width = '100%';
        w.style.height = '100%';
        w.style.top = '0';
        w.style.bottom = '0';
        w.style.left = '0';
        w.style.right = '0';
        w.style.borderRadius = '0';
    }

    private resize() {
        const w = this.DOM.querySelector('.modal-box') as HTMLElement;
        if (!w) return;
        w.style.width = this.windowStyles.width || '80%';
        w.style.height = this.windowStyles.height || '80%';
        w.style.top = this.windowStyles.top || 'auto';
        w.style.bottom = this.windowStyles.bottom || 'auto';
        w.style.left = this.windowStyles.left || 'auto';
        w.style.right = this.windowStyles.right || 'auto';
        w.style.borderRadius = ''; // restore default
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
        // 构建模态框的背景覆盖层
        const overlay = document.createElement('div');
        overlay.className = 'modal modal-open';
        overlay.setAttribute('unique', this.unique);
        if (this.gauze) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close();
            });
        }

        // 构建模态框内容盒子 (modal-box)
        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box relative';
        // 应用窗口尺寸样式
        Object.assign(modalBox.style, this.windowStyles);

        // 如果不需要隐藏头部，则添加头部
        if (!this.headerHidden) {
            const header = createDOMFromTree(this.buildHeader(), modalBox);
            modalBox.prepend(header);
        }

        // 添加主体内容区域
        const body = document.createElement('div');
        body.className = 'modal-body p-4';
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

        // 绑定窗口调整事件
        this.bindResize();
        this.buildPosition();
        if (this.fullscreen) this.buildFullscreen();
        if (this.timeout > 0) {
            setTimeout(() => this.close(), this.timeout * 1000);
        }

        // 如果需要异步加载内容
        if (this.xhr) {
            // 显示加载动画
            body.innerHTML = '<div class="flex justify-center items-center h-32"><span class="loading loading-spinner loading-lg"></span></div>';
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
                        body.innerHTML = '<div class="text-error">加载内容格式错误</div>';
                    }
                    // 重新绑定延迟事件
                    for (const ev of this.delayedEvents) {
                        const el = this.DOM.querySelector(ev.selector);
                        if (el) el.addEventListener(ev.event, (e) => ev.handler(e, el));
                    }
                })
                .catch(() => {
                    body.innerHTML = '<div class="flex justify-center items-center h-32 text-error">加载失败</div>';
                });
        }

        // 绑定延迟事件（第一次）
        for (const ev of this.delayedEvents) {
            const el = this.DOM.querySelector(ev.selector);
            if (el) {
                el.addEventListener(ev.event, (e) => ev.handler(e, el));
            }
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