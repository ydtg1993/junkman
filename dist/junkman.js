var junkman = (function (exports) {
    'use strict';

    /**
     * 为指定元素绑定右键菜单
     * @param doms - 需要绑定菜单的元素数组
     * @param items - 菜单项
     * @param options - 可选配置
     * @returns 销毁函数，用于解绑所有事件并移除菜单
     */
    function contextmenu(doms, items, options = {}) {
        const { width = 'auto', className = '', preventInnerContext = true, } = options;
        let activeMenu = null;
        // 移除当前活动菜单（内部公用）
        const removeActiveMenu = () => {
            if (activeMenu === null || activeMenu === void 0 ? void 0 : activeMenu.parentNode) {
                activeMenu.remove();
            }
            activeMenu = null;
        };
        // 全局点击关闭菜单
        const globalClickHandler = (e) => {
            if (activeMenu && !activeMenu.contains(e.target)) {
                removeActiveMenu();
            }
        };
        // 窗口滚动时关闭菜单
        const scrollHandler = () => {
            removeActiveMenu();
        };
        // 用于保存所有绑定的事件，便于销毁
        const domBindings = [];
        const handleContextMenu = (e) => {
            e.preventDefault();
            removeActiveMenu();
            const ul = document.createElement('ul');
            ul.className = `menu bg-base-200 rounded-box w-56 ${className}`.trim();
            if (width !== 'auto')
                ul.style.width = width;
            // 构建菜单项
            items.forEach((item) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.textContent = item.title;
                if (typeof item.func === 'function') {
                    a.href = '#';
                    a.addEventListener('click', (clickEvent) => {
                        clickEvent.preventDefault();
                        clickEvent.stopPropagation();
                        removeActiveMenu();
                        item.func(e);
                    });
                }
                else {
                    // 真正的禁用项：移除链接行为，并添加视觉样式
                    a.classList.add('text-gray-400', 'cursor-not-allowed', 'no-underline');
                    a.removeAttribute('href');
                }
                li.appendChild(a);
                ul.appendChild(li);
            });
            // 定位
            ul.style.position = 'fixed';
            ul.style.zIndex = '10000';
            // 计算位置，避免溢出视口
            ul.offsetWidth || 150; // 尚未挂载，先估算
            ul.offsetHeight || 100;
            let left = e.clientX - 3;
            let top = e.clientY - 3;
            // 先挂载到 DOM 以便测量真实尺寸
            ul.style.visibility = 'hidden';
            document.body.appendChild(ul);
            const realWidth = ul.offsetWidth;
            const realHeight = ul.offsetHeight;
            document.body.removeChild(ul);
            ul.style.visibility = '';
            // 对齐修复
            if (left + realWidth > window.innerWidth) {
                left = Math.max(0, window.innerWidth - realWidth - 5);
            }
            if (top + realHeight > window.innerHeight) {
                top = Math.max(0, window.innerHeight - realHeight - 5);
            }
            ul.style.left = `${left}px`;
            ul.style.top = `${top}px`;
            // 内部事件
            ul.addEventListener('contextmenu', (ev) => {
                if (preventInnerContext)
                    ev.preventDefault();
            });
            ul.addEventListener('mouseleave', () => removeActiveMenu());
            document.body.appendChild(ul);
            activeMenu = ul;
            // 注册全局关闭事件（仅第一次绑定）
            if (domBindings.length === 0) {
                document.addEventListener('click', globalClickHandler, true);
                window.addEventListener('scroll', scrollHandler, true);
            }
        };
        // 绑定到所有目标元素
        doms.forEach((dom) => {
            dom.addEventListener('contextmenu', handleContextMenu);
            domBindings.push([dom, 'contextmenu', handleContextMenu]);
        });
        // 返回销毁函数
        return function destroy() {
            // 移除所有 dom 上的事件
            domBindings.forEach(([dom, event, handler]) => {
                dom.removeEventListener(event, handler);
            });
            domBindings.length = 0;
            // 移除全局事件
            document.removeEventListener('click', globalClickHandler, true);
            window.removeEventListener('scroll', scrollHandler, true);
            // 清除活动菜单
            removeActiveMenu();
        };
    }

    /**
     * 通用网络请求函数
     * @returns 自动根据 responseType 解析的响应数据
     */
    function request(options) {
        const { url: rawUrl, method = 'GET', header = {}, data = {}, timeout = 30000, responseType = 'json', signal, onUploadProgress, throwOnHttpError = true, } = options;
        return new Promise((resolve, reject) => {
            // 处理 signal 提前取消
            if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                return reject(createError('abort', 'Request aborted'));
            }
            let xhr = new XMLHttpRequest();
            let url = rawUrl;
            // ──────────── GET 参数拼接 ────────────
            if (method.toUpperCase() === 'GET' && data && !(data instanceof FormData)) {
                const params = Object.entries(data)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
                if (params.length > 0) {
                    const sep = url.includes('?') ? '&' : '?';
                    url += sep + params.join('&');
                }
            }
            xhr.open(method, url, true);
            xhr.timeout = timeout;
            xhr.responseType = responseType;
            // ──────────── 请求头处理 ────────────
            // 内置的 Content-Type 设置（仅在非 GET 且有数据时使用，除非调用方显式覆盖）
            const methodUpper = method.toUpperCase();
            if (!Object.keys(header).some(k => k.toLowerCase() === 'content-type')) {
                if (methodUpper !== 'GET' && data && !(data instanceof FormData)) {
                    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                }
            }
            for (const [key, value] of Object.entries(header)) {
                xhr.setRequestHeader(key, value);
            }
            // ──────────── 取消监听 ────────────
            const onAbort = () => {
                xhr.abort();
                reject(createError('abort', 'Request aborted'));
            };
            signal === null || signal === void 0 ? void 0 : signal.addEventListener('abort', onAbort, { once: true });
            // ──────────── 状态处理 ────────────
            xhr.onload = () => {
                const status = xhr.status;
                const isSuccess = status >= 200 && status < 300;
                if (isSuccess || !throwOnHttpError) {
                    let result = xhr.response;
                    // 如果期望 json 但得到字符串，尝试解析
                    if (responseType === 'json' && typeof result === 'string') {
                        try {
                            result = JSON.parse(result);
                        }
                        catch {
                            // 保持原样
                        }
                    }
                    resolve(result);
                }
                else {
                    const err = createError('http', `HTTP ${status}: ${xhr.statusText}`);
                    err.status = status;
                    err.response = xhr.response;
                    reject(err);
                }
            };
            xhr.ontimeout = () => reject(createError('timeout', 'Request timeout'));
            xhr.onerror = () => reject(createError('network', 'Network error'));
            xhr.onabort = () => reject(createError('abort', 'Request aborted'));
            // ──────────── 上传进度 ────────────
            if (onUploadProgress && xhr.upload) {
                xhr.upload.addEventListener('progress', onUploadProgress);
            }
            // ──────────── 发送请求 ────────────
            try {
                if (methodUpper === 'GET' || !data) {
                    xhr.send();
                }
                else if (data instanceof FormData) {
                    // FormData 已经包含了 multipart/form-data；
                    // 如果之前手动设置了 Content-Type，则保留；否则浏览器会自动添加带 boundary 的头
                    xhr.send(data);
                }
                else {
                    xhr.send(JSON.stringify(data));
                }
            }
            catch (e) {
                reject(createError('network', 'Failed to send request'));
            }
        });
    }
    function createError(type, message) {
        const error = new Error(message);
        error.type = type;
        return error;
    }

    function createDOMFromTree(node, parent = undefined) {
        let tag = 'div';
        if (node.hasOwnProperty('tag'))
            tag = node.tag;
        const dom = document.createElement(tag);
        if (node.hasOwnProperty('className'))
            dom.className = node.className;
        if (node.hasOwnProperty('attributes')) {
            for (let k in node.attributes) {
                if (node.attributes.hasOwnProperty(k))
                    dom.setAttribute(k, node.attributes[k]);
            }
        }
        if (node.hasOwnProperty('textContent'))
            dom.textContent = node.textContent;
        if (node.hasOwnProperty('styles')) {
            for (let k in node.styles) {
                if (node.styles.hasOwnProperty(k)) {
                    // @ts-ignore
                    dom.style[k] = node.styles[k];
                }
            }
        }
        if (node.hasOwnProperty('events')) {
            for (let e in node.events) {
                if (node.events.hasOwnProperty(e)) {
                    dom.addEventListener(e, (event) => node.events[e](event, dom), false);
                }
            }
        }
        if (node.hasOwnProperty('nodes')) {
            if (typeof node.nodes === 'string') {
                dom.insertAdjacentHTML('afterbegin', node.nodes);
            }
            else if (node.nodes instanceof HTMLElement) {
                dom.appendChild(node.nodes);
            }
            else if (Array.isArray(node.nodes)) {
                node.nodes.forEach((childNode) => {
                    if (typeof childNode === 'string') {
                        dom.insertAdjacentHTML('beforeend', childNode);
                        return;
                    }
                    else if (childNode instanceof HTMLElement) {
                        dom.appendChild(childNode);
                        return;
                    }
                    createDOMFromTree(childNode, dom);
                });
            }
        }
        (parent instanceof HTMLElement) && parent.appendChild(dom);
        return dom;
    }

    const Icon = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
</svg>`,
        move: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
</svg>`,
        write: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
  <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
</svg>`,
        close: `<svg style="vertical-align: middle;" width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="white" stroke-width="2.5" d="M16,16 L4,4"></path><path fill="none" stroke="white" stroke-width="2.5" d="M16,4 L4,16"></path></svg>`,
        aspect: `<svg xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path fill="#ffffff" d="M0 12.5v-9A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5zM2.5 4a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0V5h2.5a.5.5 0 0 0 0-1h-3zm11 8a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-1 0V11h-2.5a.5.5 0 0 0 0 1h3z"/>
</svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
</svg>`,
        check_circle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
  <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
</svg>`,
        caret_right: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
</svg>`,
        caret_right_circle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M6 12.796V3.204L11.481 8 6 12.796zm.659.753 5.48-4.796a1 1 0 0 0 0-1.506L6.66 2.451C6.011 1.885 5 2.345 5 3.204v9.592a1 1 0 0 0 1.659.753z"/>
</svg>`,
        sub_loading: `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 50 50" style="background: rgb(223 9 127);border-radius: 50%;" xml:space="preserve">
  <path fill="#ffffff" stroke="#ffffff" d="M25.251,6.461c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z">
    <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.6s" repeatCount="indefinite"></animateTransform>
    </path>
  </svg>`,
        node: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-diagram-3-fill" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 2 7h5.5V6A1.5 1.5 0 0 1 6 4.5v-1zm-6 8A1.5 1.5 0 0 1 1.5 10h1A1.5 1.5 0 0 1 4 11.5v1A1.5 1.5 0 0 1 2.5 14h-1A1.5 1.5 0 0 1 0 12.5v-1zm6 0A1.5 1.5 0 0 1 7.5 10h1a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5v-1zm6 0a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-1z"/>
</svg>`,
    };

    /**
     * 将树形结构按层级展平，用于级联选择器的多列渲染
     * @param nodes 树形节点数组
     * @param stack 当前层级（内部递归用）
     * @param parents 当前节点的祖先 key 列表（内部递归用）
     * @param output 输出数组（内部递归用）
     * @returns 按层级索引的二维数组，每一层是一个 FlattenedNode 数组
     */
    function dimensionalTree(nodes, stack = 0, parents = [], output = []) {
        if (!output[stack])
            output[stack] = [];
        for (const node of nodes) {
            const flatNode = {
                ...node,
                stack,
                parentNodes: [...parents],
                originalNode: node,
            };
            output[stack].push(flatNode);
            if (node.nodes && node.nodes.length) {
                dimensionalTree(node.nodes, stack + 1, [...parents, node.key], output);
            }
        }
        return output;
    }

    class GlobalEventManager {
        constructor() {
            this.events = [];
        }
        add(target, type, listener) {
            target.addEventListener(type, listener);
            this.events.push({ target, type, listener });
        }
        removeAll() {
            this.events.forEach(({ target, type, listener }) => {
                target.removeEventListener(type, listener);
            });
            this.events = [];
        }
    }

    function imgDelay(doms, time = 200, options = {}) {
        const { zoom = false, width = 300, height = 0, previewClass = '' } = options;
        // 收集需要清理的资源
        const cleanupFns = [];
        // 收集所有动态创建的预览图，确保在清里时移除
        const previewImgs = new Set();
        doms.forEach((dom, idx) => {
            const src = dom.getAttribute('data-src');
            if (!src)
                return;
            // 如果图片已经通过其他方式加载完成（例如重复调用），跳过
            if (dom.getAttribute('src') === src)
                return;
            let loadHandler = null;
            let mouseoverHandler = null;
            let mouseoutHandler = null;
            let previewImg = null;
            let timeoutId;
            const cleanupDom = () => {
                if (timeoutId)
                    clearTimeout(timeoutId);
                if (loadHandler && dom) {
                    dom.removeEventListener('load', loadHandler);
                }
                if (mouseoverHandler && dom) {
                    dom.removeEventListener('mouseover', mouseoverHandler);
                }
                if (mouseoutHandler && dom) {
                    dom.removeEventListener('mouseout', mouseoutHandler);
                }
                if (previewImg && previewImg.parentNode) {
                    previewImg.remove();
                    previewImg = null;
                }
            };
            const setupZoom = () => {
                if (!zoom)
                    return;
                mouseoverHandler = (e) => {
                    if (previewImg)
                        return; // 已存在预览
                    previewImg = document.createElement('img');
                    previewImgs.add(previewImg);
                    // 基础样式
                    previewImg.style.position = 'fixed';
                    previewImg.style.zIndex = '1000000';
                    previewImg.style.borderRadius = '3px';
                    previewImg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                    if (previewClass) {
                        previewImg.className = previewClass;
                    }
                    // 图片加载完成后计算尺寸和位置
                    const applyPreview = () => {
                        if (!previewImg || !previewImg.parentNode)
                            return;
                        let displayWidth = width || 300;
                        let displayHeight = height !== null && height !== void 0 ? height : 0;
                        const naturalWidth = previewImg.naturalWidth || 100;
                        const naturalHeight = previewImg.naturalHeight || 100;
                        if (displayHeight === 0) {
                            displayHeight = naturalHeight * (displayWidth / naturalWidth);
                        }
                        else if (displayHeight < 0) {
                            const maxHeight = window.innerHeight - 20;
                            if (naturalHeight > maxHeight) {
                                displayHeight = maxHeight;
                                displayWidth = naturalWidth * (maxHeight / naturalHeight);
                            }
                            else {
                                displayHeight = naturalHeight;
                                displayWidth = naturalWidth;
                            }
                        }
                        previewImg.style.width = `${displayWidth}px`;
                        previewImg.style.height = `${displayHeight}px`;
                        // 位置：鼠标右下方偏移15px，并保持在视口内
                        let left = e.clientX + 15;
                        let top = e.clientY + 15;
                        if (left + displayWidth > window.innerWidth) {
                            left = e.clientX - displayWidth - 15;
                        }
                        if (top + displayHeight > window.innerHeight) {
                            top = e.clientY - displayHeight - 15;
                        }
                        left = Math.max(0, left);
                        top = Math.max(0, top);
                        previewImg.style.left = `${left}px`;
                        previewImg.style.top = `${top}px`;
                    };
                    // 如果图片已经加载完成，立即应用；否则等待加载事件
                    if (previewImg.complete && previewImg.naturalWidth > 0) {
                        document.body.appendChild(previewImg);
                        applyPreview();
                    }
                    else {
                        const onPreviewLoad = () => {
                            applyPreview();
                            previewImg === null || previewImg === void 0 ? void 0 : previewImg.removeEventListener('load', onPreviewLoad);
                        };
                        previewImg.addEventListener('load', onPreviewLoad, { once: true });
                        document.body.appendChild(previewImg);
                    }
                    previewImg.src = src;
                };
                mouseoutHandler = () => {
                    if (previewImg) {
                        previewImgs.delete(previewImg);
                        previewImg.remove();
                        previewImg = null;
                    }
                };
                dom.addEventListener('mouseover', mouseoverHandler);
                dom.addEventListener('mouseout', mouseoutHandler);
                cleanupFns.push(() => {
                    if (mouseoverHandler)
                        dom.removeEventListener('mouseover', mouseoverHandler);
                    if (mouseoutHandler)
                        dom.removeEventListener('mouseout', mouseoutHandler);
                    if (previewImg) {
                        previewImgs.delete(previewImg);
                        previewImg.remove();
                        previewImg = null;
                    }
                });
            };
            timeoutId = window.setTimeout(() => {
                // 如果图片尚未加载，绑定 load 事件
                const imgDom = dom;
                const onLoad = () => {
                    imgDom.removeEventListener('load', onLoad);
                    setupZoom();
                };
                // 检查图片是否已经完成加载（缓存）
                if (imgDom.complete && imgDom.naturalWidth > 0) {
                    setupZoom();
                }
                else {
                    imgDom.addEventListener('load', onLoad);
                    loadHandler = onLoad;
                }
                imgDom.src = src; // 触发加载
            }, idx * time);
            cleanupFns.push(() => {
                clearTimeout(timeoutId);
                cleanupDom();
            });
        });
        return () => {
            // 执行所有清理回调
            cleanupFns.forEach(fn => {
                try {
                    fn();
                }
                catch { /* 忽略可能的错误 */ }
            });
            cleanupFns.length = 0;
            // 确保所有预览图都被移除
            previewImgs.forEach(img => {
                if (img.parentNode)
                    img.remove();
            });
            previewImgs.clear();
        };
    }

    exports.ToastPosition = void 0;
    (function (ToastPosition) {
        ToastPosition["TopLeft"] = "top-left";
        ToastPosition["TopCenter"] = "top-center";
        ToastPosition["TopRight"] = "top-right";
        ToastPosition["MiddleLeft"] = "middle-left";
        ToastPosition["MiddleCenter"] = "middle-center";
        ToastPosition["MiddleRight"] = "middle-right";
        ToastPosition["BottomLeft"] = "bottom-left";
        ToastPosition["BottomCenter"] = "bottom-center";
        ToastPosition["BottomRight"] = "bottom-right";
    })(exports.ToastPosition || (exports.ToastPosition = {}));
    class Toast {
        constructor(position = exports.ToastPosition.TopRight) {
            // 确保容器存在
            const existing = document.querySelector(`.toast-container[data-position="${position}"]`);
            if (existing) {
                this.container = existing;
            }
            else {
                this.container = document.createElement('div');
                this.container.className = 'toast-container fixed z-[9999] flex flex-col gap-2 p-2 pointer-events-none';
                this.container.setAttribute('data-position', position);
                this.applyPosition(position);
                document.body.appendChild(this.container);
            }
        }
        applyPosition(position) {
            const styles = {};
            switch (position) {
                case exports.ToastPosition.TopLeft:
                    styles.top = '1rem';
                    styles.left = '1rem';
                    break;
                case exports.ToastPosition.TopCenter:
                    styles.top = '1rem';
                    styles.left = '50%';
                    styles.transform = 'translateX(-50%)';
                    break;
                case exports.ToastPosition.TopRight:
                    styles.top = '1rem';
                    styles.right = '1rem';
                    break;
                case exports.ToastPosition.MiddleLeft:
                    styles.top = '50%';
                    styles.left = '1rem';
                    styles.transform = 'translateY(-50%)';
                    break;
                case exports.ToastPosition.MiddleCenter:
                    styles.top = '50%';
                    styles.left = '50%';
                    styles.transform = 'translate(-50%, -50%)';
                    break;
                case exports.ToastPosition.MiddleRight:
                    styles.top = '50%';
                    styles.right = '1rem';
                    styles.transform = 'translateY(-50%)';
                    break;
                case exports.ToastPosition.BottomLeft:
                    styles.bottom = '1rem';
                    styles.left = '1rem';
                    break;
                case exports.ToastPosition.BottomCenter:
                    styles.bottom = '1rem';
                    styles.left = '50%';
                    styles.transform = 'translateX(-50%)';
                    break;
                case exports.ToastPosition.BottomRight:
                    styles.bottom = '1rem';
                    styles.right = '1rem';
                    break;
            }
            Object.assign(this.container.style, styles);
        }
        show(options) {
            const { message, type = 'info', duration = 3000, closable = true } = options;
            const toast = document.createElement('div');
            toast.className = 'pointer-events-auto w-80 transition-all duration-300';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            const alertClass = `alert alert-${type} flex items-center shadow-lg`;
            const alertDiv = document.createElement('div');
            alertDiv.className = alertClass;
            alertDiv.innerHTML = `
            <span class="flex-1">${message}</span>
            ${closable ? '<button class="btn btn-sm btn-ghost ml-2 flex-shrink-0">✕</button>' : ''}
        `;
            toast.appendChild(alertDiv);
            // 关闭处理
            let autoCloseTimer;
            if (duration > 0) {
                autoCloseTimer = window.setTimeout(() => {
                    this.removeToast(toast);
                }, duration);
            }
            if (closable) {
                const closeBtn = alertDiv.querySelector('button');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        if (autoCloseTimer)
                            clearTimeout(autoCloseTimer);
                        this.removeToast(toast);
                    });
                }
            }
            this.container.appendChild(toast);
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });
            return toast;
        }
        removeToast(toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (toast.parentNode === this.container) {
                    this.container.removeChild(toast);
                }
            }, 300);
        }
        destroy() {
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        }
    }

    class Tabs {
        constructor(selector, options) {
            var _a;
            this.tabLabels = [];
            this.tabContents = [];
            this.rendered = false;
            this.loadingStates = new Map(); // 记录哪些 tab 正在加载
            this.abortControllers = new Map(); // 用于取消请求
            this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!this.container)
                throw new Error('Tabs container not found');
            this.tabs = options.tabs;
            this.options = options;
            this.activeIndex = (_a = options.activeIndex) !== null && _a !== void 0 ? _a : 0;
            this.render();
        }
        render() {
            this.container.innerHTML = '';
            const { type = 'boxed' } = this.options;
            // 标签导航
            const nav = document.createElement('div');
            nav.className = `tabs tabs-${type}`;
            this.tabLabels = [];
            this.tabs.forEach((tab, index) => {
                const label = document.createElement('a');
                label.className = `tab tab-${type} ${index === this.activeIndex ? 'tab-active' : ''}`;
                if (tab.disabled)
                    label.className += ' tab-disabled';
                label.textContent = tab.label;
                label.addEventListener('click', () => {
                    if (!tab.disabled)
                        this.setActive(index);
                });
                nav.appendChild(label);
                this.tabLabels.push(label);
            });
            // 内容区域
            const contentContainer = document.createElement('div');
            contentContainer.className = 'mt-2';
            this.tabContents = [];
            this.tabs.forEach((tab, index) => {
                const pane = document.createElement('div');
                pane.className = `tab-content ${index === this.activeIndex ? 'block' : 'hidden'}`;
                // 决定是否立即渲染内容
                const isAsync = typeof tab.content === 'function';
                if (!isAsync && (index === this.activeIndex || !this.options.lazy)) {
                    this.renderStaticContent(pane, tab.content);
                }
                else if (isAsync && index === this.activeIndex) {
                    // 异步内容在激活时加载，此处先显示 loading
                    this.showLoading(pane);
                    this.loadAsyncContent(index, pane);
                }
                // 如果是静态懒加载且未激活，保持空白
                this.tabContents.push(pane);
                contentContainer.appendChild(pane);
            });
            this.container.appendChild(nav);
            this.container.appendChild(contentContainer);
            this.rendered = true;
        }
        renderStaticContent(pane, content) {
            pane.innerHTML = '';
            if (typeof content === 'string') {
                pane.innerHTML = content;
            }
            else {
                pane.appendChild(content);
            }
        }
        showLoading(pane) {
            pane.innerHTML = '<div class="flex justify-center items-center py-8"><span class="loading loading-spinner loading-lg"></span></div>';
        }
        async loadAsyncContent(index, pane) {
            var _a;
            // 取消之前的请求（如果有）
            if (this.abortControllers.has(index)) {
                (_a = this.abortControllers.get(index)) === null || _a === void 0 ? void 0 : _a.abort();
            }
            const controller = new AbortController();
            this.abortControllers.set(index, controller);
            this.loadingStates.set(index, true);
            try {
                const fn = this.tabs[index].content;
                const result = await fn(controller.signal);
                // 确保组件未销毁且当前 pane 仍是目标
                if (!this.tabContents.includes(pane))
                    return;
                this.renderStaticContent(pane, result);
            }
            catch (error) {
                if ((error === null || error === void 0 ? void 0 : error.name) === 'AbortError')
                    return; // 请求被取消，忽略
                if (!this.tabContents.includes(pane))
                    return;
                pane.innerHTML = `<div class="flex justify-center items-center py-8 text-error">加载失败: ${error.message || '未知错误'}</div>`;
            }
            finally {
                this.loadingStates.set(index, false);
                this.abortControllers.delete(index);
            }
        }
        setActive(index) {
            var _a;
            if (index < 0 || index >= this.tabs.length || this.tabs[index].disabled)
                return;
            if (this.activeIndex === index)
                return;
            // 切换样式
            this.tabLabels[this.activeIndex].classList.remove('tab-active');
            this.tabLabels[index].classList.add('tab-active');
            // 切换内容
            const oldPane = this.tabContents[this.activeIndex];
            const newPane = this.tabContents[index];
            oldPane.classList.add('hidden');
            oldPane.classList.remove('block');
            newPane.classList.remove('hidden');
            newPane.classList.add('block');
            this.activeIndex = index;
            // 异步加载判断
            const tab = this.tabs[index];
            const isAsync = typeof tab.content === 'function';
            const isEmpty = newPane.innerHTML === '' || newPane.children.length === 0;
            if (isAsync) {
                this.showLoading(newPane);
                this.loadAsyncContent(index, newPane);
            }
            else if (isEmpty && this.options.lazy) {
                // 静态懒加载且尚未渲染
                this.renderStaticContent(newPane, tab.content);
            }
            (_a = tab.onActive) === null || _a === void 0 ? void 0 : _a.call(tab);
        }
        getActiveIndex() {
            return this.activeIndex;
        }
        destroy() {
            // 取消所有进行中的异步请求
            this.abortControllers.forEach((controller) => controller.abort());
            this.abortControllers.clear();
            this.container.innerHTML = '';
            this.tabLabels = [];
            this.tabContents = [];
        }
    }

    exports.SELECTOR_MODE = void 0;
    (function (SELECTOR_MODE) {
        SELECTOR_MODE[SELECTOR_MODE["Delete"] = 0] = "Delete";
        SELECTOR_MODE[SELECTOR_MODE["Insert"] = 1] = "Insert";
    })(exports.SELECTOR_MODE || (exports.SELECTOR_MODE = {}));
    exports.SELECTOR_TOWARDS = void 0;
    (function (SELECTOR_TOWARDS) {
        SELECTOR_TOWARDS[SELECTOR_TOWARDS["Vertical"] = 0] = "Vertical";
        SELECTOR_TOWARDS[SELECTOR_TOWARDS["Horizontal"] = 1] = "Horizontal";
    })(exports.SELECTOR_TOWARDS || (exports.SELECTOR_TOWARDS = {}));
    exports.SELECTOR_DIRECTION = void 0;
    (function (SELECTOR_DIRECTION) {
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["Down"] = 0] = "Down";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["Up"] = 1] = "Up";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["Mid"] = 2] = "Mid";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["Right"] = 3] = "Right";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["RightUp"] = 4] = "RightUp";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["RightMid"] = 5] = "RightMid";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["Left"] = 6] = "Left";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["LeftUp"] = 7] = "LeftUp";
        SELECTOR_DIRECTION[SELECTOR_DIRECTION["LeftMid"] = 8] = "LeftMid";
    })(exports.SELECTOR_DIRECTION || (exports.SELECTOR_DIRECTION = {}));

    class Selector {
        constructor(select, options) {
            this.parentNode = document.body;
            this.select = {};
            this.selectedData = [];
            this.selectData = [];
            this.insertData = [];
            this.deleteData = [];
            this.searchOff = false;
            this.triggerEvent = { func: null, enable: false };
            this.SELECT_INPUT_DOM = null;
            this.INSERT_INPUT_DOM = null;
            this.DELETE_INPUT_DOM = null;
            this.value_line_hash = {};
            this.towards = exports.SELECTOR_TOWARDS.Horizontal;
            this.placeholder = '-select-';
            this.maxHeight = '150px';
            this.hiddenInput = null;
            this.direction = exports.SELECTOR_DIRECTION.Down;
            this.show = false;
            this.wrap = false;
            this.select = select;
            if (typeof options.limit === "number") {
                this.limitNumber = options.limit;
            }
            if (typeof options.searchOff === "boolean") {
                this.searchOff = options.searchOff;
            }
            if (typeof options.trigger === "function") {
                this.triggerEvent = { func: options.trigger, enable: true };
            }
            if (typeof options.hiddenInput === "string") {
                this.hiddenInput = options.hiddenInput;
            }
            if (typeof options.placeholder === "string") {
                this.placeholder = options.placeholder;
            }
            if (typeof options.show === "boolean") {
                this.show = options.show;
            }
            if (typeof options.wrap === "boolean") {
                this.wrap = options.wrap;
            }
            if (typeof options.menuMaxHeight === "string") {
                this.maxHeight = options.menuMaxHeight;
            }
            // direction 和 towards 处理保留类型安全
            if (options.direction !== undefined && Object.values(exports.SELECTOR_DIRECTION).includes(options.direction)) {
                this.direction = options.direction;
            }
            if (options.towards !== undefined && Object.values(exports.SELECTOR_TOWARDS).includes(options.towards)) {
                this.towards = options.towards;
            }
            if (options.parentNode instanceof HTMLElement) {
                this.parentNode = options.parentNode;
            }
        }
        selected(selected) {
            if (!Array.isArray(selected)) {
                console.error('selected params must be array[string] !');
                return this;
            }
            selected = selected.map(elem => elem.toString());
            this.selectedData = selected.filter(d => Object.keys(this.select).map(key => this.select[key]).includes(d));
            // 异步模拟点击更新子类UI（Menu 专用，Switcher 已重写，不会执行）
            (async () => {
                const options = this.parentNode.querySelectorAll('.dropdown-content li a');
                if (options.length > 0) {
                    options.forEach((D) => {
                        if (!(D instanceof HTMLElement))
                            return;
                        const value = D.getAttribute('data-value');
                        if (this.selectedData.includes(value)) {
                            this.triggerEvent.enable = false;
                            D.click();
                            this.triggerEvent.enable = true;
                        }
                    });
                    const content = this.parentNode.querySelector('.dropdown-content');
                    if (content && !this.show)
                        content.classList.add('hidden');
                }
            })();
            return this;
        }
        _tagCal(value, operate) {
            let index = this.selectData.indexOf(value);
            if (operate === exports.SELECTOR_MODE.Insert) {
                if (index === -1) {
                    this.selectData.push(value);
                    if (this.SELECT_INPUT_DOM instanceof HTMLElement) {
                        this.SELECT_INPUT_DOM.value = JSON.stringify(this.selectData);
                    }
                }
                if (!this.selectedData.includes(value) && !this.insertData.includes(value)) {
                    this.insertData.push(value);
                    if (this.INSERT_INPUT_DOM instanceof HTMLElement) {
                        this.INSERT_INPUT_DOM.value = JSON.stringify(this.insertData);
                    }
                }
                index = this.deleteData.indexOf(value);
                if (index !== -1) {
                    this.deleteData.splice(index, 1);
                    if (this.DELETE_INPUT_DOM instanceof HTMLElement) {
                        this.DELETE_INPUT_DOM.value = JSON.stringify(this.deleteData);
                    }
                }
            }
            else {
                if (index !== -1) {
                    this.selectData.splice(index, 1);
                    if (this.SELECT_INPUT_DOM instanceof HTMLElement) {
                        this.SELECT_INPUT_DOM.value = JSON.stringify(this.selectData);
                    }
                }
                if (this.selectedData.includes(value) && !this.deleteData.includes(value)) {
                    this.deleteData.push(value);
                    if (this.DELETE_INPUT_DOM instanceof HTMLElement) {
                        this.DELETE_INPUT_DOM.value = JSON.stringify(this.deleteData);
                    }
                }
                index = this.insertData.indexOf(value);
                if (index !== -1) {
                    this.insertData.splice(index, 1);
                    if (this.INSERT_INPUT_DOM instanceof HTMLElement) {
                        this.INSERT_INPUT_DOM.value = JSON.stringify(this.insertData);
                    }
                }
            }
            if (typeof this.triggerEvent.func === 'function' && this.triggerEvent.enable) {
                this.triggerEvent.func({
                    value,
                    operate,
                    select: this.selectData,
                    insert: this.insertData,
                    delete: this.deleteData,
                });
            }
        }
        delayExec() {
            if (typeof this.hiddenInput === "string") {
                const name = this.hiddenInput;
                this.parentNode.insertAdjacentHTML('beforeend', `
<input name="${name}[select]" value="[]" type="hidden" />
<input name="${name}[insert]" value="[]" type="hidden" />
<input name="${name}[delete]" value="[]" type="hidden" />`);
                this.SELECT_INPUT_DOM = this.parentNode.querySelector(`input[name='${name}[select]']`);
                this.INSERT_INPUT_DOM = this.parentNode.querySelector(`input[name='${name}[insert]']`);
                this.DELETE_INPUT_DOM = this.parentNode.querySelector(`input[name='${name}[delete]']`);
            }
            if (this.selectedData.length > 0) {
                this.selected(this.selectedData);
            }
        }
        make() {
            return this;
        }
        /**
         * 清理基类资源（隐藏输入框引用）
         * 子类应重写此方法并调用 super.destroy()
         */
        destroy() {
            this.SELECT_INPUT_DOM = null;
            this.INSERT_INPUT_DOM = null;
            this.DELETE_INPUT_DOM = null;
        }
    }

    class Menu extends Selector {
        constructor() {
            super(...arguments);
            this.globalEvents = new GlobalEventManager();
            this.dropdownWrapper = null;
            this.searchTimer = null;
        }
        _selectedInputShow(selectedDom) {
            const names = [];
            this.selectData.forEach((d) => {
                const name = Object.keys(this.select).find(key => this.select[key] === d);
                if (name)
                    names.push(name);
            });
            selectedDom.innerHTML = '';
            if (this.limitNumber === 1) {
                const span = document.createElement('span');
                span.className = 'truncate';
                span.textContent = names[0] || '';
                selectedDom.appendChild(span);
                return;
            }
            for (const name of names) {
                const span = document.createElement('span');
                span.className = 'badge badge-sm bg-base-300 text-base-content mx-0.5 truncate';
                span.textContent = name;
                span.title = name;
                selectedDom.appendChild(span);
            }
        }
        _buildOptions() {
            const tree = [];
            const select = this.select;
            let line = 0;
            for (const [name, value] of Object.entries(select)) {
                this.value_line_hash[value] = line;
                line++;
                tree.push({
                    tag: 'li',
                    nodes: [{
                            tag: 'a',
                            textContent: name,
                            attributes: { 'data-name': name, 'data-value': value },
                        }],
                });
            }
            return tree;
        }
        _buildSearchInput() {
            return {
                tag: 'input',
                className: 'input input-bordered input-xs w-full',
                attributes: { placeholder: 'Search' },
                events: {
                    input: (e, dom) => {
                        const keywords = dom.value;
                        const options = this.parentNode.querySelectorAll('.dropdown-content li a');
                        if (!keywords) {
                            options.forEach((a) => a.parentElement.classList.remove('hidden'));
                            return;
                        }
                        if (this.searchTimer)
                            clearTimeout(this.searchTimer);
                        this.searchTimer = window.setTimeout(() => {
                            options.forEach((a) => {
                                const text = a.getAttribute('data-name') || '';
                                const match = text.toLowerCase().includes(keywords.toLowerCase());
                                a.parentElement.classList.toggle('hidden', !match);
                            });
                            this.searchTimer = null;
                        }, 300);
                    },
                },
            };
        }
        make() {
            const directionClassMap = {
                [exports.SELECTOR_DIRECTION.Down]: 'dropdown-bottom',
                [exports.SELECTOR_DIRECTION.Up]: 'dropdown-top',
                [exports.SELECTOR_DIRECTION.Right]: 'dropdown-right',
                [exports.SELECTOR_DIRECTION.Left]: 'dropdown-left',
                [exports.SELECTOR_DIRECTION.RightUp]: 'dropdown-right dropdown-top',
                [exports.SELECTOR_DIRECTION.RightMid]: 'dropdown-right',
                [exports.SELECTOR_DIRECTION.LeftUp]: 'dropdown-left dropdown-top',
                [exports.SELECTOR_DIRECTION.LeftMid]: 'dropdown-left',
                [exports.SELECTOR_DIRECTION.Mid]: 'dropdown-bottom',
            };
            const dirClass = directionClassMap[this.direction] || 'dropdown-bottom';
            const dropdownWrapper = document.createElement('div');
            dropdownWrapper.className = `dropdown ${dirClass} w-full`;
            this.dropdownWrapper = dropdownWrapper; // 保存引用，便于销毁
            const trigger = document.createElement('label');
            trigger.tabIndex = 0;
            trigger.className = 'btn btn-sm flex items-center gap-1 justify-between leading-none';
            const selectedArea = document.createElement('span');
            selectedArea.className = 'selected-area flex items-center gap-1 truncate';
            selectedArea.textContent = this.placeholder;
            trigger.appendChild(selectedArea);
            trigger.appendChild(createDOMFromTree({ tag: 'span', textContent: '▼', className: 'text-xs' }));
            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-1 hidden z-50';
            if (!this.searchOff) {
                const searchDiv = document.createElement('div');
                searchDiv.className = 'px-2 mb-1';
                searchDiv.appendChild(createDOMFromTree(this._buildSearchInput()));
                dropdownContent.appendChild(searchDiv);
            }
            const ul = document.createElement('ul');
            ul.className = 'overflow-y-auto';
            ul.style.maxHeight = this.maxHeight;
            const optionTree = this._buildOptions();
            optionTree.forEach((item) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.textContent = item.nodes[0].textContent;
                a.setAttribute('data-name', item.nodes[0].attributes['data-name']);
                a.setAttribute('data-value', item.nodes[0].attributes['data-value']);
                a.href = '#';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    a.getAttribute('data-name');
                    const value = a.getAttribute('data-value');
                    if (this.selectData.indexOf(value) !== -1) {
                        this._tagCal(value, exports.SELECTOR_MODE.Delete);
                        a.removeAttribute('active');
                        const checkIcon = a.querySelector('.check-icon');
                        if (checkIcon)
                            checkIcon.remove();
                        this._selectedInputShow(selectedArea);
                        if (this.selectData.length === 0)
                            selectedArea.textContent = this.placeholder;
                    }
                    else {
                        this._tagCal(value, exports.SELECTOR_MODE.Insert);
                        if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                            this.triggerEvent.enable = false;
                            const firstVal = this.selectData[0];
                            const firstIdx = this.value_line_hash[firstVal] + 1;
                            const popOpt = dropdownContent.querySelector(`li:nth-child(${firstIdx}) a`);
                            if (popOpt)
                                popOpt.click();
                            this.triggerEvent.enable = true;
                        }
                        a.setAttribute('active', '1');
                        a.insertAdjacentHTML('beforeend', `<span class="check-icon">${Icon.check}</span>`);
                        this._selectedInputShow(selectedArea);
                    }
                });
                li.appendChild(a);
                ul.appendChild(li);
            });
            dropdownContent.appendChild(ul);
            dropdownWrapper.appendChild(trigger);
            dropdownWrapper.appendChild(dropdownContent);
            this.parentNode.appendChild(dropdownWrapper);
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('hidden');
            });
            const closeDropdown = (e) => {
                if (this.dropdownWrapper && !this.dropdownWrapper.contains(e.target)) {
                    dropdownContent.classList.add('hidden');
                }
            };
            this.globalEvents.add(document, 'click', closeDropdown);
            (async () => {
                this.delayExec();
                if (this.show) {
                    dropdownContent.classList.remove('hidden');
                }
            })();
            return this;
        }
        destroy() {
            // 清除搜索定时器
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
                this.searchTimer = null;
            }
            // 移除全局事件
            this.globalEvents.removeAll();
            // 移除 DOM（精确移除自身创建的 dropdown 容器）
            if (this.dropdownWrapper && this.dropdownWrapper.parentNode) {
                this.dropdownWrapper.parentNode.removeChild(this.dropdownWrapper);
                this.dropdownWrapper = null;
            }
        }
    }

    class Switcher extends Selector {
        constructor() {
            super(...arguments);
            this.buttonContainer = null;
        }
        /** 构建选项按钮树 */
        _buildOptions() {
            const tree = [];
            const select = this.select;
            const optionClass = 'btn btn-sm';
            for (const [name, value] of Object.entries(select)) {
                tree.push({
                    tag: 'button',
                    attributes: {
                        'data-name': name,
                        'data-value': value,
                    },
                    className: optionClass,
                    textContent: name,
                    events: {
                        click: (e, option) => {
                            e.stopPropagation();
                            this.handleOptionClick(option, value);
                        },
                    },
                });
            }
            return tree;
        }
        /** 处理选项点击（UI 交互 → 数据同步） */
        handleOptionClick(option, value) {
            var _a;
            // 已选中则取消
            if (this.selectData.includes(value)) {
                this._tagCal(value, exports.SELECTOR_MODE.Delete);
                option.classList.remove('btn-active');
                return;
            }
            // 新增选中
            this._tagCal(value, exports.SELECTOR_MODE.Insert);
            option.classList.add('btn-active');
            // 超出限制，移除最旧的选中（不再模拟 click，避免副作用）
            if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                const removedValue = this.selectData.shift(); // 移除数组第一个
                this._tagCal(removedValue, exports.SELECTOR_MODE.Delete); // 同步内部计数/回调
                // 更新对应按钮的 UI
                const removedBtn = (_a = this.buttonContainer) === null || _a === void 0 ? void 0 : _a.querySelector(`button[data-value="${removedValue}"]`);
                if (removedBtn) {
                    removedBtn.classList.remove('btn-active');
                }
            }
        }
        /** 创建 DOM */
        make() {
            const isVertical = this.towards === exports.SELECTOR_TOWARDS.Vertical;
            const containerClass = isVertical ? 'btn-group btn-group-vertical' : 'btn-group';
            const domTree = {
                className: containerClass,
                nodes: this._buildOptions(),
            };
            // 保存按钮容器引用
            const parentNode = this.parentNode;
            this.buttonContainer = createDOMFromTree(domTree, parentNode);
            // 同步内部状态与 UI（基于 this.selectedData）
            this.syncUIWithSelectedData();
            // 处理 hidden input 等延迟操作
            (async () => {
                this.delayExec();
            })();
            return this;
        }
        /** 统一的方法：根据 this.selectedData 更新 UI 和 selectData */
        syncUIWithSelectedData() {
            const container = this.buttonContainer;
            if (!container)
                return;
            const buttons = container.querySelectorAll('button[data-value]');
            this.selectData = []; // 重置
            buttons.forEach(btn => {
                const val = btn.getAttribute('data-value');
                if (val && this.selectedData.includes(val)) {
                    btn.classList.add('btn-active');
                    this.selectData.push(val);
                }
                else {
                    btn.classList.remove('btn-active');
                }
            });
            // limit 控制（保留最后 limit 个）
            if (this.limitNumber > 0 && this.selectData.length > this.limitNumber) {
                this.selectData = this.selectData.slice(-this.limitNumber);
                buttons.forEach(btn => {
                    const val = btn.getAttribute('data-value');
                    if (val && !this.selectData.includes(val)) {
                        btn.classList.remove('btn-active');
                    }
                });
            }
        }
        /** 外部设置当前选中值 */
        selected(selected) {
            if (!Array.isArray(selected)) {
                console.error('selected params must be array[string] !');
                return this;
            }
            // 过滤出合法值
            const validValues = Object.values(this.select);
            this.selectedData = selected
                .map(v => v.toString())
                .filter(v => validValues.includes(v));
            // 如果 UI 已存在，立即刷新
            if (this.buttonContainer) {
                this.syncUIWithSelectedData();
            }
            return this;
        }
        /** 销毁组件，清理 DOM 和引用 */
        destroy() {
            if (this.buttonContainer && this.buttonContainer.parentNode) {
                this.buttonContainer.parentNode.removeChild(this.buttonContainer);
            }
            this.buttonContainer = null;
        }
    }

    function generateUniqueString(length = 10) {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 2 + length - timestamp.length);
        return timestamp + randomPart;
    }

    class Modal {
        constructor(options) {
            this.title = '';
            this.windowStyles = {
                width: '80%',
                height: '80%',
            };
            this.parentNode = document.body;
            this.gauze = false;
            this.unique = '';
            this.timeout = -1;
            this.headerHidden = false;
            this.delayedEvents = [];
            // 资源管理
            this.controller = new AbortController();
            this.timeoutTimer = null;
            this.xhrAbortController = null;
            this.unique = generateUniqueString(10);
            if (options.title)
                this.title = options.title;
            if (options.gauze)
                this.gauze = options.gauze;
            if (options.timeout)
                this.timeout = options.timeout;
            if (options.headerHidden !== undefined)
                this.headerHidden = options.headerHidden;
            if (options.aspect) {
                if (options.aspect.width)
                    this.windowStyles.width = options.aspect.width;
                if (options.aspect.height)
                    this.windowStyles.height = options.aspect.height;
            }
            if (options.parentNode instanceof HTMLElement) {
                this.parentNode = options.parentNode;
            }
        }
        setContent(content) {
            if (typeof content === 'string' || content instanceof HTMLElement) {
                this.content = content;
            }
            else {
                console.error('type of content error!');
            }
            return this;
        }
        setLinkContent(response) {
            var _a;
            const body = (_a = this.DOM) === null || _a === void 0 ? void 0 : _a.querySelector('.modal-body');
            if (body) {
                body.innerHTML = '';
                body.appendChild(document.createRange().createContextualFragment(response));
            }
        }
        /**
         * 关闭模态框，释放所有事件和定时器
         */
        close() {
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
        bindEvent(selector, event, handler) {
            this.delayedEvents.push({ selector, event, handler });
            return this;
        }
        getNode() {
            return this.DOM;
        }
        setUrl(url, method = 'GET', data) {
            this.xhr = { url, method, data };
            return this;
        }
        /**
         * 绑定表单提交处理器（不再强制要求 xhr）
         */
        bindSubmit(onSubmit) {
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
            if (this.windowStyles.width)
                modalBox.style.width = this.windowStyles.width;
            if (this.windowStyles.height)
                modalBox.style.height = this.windowStyles.height;
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
                }
                else if (this.content instanceof HTMLElement) {
                    body.appendChild(this.content);
                }
            }
            modalBox.appendChild(body);
            overlay.appendChild(modalBox);
            this.parentNode.appendChild(overlay);
            // ----- 点击背景关闭 -----
            if (this.gauze) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay)
                        this.close();
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
                    .then((resp) => {
                    // 如果模态框已被关闭，则不再更新 DOM
                    if (!this.DOM || !this.DOM.parentNode)
                        return;
                    body.innerHTML = '';
                    if (typeof resp === 'string') {
                        body.innerHTML = resp;
                    }
                    else if (resp && resp.html) {
                        body.innerHTML = resp.html;
                    }
                    else {
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
                    if ((err === null || err === void 0 ? void 0 : err.name) === 'AbortError' || (err === null || err === void 0 ? void 0 : err.message) === 'Request cancelled')
                        return;
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
                const form = this.DOM.querySelector('form');
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const formData = new FormData(form);
                        await this.submitHandler(formData);
                    }, { signal: this.controller.signal });
                }
            }
        }
        /**
         * 销毁模态框（等同于 close，但强调彻底清理）
         */
        destroy() {
            this.close();
        }
    }

    class CascadeSelector {
        constructor(selector, data, options = {}) {
            this.flatData = [];
            this.stacks = [];
            this.selectedNodes = [];
            this.searchInput = null;
            this.searchDropdown = null;
            this.searchDebounceTimer = null;
            this.expandedParents = [];
            this.globalEvents = new GlobalEventManager();
            this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!this.container)
                throw new Error('Container element not found');
            this.data = data;
            this.options = {
                limit: 0,
                searchable: true,
                placeholder: '-请选择-',
                selectedKeys: [],
                parentNode: document.body,
                onChange: () => { },
                loadChildren: options.loadChildren,
                ...options,
            };
            this.uniqueId = generateUniqueString(6);
            this.init();
        }
        init() {
            var _a;
            this.flatData = dimensionalTree(this.data);
            this.render();
            this.bindEvents();
            if ((_a = this.options.selectedKeys) === null || _a === void 0 ? void 0 : _a.length) {
                this.setValue(this.options.selectedKeys);
            }
        }
        render() {
            this.container.innerHTML = '';
            this.container.className = 'flex flex-col gap-2 bg-base-100 p-2 rounded-lg border border-base-300 relative';
            this.container.addEventListener('contextmenu', (e) => e.preventDefault());
            if (this.options.searchable) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'input input-bordered input-sm w-full';
                input.placeholder = '搜索...';
                this.container.appendChild(input);
                this.searchInput = input;
            }
            const selectedArea = document.createElement('div');
            selectedArea.className = 'flex flex-wrap gap-1 min-h-[34px] p-2 border border-base-300 rounded text-base-content/60';
            selectedArea.textContent = this.options.placeholder;
            this.container.appendChild(selectedArea);
            const columnsContainer = document.createElement('div');
            columnsContainer.className = 'flex overflow-x-auto h-60 gap-1 snap-x snap-mandatory';
            this.container.appendChild(columnsContainer);
            this.stacks = [];
            for (let i = 0; i < this.flatData.length; i++) {
                const stackDiv = document.createElement('div');
                stackDiv.className = 'flex-1 min-w-[120px] max-w-[200px] overflow-y-auto border-r border-base-200 last:border-r-0 snap-start';
                stackDiv.setAttribute('data-stack', i.toString());
                columnsContainer.appendChild(stackDiv);
                this.stacks.push(stackDiv);
                this.renderStack(i);
            }
        }
        renderStack(stackLevel) {
            const stackDiv = this.stacks[stackLevel];
            if (!stackDiv)
                return;
            stackDiv.innerHTML = '';
            const nodes = this.flatData[stackLevel];
            if (!nodes || nodes.length === 0)
                return;
            const ul = document.createElement('ul');
            ul.className = 'menu menu-xs p-0 bg-base-100 rounded-lg w-full';
            for (let idx = 0; idx < nodes.length; idx++) {
                const node = nodes[idx];
                const li = document.createElement('li');
                if (stackLevel > 0)
                    li.classList.add('hidden');
                const hasChildren = node.nodes && node.nodes.length > 0;
                const isSelected = this.selectedNodes.some(n => n.key === node.key);
                const partialSelected = !isSelected && hasChildren && this.hasAnySelectedDescendant(node);
                const a = document.createElement('a');
                let aClass = 'flex items-center justify-between py-1.5 px-2 hover:bg-base-200 cursor-pointer rounded';
                if (isSelected)
                    aClass += ' bg-success/10';
                a.className = aClass;
                a.setAttribute('data-key', String(node.key));
                a.setAttribute('data-stack', String(stackLevel));
                a.setAttribute('data-index', String(idx));
                a.setAttribute('data-has-children', hasChildren ? 'true' : 'false');
                const left = document.createElement('span');
                left.className = 'flex items-center gap-1';
                if (hasChildren) {
                    const expandIcon = document.createElement('span');
                    expandIcon.className = 'expand-icon transition-transform duration-200';
                    expandIcon.innerHTML = Icon.caret_right;
                    if (String(this.expandedParents[stackLevel]) === String(node.key)) {
                        expandIcon.style.transform = 'rotate(90deg)';
                    }
                    left.appendChild(expandIcon);
                }
                const textSpan = document.createElement('span');
                textSpan.className = 'truncate';
                textSpan.textContent = node.val;
                left.appendChild(textSpan);
                a.appendChild(left);
                if (isSelected || partialSelected) {
                    const mark = document.createElement('span');
                    mark.className = isSelected ? 'text-success' : 'text-warning';
                    mark.innerHTML = isSelected ? Icon.check : Icon.check_circle;
                    a.appendChild(mark);
                }
                // 右键菜单绑定（仅在有子节点时）
                if (hasChildren) {
                    a.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showContextMenu(a, [
                            { title: '全选子级', func: () => this.selectAllChildren(node) },
                            { title: '取消全选', func: () => this.deselectAllChildren(node) },
                        ], e);
                    });
                }
                li.appendChild(a);
                ul.appendChild(li);
            }
            stackDiv.appendChild(ul);
        }
        showContextMenu(anchor, items, event) {
            const existing = document.querySelector('.cascade-context-menu');
            if (existing)
                existing.remove();
            const menu = document.createElement('ul');
            menu.className = 'cascade-context-menu menu bg-base-200 rounded shadow-lg p-1 absolute z-50';
            menu.style.left = event.pageX + 'px';
            menu.style.top = event.pageY + 'px';
            menu.style.minWidth = '120px';
            items.forEach(item => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.textContent = item.title;
                a.className = 'block px-2 py-1 hover:bg-primary hover:text-primary-content rounded text-sm cursor-pointer';
                a.addEventListener('click', () => {
                    menu.remove();
                    item.func();
                });
                li.appendChild(a);
                menu.appendChild(li);
            });
            document.body.appendChild(menu);
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                }
            };
            this.globalEvents.add(document, 'click', closeHandler);
            this.globalEvents.add(document, 'contextmenu', closeHandler);
        }
        hasAnySelectedDescendant(node) {
            const check = (n) => {
                if (this.selectedNodes.some(s => s.key === n.key))
                    return true;
                if (n.nodes) {
                    for (const child of n.nodes) {
                        if (check(child))
                            return true;
                    }
                }
                return false;
            };
            if (!node.nodes)
                return false;
            for (const child of node.nodes) {
                if (check(child))
                    return true;
            }
            return false;
        }
        refreshAllStacks() {
            var _a;
            const oldExpanded = [...this.expandedParents];
            for (let i = 0; i < this.flatData.length; i++) {
                this.renderStack(i);
            }
            this.updateSelectedArea();
            for (let level = 0; level < oldExpanded.length; level++) {
                const parentKey = oldExpanded[level];
                if (parentKey !== undefined) {
                    const nodeData = (_a = this.flatData[level]) === null || _a === void 0 ? void 0 : _a.find(n => String(n.key) === parentKey);
                    if (nodeData) {
                        this.applyExpand(level, nodeData);
                    }
                }
            }
        }
        updateSelectedArea() {
            const selectedArea = this.container.children[1];
            if (!selectedArea)
                return;
            if (this.selectedNodes.length === 0) {
                selectedArea.textContent = this.options.placeholder;
                return;
            }
            if (this.options.limit === 1) {
                selectedArea.textContent = this.selectedNodes[0].val;
                return;
            }
            selectedArea.innerHTML = '';
            for (const node of this.selectedNodes) {
                const tag = document.createElement('span');
                tag.className = 'inline-flex items-center bg-base-300 rounded-full px-2 py-0.5 text-xs text-base-content';
                tag.textContent = node.val;
                const removeBtn = document.createElement('span');
                removeBtn.className = 'ml-1 cursor-pointer hover:text-error';
                removeBtn.innerHTML = '✕';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeSelected(node.key);
                });
                tag.appendChild(removeBtn);
                selectedArea.appendChild(tag);
            }
        }
        bindEvents() {
            const columnsContainer = this.container.lastChild;
            if (!columnsContainer)
                return;
            // 全局搜索下拉关闭（仅绑定一次）
            if (this.options.searchable) {
                this.globalEvents.add(document, 'click', (e) => {
                    var _a;
                    if (this.searchDropdown &&
                        !((_a = this.searchInput) === null || _a === void 0 ? void 0 : _a.contains(e.target)) &&
                        !this.searchDropdown.contains(e.target)) {
                        this.searchDropdown.remove();
                        this.searchDropdown = null;
                    }
                });
            }
            // 单击事件：展开/收起或选中
            columnsContainer.addEventListener('click', (e) => {
                var _a;
                const a = e.target.closest('a[data-key]');
                if (!a)
                    return;
                const hasChildren = a.getAttribute('data-has-children') === 'true';
                const domKey = a.getAttribute('data-key');
                const stackLevel = parseInt(a.getAttribute('data-stack') || '0');
                const nodeData = (_a = this.flatData[stackLevel]) === null || _a === void 0 ? void 0 : _a.find(n => String(n.key) === domKey);
                if (!nodeData)
                    return;
                if (hasChildren) {
                    if (this.expandedParents[stackLevel] === domKey) {
                        this.collapseFromLevel(stackLevel);
                    }
                    else {
                        this.expandToNextLevel(stackLevel, nodeData);
                    }
                }
                else {
                    if (this.isSelected(nodeData.key)) {
                        this.removeSelected(nodeData.key);
                    }
                    else {
                        this.addSelected(nodeData);
                    }
                }
            });
            // 搜索输入处理
            if (this.searchInput) {
                this.searchInput.addEventListener('input', () => {
                    if (this.searchDebounceTimer)
                        clearTimeout(this.searchDebounceTimer);
                    this.searchDebounceTimer = window.setTimeout(() => {
                        this.handleSearch(this.searchInput.value.trim());
                    }, 300);
                });
                this.searchInput.addEventListener('focus', () => {
                    if (this.searchInput.value.trim()) {
                        this.handleSearch(this.searchInput.value.trim());
                    }
                });
            }
        }
        // ---------- 展开/收缩 ----------
        expandToNextLevel(currentLevel, parentNode) {
            this.expandedParents[currentLevel] = String(parentNode.key);
            this.expandedParents.length = currentLevel + 1;
            const nextLevel = currentLevel + 1;
            if (nextLevel >= this.flatData.length) {
                const childrenNodes = parentNode.originalNode.nodes;
                if (childrenNodes && childrenNodes.length) {
                    this.flatData = dimensionalTree(this.data);
                    this.rebuildStacks();
                }
                return;
            }
            this.applyExpand(currentLevel, parentNode);
            this.applyPathHighlight(currentLevel, parentNode);
        }
        applyExpand(currentLevel, parentNode) {
            var _a;
            const nextLevel = currentLevel + 1;
            if (nextLevel >= this.stacks.length)
                return;
            const nextStackDiv = this.stacks[nextLevel];
            if (!nextStackDiv)
                return;
            const childrenKeys = (((_a = parentNode.nodes) === null || _a === void 0 ? void 0 : _a.map(n => String(n.key))) || []);
            const allLi = nextStackDiv.querySelectorAll('li');
            allLi.forEach(li => li.classList.add('hidden'));
            allLi.forEach(li => {
                const el = li.querySelector('[data-key]');
                if (el && childrenKeys.includes(el.getAttribute('data-key'))) {
                    li.classList.remove('hidden');
                }
            });
            this.collapseDeeperLevels(nextLevel);
            const firstVisible = nextStackDiv.querySelector('li:not(.hidden)');
            if (firstVisible) {
                firstVisible.scrollIntoView({ block: 'nearest' });
            }
            this.updateExpandIcons(currentLevel);
        }
        applyPathHighlight(stackLevel, parentNode) {
            const stackDiv = this.stacks[stackLevel];
            if (!stackDiv)
                return;
            const allA = stackDiv.querySelectorAll('a[data-key]');
            allA.forEach(a => {
                const key = a.getAttribute('data-key');
                if (key === String(parentNode.key)) {
                    a.classList.remove('opacity-40');
                }
                else {
                    a.classList.add('opacity-40');
                }
            });
        }
        collapseFromLevel(level) {
            this.expandedParents.length = level;
            for (let i = level + 1; i < this.stacks.length; i++) {
                const stackDiv = this.stacks[i];
                if (stackDiv) {
                    const allLi = stackDiv.querySelectorAll('li');
                    allLi.forEach(li => li.classList.add('hidden'));
                }
            }
            if (level >= 0) {
                const stackDiv = this.stacks[level];
                if (stackDiv) {
                    const allA = stackDiv.querySelectorAll('a[data-key]');
                    allA.forEach(a => a.classList.remove('opacity-40'));
                }
            }
            this.updateExpandIcons(level);
        }
        collapseDeeperLevels(fromLevel) {
            for (let i = fromLevel + 1; i < this.stacks.length; i++) {
                const stackDiv = this.stacks[i];
                if (stackDiv) {
                    const allLi = stackDiv.querySelectorAll('li');
                    allLi.forEach(li => li.classList.add('hidden'));
                }
            }
        }
        updateExpandIcons(stackLevel) {
            for (let level = 0; level < this.stacks.length; level++) {
                const stackDiv = this.stacks[level];
                if (!stackDiv)
                    continue;
                const allA = stackDiv.querySelectorAll('a[data-has-children="true"]');
                allA.forEach(a => {
                    const key = a.getAttribute('data-key');
                    const icon = a.querySelector('.expand-icon');
                    if (icon) {
                        if (this.expandedParents[level] === key) {
                            icon.style.transform = 'rotate(90deg)';
                        }
                        else {
                            icon.style.transform = '';
                        }
                    }
                });
            }
        }
        rebuildStacks() {
            var _a;
            const columnsContainer = this.container.lastChild;
            if (!columnsContainer)
                return;
            columnsContainer.innerHTML = '';
            this.stacks = [];
            for (let i = 0; i < this.flatData.length; i++) {
                const stackDiv = document.createElement('div');
                stackDiv.className = 'flex-1 min-w-[130px] overflow-y-auto border-r border-base-200 last:border-r-0';
                stackDiv.setAttribute('data-stack', i.toString());
                columnsContainer.appendChild(stackDiv);
                this.stacks.push(stackDiv);
                this.renderStack(i);
            }
            for (let level = 0; level < this.expandedParents.length; level++) {
                const parentKey = this.expandedParents[level];
                if (parentKey !== undefined) {
                    const nodeData = (_a = this.flatData[level]) === null || _a === void 0 ? void 0 : _a.find(n => String(n.key) === parentKey);
                    if (nodeData) {
                        this.applyExpand(level, nodeData);
                    }
                }
            }
        }
        // ---------- 选中逻辑 ----------
        addSelected(node) {
            if (node.nodes && node.nodes.length > 0)
                return;
            if (this.options.limit > 0 && this.selectedNodes.length >= this.options.limit) {
                this.removeSelected(this.selectedNodes[0].key);
            }
            if (!this.isSelected(node.key)) {
                this.selectedNodes.push(node.originalNode);
                this.refreshAllStacks();
                this.options.onChange(this.selectedNodes);
            }
        }
        removeSelected(key) {
            const index = this.selectedNodes.findIndex(n => n.key === key);
            if (index !== -1) {
                this.selectedNodes.splice(index, 1);
                this.refreshAllStacks();
                this.options.onChange(this.selectedNodes);
            }
        }
        isSelected(key) {
            return this.selectedNodes.some(n => n.key === key);
        }
        selectAllChildren(parentNode) {
            this.expandedParents.length = parentNode.stack;
            this.expandedParents[parentNode.stack] = String(parentNode.key);
            const collectLeaves = (node) => {
                if (node.nodes && node.nodes.length > 0) {
                    let leaves = [];
                    node.nodes.forEach(child => {
                        leaves = leaves.concat(collectLeaves(child));
                    });
                    return leaves;
                }
                return [node];
            };
            const leafNodes = collectLeaves(parentNode.originalNode);
            this.selectedNodes = [];
            for (const leaf of leafNodes) {
                if (this.options.limit > 0 && this.selectedNodes.length >= this.options.limit)
                    break;
                this.selectedNodes.push(leaf);
            }
            if (this.options.limit > 0 && leafNodes.length > 0 && this.selectedNodes.length < Math.min(leafNodes.length, this.options.limit)) {
                console.warn(`已超出最大选择数量 ${this.options.limit}，仅选中部分子节点`);
            }
            this.refreshAllStacks();
            this.options.onChange(this.selectedNodes);
        }
        deselectAllChildren(parentNode) {
            const keys = this.getAllDescendantKeys(parentNode.originalNode);
            this.selectedNodes = this.selectedNodes.filter(n => !keys.includes(n.key));
            this.refreshAllStacks();
            this.options.onChange(this.selectedNodes);
        }
        getAllDescendantKeys(node) {
            let keys = [];
            if (node.nodes) {
                node.nodes.forEach(c => {
                    keys.push(c.key);
                    keys.push(...this.getAllDescendantKeys(c));
                });
            }
            return keys;
        }
        // ---------- 搜索 ----------
        handleSearch(keyword) {
            if (this.searchDropdown) {
                this.searchDropdown.remove();
                this.searchDropdown = null;
            }
            if (!keyword)
                return;
            const matched = [];
            for (let s = 0; s < this.flatData.length; s++) {
                for (let i = 0; i < this.flatData[s].length; i++) {
                    const node = this.flatData[s][i];
                    if (node.val.toLowerCase().includes(keyword.toLowerCase())) {
                        matched.push({ stack: s, index: i, node });
                    }
                }
            }
            if (matched.length === 0)
                return;
            const dropdown = document.createElement('div');
            dropdown.className = 'absolute top-8 left-0 right-0 z-50 bg-base-100 border rounded shadow-lg max-h-48 overflow-y-auto';
            const ul = document.createElement('ul');
            ul.className = 'menu menu-xs p-0';
            matched.forEach(m => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.textContent = m.node.val;
                a.addEventListener('click', () => {
                    this.navigateToNode(m.stack, m.index);
                    dropdown.remove();
                    this.searchDropdown = null;
                });
                li.appendChild(a);
                ul.appendChild(li);
            });
            dropdown.appendChild(ul);
            this.container.appendChild(dropdown);
            this.searchDropdown = dropdown;
        }
        navigateToNode(stackLevel, index) {
            var _a;
            const targetFlat = (_a = this.flatData[stackLevel]) === null || _a === void 0 ? void 0 : _a[index];
            if (!targetFlat)
                return;
            this.expandedParents = targetFlat.parentNodes.map(p => String(p));
            this.refreshAllStacks();
            const stackDiv = this.stacks[stackLevel];
            if (stackDiv) {
                const target = stackDiv.querySelector(`[data-index="${index}"]`);
                if (target) {
                    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    target.classList.add('!bg-yellow-100');
                    target.style.color = 'black';
                    setTimeout(() => {
                        target.classList.remove('!bg-yellow-100');
                        target.style.color = 'unset';
                    }, 1500);
                }
            }
        }
        // ---------- 公共接口 ----------
        getValue() { return [...this.selectedNodes]; }
        setValue(keys) {
            const newSelected = [];
            for (const key of keys) {
                const found = this.findNodeByKey(key);
                if (found)
                    newSelected.push(found);
            }
            if (this.options.limit > 0 && newSelected.length > this.options.limit) {
                console.warn(`超出限制数量 ${this.options.limit}，将截取前 ${this.options.limit} 个`);
                newSelected.length = this.options.limit;
            }
            this.selectedNodes = newSelected;
            this.expandedParents = [];
            if (newSelected.length > 0) {
                const firstNode = newSelected[0];
                let targetFlat;
                for (const levelData of this.flatData) {
                    targetFlat = levelData.find(n => n.key === firstNode.key);
                    if (targetFlat)
                        break;
                }
                if (targetFlat) {
                    for (let i = 0; i < targetFlat.parentNodes.length; i++) {
                        this.expandedParents[i] = String(targetFlat.parentNodes[i]);
                    }
                    if (targetFlat.nodes && targetFlat.nodes.length) {
                        this.expandedParents[targetFlat.stack] = String(firstNode.key);
                    }
                }
            }
            this.refreshAllStacks();
            this.options.onChange(this.selectedNodes);
        }
        destroy() {
            this.globalEvents.removeAll();
            if (this.searchDebounceTimer)
                clearTimeout(this.searchDebounceTimer);
            this.container.innerHTML = '';
        }
        findNodeByKey(key, nodes = this.data) {
            for (const node of nodes) {
                if (node.key === key)
                    return node;
                if (node.nodes) {
                    const found = this.findNodeByKey(key, node.nodes);
                    if (found)
                        return found;
                }
            }
            return null;
        }
    }

    class TreeDragDrop {
        constructor(options) {
            this.dragNode = null;
            this.ghost = null;
            this.onDragStart = (e) => {
                const target = e.target.closest('[data-node-key]');
                if (!target)
                    return;
                const key = target.getAttribute('data-node-key');
                const node = this.findNode(key);
                if (!node)
                    return;
                this.dragNode = node;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', key);
                this.ghost = target.cloneNode(true);
                this.ghost.style.position = 'absolute';
                this.ghost.style.opacity = '0.7';
                document.body.appendChild(this.ghost);
                e.dataTransfer.setDragImage(this.ghost, 0, 0);
                target.classList.add('opacity-50');
            };
            this.onDragOver = (e) => {
                e.preventDefault();
                if (!this.dragNode)
                    return;
                const target = e.target.closest('[data-node-key]');
                if (!target)
                    return;
                const rect = target.getBoundingClientRect();
                const yRatio = (e.clientY - rect.top) / rect.height;
                let position = 'inside';
                if (yRatio < 0.25)
                    position = 'before';
                else if (yRatio > 0.75)
                    position = 'after';
                e.dataTransfer.dropEffect = 'move';
                target.__dropPosition = position;
            };
            this.onDrop = (e) => {
                e.preventDefault();
                if (!this.dragNode)
                    return;
                const target = e.target.closest('[data-node-key]');
                if (!target)
                    return;
                const targetKey = target.getAttribute('data-node-key');
                const targetNode = this.findNode(targetKey);
                const position = target.__dropPosition || 'inside';
                this.clearIndicators();
                this.options.onDragEnd(this.dragNode, targetNode, position);
                this.dragNode = null;
            };
            this.options = options;
            this.init();
        }
        init() {
            const { container } = this.options;
            container.addEventListener('dragstart', this.onDragStart);
            container.addEventListener('dragover', this.onDragOver);
            container.addEventListener('drop', this.onDrop);
        }
        findNode(key) {
            const search = (nodes) => {
                for (const n of nodes) {
                    if (String(n.key) === key)
                        return n;
                    if (n.nodes) {
                        const found = search(n.nodes);
                        if (found)
                            return found;
                    }
                }
                return null;
            };
            return search(this.options.getFlattenedNodes());
        }
        clearIndicators() {
            document.querySelectorAll('[data-node-key].opacity-50').forEach(el => el.classList.remove('opacity-50'));
            if (this.ghost) {
                this.ghost.remove();
                this.ghost = null;
            }
        }
        destroy() {
            const { container } = this.options;
            container.removeEventListener('dragstart', this.onDragStart);
            container.removeEventListener('dragover', this.onDragOver);
            container.removeEventListener('drop', this.onDrop);
            this.clearIndicators();
        }
    }

    class CascadeTree {
        constructor(selector, data, options) {
            this.flatData = [];
            this.stacks = [];
            this.searchInput = null;
            this.searchDropdown = null;
            this.searchDebounceTimer = null;
            this.expandedParents = [];
            this.globalEvents = new GlobalEventManager();
            this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!this.container)
                throw new Error('Container element not found');
            this.data = data;
            this.options = {
                searchable: true,
                parentNode: document.body,
                formRenderer: undefined,
                ...options,
            };
            this.callbacks = {
                onInsert: options.onInsert,
                onUpdate: options.onUpdate,
                onDelete: options.onDelete,
                onMigrate: options.onMigrate,
                onExchange: options.onExchange,
            };
            this.uniqueId = generateUniqueString(6);
            this.init();
        }
        init() {
            this.flatData = dimensionalTree(this.data);
            this.render();
            this.bindEvents();
            if (this.options.draggable) {
                this.treeDragDrop = new TreeDragDrop({
                    container: this.container,
                    getFlattenedNodes: () => this.data,
                    onDragEnd: async (dragged, target, position) => {
                        if (this.options.onDragEnd) {
                            const success = await this.options.onDragEnd(dragged, target, position);
                            if (success)
                                await this.refreshData();
                        }
                        else {
                            this.moveNode(dragged, target, position);
                            await this.refreshData();
                        }
                    }
                });
            }
        }
        render() {
            this.container.innerHTML = '';
            this.container.className = 'flex flex-col gap-2 bg-base-100 p-2 rounded-lg border border-base-300 relative';
            this.container.addEventListener('contextmenu', (e) => e.preventDefault());
            if (this.options.searchable !== false) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'input input-bordered input-sm w-full';
                input.placeholder = '搜索节点...';
                this.container.appendChild(input);
                this.searchInput = input;
            }
            const columnsContainer = document.createElement('div');
            columnsContainer.className = 'flex overflow-x-auto h-60 gap-1';
            this.container.appendChild(columnsContainer);
            this.stacks = [];
            for (let i = 0; i < this.flatData.length; i++) {
                const stackDiv = document.createElement('div');
                stackDiv.className = 'flex-1 min-w-[130px] overflow-y-auto border-r border-base-200 last:border-r-0';
                stackDiv.setAttribute('data-stack', i.toString());
                columnsContainer.appendChild(stackDiv);
                this.stacks.push(stackDiv);
                this.renderStack(i);
            }
        }
        renderStack(stackLevel) {
            const stackDiv = this.stacks[stackLevel];
            if (!stackDiv)
                return;
            stackDiv.innerHTML = '';
            const nodes = this.flatData[stackLevel];
            if (!nodes || nodes.length === 0)
                return;
            const ul = document.createElement('ul');
            ul.className = 'menu menu-xs p-0 bg-base-100 rounded-lg w-full';
            for (let idx = 0; idx < nodes.length; idx++) {
                const node = nodes[idx];
                const li = document.createElement('li');
                if (stackLevel > 0)
                    li.classList.add('hidden');
                const hasChildren = (node.nodes && node.nodes.length > 0) || !!this.options.loadChildren;
                const a = document.createElement('a');
                a.className = 'flex items-center justify-between py-1.5 px-2 hover:bg-base-200 cursor-pointer rounded';
                a.setAttribute('data-key', String(node.key));
                a.setAttribute('data-stack', String(stackLevel));
                a.setAttribute('data-index', String(idx));
                a.setAttribute('data-has-children', hasChildren ? 'true' : 'false');
                const left = document.createElement('span');
                left.className = 'flex items-center gap-1';
                if (hasChildren) {
                    const expandIcon = document.createElement('span');
                    expandIcon.className = 'expand-icon transition-transform duration-200';
                    expandIcon.innerHTML = Icon.caret_right;
                    if (String(this.expandedParents[stackLevel]) === String(node.key)) {
                        expandIcon.style.transform = 'rotate(90deg)';
                    }
                    left.appendChild(expandIcon);
                }
                const textSpan = document.createElement('span');
                textSpan.className = 'truncate';
                textSpan.textContent = node.val;
                left.appendChild(textSpan);
                a.appendChild(left);
                a.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menuItems = [
                        { title: '新增子节点', func: () => this.insertChild(node) },
                        { title: '修改名称', func: () => this.updateNode(node) },
                        { title: '删除节点', func: () => this.deleteNode(node) },
                    ];
                    if (node.parentNodes.length > 0) {
                        menuItems.push({ title: '迁移到根', func: () => this.migrateToRoot(node) });
                    }
                    menuItems.push({ title: '交换节点', func: () => this.exchangeNode(node) });
                    this.showContextMenu(a, menuItems, e);
                });
                li.appendChild(a);
                ul.appendChild(li);
            }
            stackDiv.appendChild(ul);
        }
        showContextMenu(anchor, items, event) {
            const existing = document.querySelector('.cascade-context-menu');
            if (existing)
                existing.remove();
            const menu = document.createElement('ul');
            menu.className = 'cascade-context-menu menu bg-base-200 rounded shadow-lg p-1 absolute z-50';
            menu.style.left = event.pageX + 'px';
            menu.style.top = event.pageY + 'px';
            menu.style.minWidth = '120px';
            items.forEach(item => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.textContent = item.title;
                a.className = 'block px-2 py-1 hover:bg-primary hover:text-primary-content rounded text-sm cursor-pointer';
                a.addEventListener('click', () => {
                    menu.remove();
                    item.func();
                });
                li.appendChild(a);
                menu.appendChild(li);
            });
            document.body.appendChild(menu);
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                }
            };
            this.globalEvents.add(document, 'click', closeHandler);
            this.globalEvents.add(document, 'contextmenu', closeHandler);
        }
        refreshAllStacks() {
            var _a;
            const oldExpanded = [...this.expandedParents];
            for (let i = 0; i < this.flatData.length; i++) {
                this.renderStack(i);
            }
            for (let level = 0; level < oldExpanded.length; level++) {
                const parentKey = oldExpanded[level];
                if (parentKey !== undefined) {
                    const nodeData = (_a = this.flatData[level]) === null || _a === void 0 ? void 0 : _a.find(n => String(n.key) === parentKey);
                    if (nodeData) {
                        this.applyExpand(level, nodeData);
                    }
                }
            }
        }
        async expandToNextLevel(currentLevel, parentNode) {
            // 先设置展开状态，以便 rebuildStacks 时能恢复
            this.expandedParents[currentLevel] = String(parentNode.key);
            this.expandedParents.length = currentLevel + 1;
            const node = parentNode.originalNode;
            if ((!node.nodes || node.nodes.length === 0) && this.options.loadChildren) {
                const expandIcon = this.getExpandIconElement(currentLevel, node.key);
                if (expandIcon)
                    expandIcon.innerHTML = Icon.sub_loading;
                try {
                    const children = await this.options.loadChildren(node);
                    node.nodes = children;
                    this.flatData = dimensionalTree(this.data);
                    this.rebuildStacks(); // 会保留 expandedParents 并应用展开
                }
                catch (e) {
                    console.error('加载子节点失败', e);
                }
                if (expandIcon)
                    expandIcon.innerHTML = Icon.caret_right;
                return;
            }
            const nextLevel = currentLevel + 1;
            if (nextLevel >= this.flatData.length) {
                const childrenNodes = parentNode.originalNode.nodes;
                if (childrenNodes && childrenNodes.length) {
                    this.flatData = dimensionalTree(this.data);
                    this.rebuildStacks();
                }
                return;
            }
            this.applyExpand(currentLevel, parentNode);
            this.applyPathHighlight(currentLevel, parentNode);
        }
        getExpandIconElement(stackLevel, key) {
            const stackDiv = this.stacks[stackLevel];
            if (!stackDiv)
                return null;
            const a = stackDiv.querySelector(`a[data-key="${String(key)}"]`);
            return a ? a.querySelector('.expand-icon') : null;
        }
        applyExpand(currentLevel, parentNode) {
            var _a;
            const nextLevel = currentLevel + 1;
            if (nextLevel >= this.stacks.length)
                return;
            const nextStackDiv = this.stacks[nextLevel];
            if (!nextStackDiv)
                return;
            const childrenKeys = (((_a = parentNode.nodes) === null || _a === void 0 ? void 0 : _a.map(n => String(n.key))) || []);
            const allLi = nextStackDiv.querySelectorAll('li');
            allLi.forEach(li => li.classList.add('hidden'));
            allLi.forEach(li => {
                const el = li.querySelector('[data-key]');
                if (el && childrenKeys.includes(el.getAttribute('data-key'))) {
                    li.classList.remove('hidden');
                }
            });
            this.collapseDeeperLevels(nextLevel);
            const firstVisible = nextStackDiv.querySelector('li:not(.hidden)');
            if (firstVisible) {
                firstVisible.scrollIntoView({ block: 'nearest' });
            }
            this.updateExpandIcons(currentLevel);
        }
        applyPathHighlight(stackLevel, parentNode) {
            const stackDiv = this.stacks[stackLevel];
            if (!stackDiv)
                return;
            const allA = stackDiv.querySelectorAll('a[data-key]');
            allA.forEach(a => {
                const key = a.getAttribute('data-key');
                if (key === String(parentNode.key)) {
                    a.classList.remove('opacity-40');
                }
                else {
                    a.classList.add('opacity-40');
                }
            });
        }
        collapseFromLevel(level) {
            this.expandedParents.length = level;
            for (let i = level + 1; i < this.stacks.length; i++) {
                const stackDiv = this.stacks[i];
                if (stackDiv) {
                    const allLi = stackDiv.querySelectorAll('li');
                    allLi.forEach(li => li.classList.add('hidden'));
                }
            }
            if (level >= 0) {
                const stackDiv = this.stacks[level];
                if (stackDiv) {
                    const allA = stackDiv.querySelectorAll('a[data-key]');
                    allA.forEach(a => a.classList.remove('opacity-40'));
                }
            }
            this.updateExpandIcons(level);
        }
        collapseDeeperLevels(fromLevel) {
            for (let i = fromLevel + 1; i < this.stacks.length; i++) {
                const stackDiv = this.stacks[i];
                if (stackDiv) {
                    const allLi = stackDiv.querySelectorAll('li');
                    allLi.forEach(li => li.classList.add('hidden'));
                }
            }
        }
        updateExpandIcons(stackLevel) {
            for (let level = 0; level < this.stacks.length; level++) {
                const stackDiv = this.stacks[level];
                if (!stackDiv)
                    continue;
                const allA = stackDiv.querySelectorAll('a[data-has-children="true"]');
                allA.forEach(a => {
                    const key = a.getAttribute('data-key');
                    const icon = a.querySelector('.expand-icon');
                    if (icon) {
                        if (this.expandedParents[level] === key) {
                            icon.style.transform = 'rotate(90deg)';
                        }
                        else {
                            icon.style.transform = '';
                        }
                    }
                });
            }
        }
        rebuildStacks() {
            var _a;
            const columnsContainer = this.container.lastChild;
            if (!columnsContainer)
                return;
            columnsContainer.innerHTML = '';
            this.stacks = [];
            for (let i = 0; i < this.flatData.length; i++) {
                const stackDiv = document.createElement('div');
                stackDiv.className = 'flex-1 min-w-[130px] overflow-y-auto border-r border-base-200 last:border-r-0';
                stackDiv.setAttribute('data-stack', i.toString());
                columnsContainer.appendChild(stackDiv);
                this.stacks.push(stackDiv);
                this.renderStack(i);
            }
            for (let level = 0; level < this.expandedParents.length; level++) {
                const parentKey = this.expandedParents[level];
                if (parentKey !== undefined) {
                    const nodeData = (_a = this.flatData[level]) === null || _a === void 0 ? void 0 : _a.find(n => String(n.key) === parentKey);
                    if (nodeData) {
                        this.applyExpand(level, nodeData);
                    }
                }
            }
        }
        handleSearch(keyword) {
            if (this.searchDropdown) {
                this.searchDropdown.remove();
                this.searchDropdown = null;
            }
            if (!keyword)
                return;
            const matched = [];
            for (let s = 0; s < this.flatData.length; s++) {
                for (let i = 0; i < this.flatData[s].length; i++) {
                    const node = this.flatData[s][i];
                    if (node.val.toLowerCase().includes(keyword.toLowerCase())) {
                        matched.push({ stack: s, index: i, node });
                    }
                }
            }
            if (matched.length === 0)
                return;
            const dropdown = document.createElement('div');
            dropdown.className = 'absolute top-8 left-0 right-0 z-50 bg-base-100 border rounded shadow-lg max-h-48 overflow-y-auto';
            const ul = document.createElement('ul');
            ul.className = 'menu menu-xs p-0';
            matched.forEach(m => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.textContent = m.node.val;
                a.addEventListener('click', () => {
                    this.navigateToNode(m.stack, m.index);
                    dropdown.remove();
                    this.searchDropdown = null;
                });
                li.appendChild(a);
                ul.appendChild(li);
            });
            dropdown.appendChild(ul);
            this.container.appendChild(dropdown);
            this.searchDropdown = dropdown;
        }
        navigateToNode(stackLevel, index) {
            var _a;
            const targetFlat = (_a = this.flatData[stackLevel]) === null || _a === void 0 ? void 0 : _a[index];
            if (!targetFlat)
                return;
            this.expandedParents = targetFlat.parentNodes.map(p => String(p));
            if (targetFlat.nodes && targetFlat.nodes.length) {
                this.expandedParents[stackLevel] = String(targetFlat.key);
            }
            this.refreshAllStacks();
            const stackDiv = this.stacks[stackLevel];
            if (stackDiv) {
                const target = stackDiv.querySelector(`[data-index="${index}"]`);
                if (target) {
                    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    target.classList.add('!bg-yellow-100');
                    target.style.color = 'black';
                    setTimeout(() => {
                        target.classList.remove('!bg-yellow-100');
                        target.style.color = 'unset';
                    }, 1500);
                }
            }
        }
        bindEvents() {
            const columnsContainer = this.container.lastChild;
            if (!columnsContainer)
                return;
            // 搜索关闭全局事件（仅绑定一次）
            this.globalEvents.add(document, 'click', (e) => {
                var _a;
                if (this.searchDropdown &&
                    !((_a = this.searchInput) === null || _a === void 0 ? void 0 : _a.contains(e.target)) &&
                    !this.searchDropdown.contains(e.target)) {
                    this.searchDropdown.remove();
                    this.searchDropdown = null;
                }
            });
            columnsContainer.addEventListener('click', (e) => {
                var _a;
                const a = e.target.closest('a[data-key]');
                if (!a)
                    return;
                const hasChildren = a.getAttribute('data-has-children') === 'true';
                const domKey = a.getAttribute('data-key');
                const stackLevel = parseInt(a.getAttribute('data-stack') || '0');
                const nodeData = (_a = this.flatData[stackLevel]) === null || _a === void 0 ? void 0 : _a.find(n => String(n.key) === domKey);
                if (!nodeData)
                    return;
                if (hasChildren) {
                    if (this.expandedParents[stackLevel] === domKey) {
                        this.collapseFromLevel(stackLevel);
                    }
                    else {
                        this.expandToNextLevel(stackLevel, nodeData);
                    }
                }
            });
            if (this.searchInput) {
                this.searchInput.addEventListener('input', () => {
                    if (this.searchDebounceTimer)
                        clearTimeout(this.searchDebounceTimer);
                    this.searchDebounceTimer = window.setTimeout(() => {
                        this.handleSearch(this.searchInput.value.trim());
                    }, 300);
                });
                this.searchInput.addEventListener('focus', () => {
                    if (this.searchInput.value.trim()) {
                        this.handleSearch(this.searchInput.value.trim());
                    }
                });
            }
        }
        // ---------- 模态对话框 ----------
        showModal(content, title) {
            return new Promise((resolve) => {
                const modal = new Modal({
                    parentNode: this.container,
                    title,
                    gauze: true,
                    aspect: { width: '90%', height: 'auto' },
                });
                modal.setContent(content);
                modal.make();
                const modalNode = modal.getNode();
                if (!modalNode) {
                    resolve(null);
                    return;
                }
                const closeBtn = modalNode.querySelector('.btn-circle');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        resolve(null);
                        modal.close();
                    });
                }
                modalNode.addEventListener('click', (e) => {
                    if (e.target === modalNode) {
                        resolve(null);
                        modal.close();
                    }
                });
                const form = modalNode.querySelector('form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const data = {};
                        formData.forEach((value, key) => { data[key] = value; });
                        resolve(data);
                        modal.close();
                    });
                }
                else {
                    resolve({});
                    modal.close();
                }
            });
        }
        // ---------- 表单生成 ----------
        defaultFormContent(node, type, context) {
            const form = document.createElement('form');
            form.className = 'flex flex-col gap-2';
            if (type === 'insert' || type === 'update') {
                form.innerHTML = `
        <label class="text-sm">名称</label>
        <input name="val" class="input input-bordered input-sm w-full" value="${type === 'update' ? (node === null || node === void 0 ? void 0 : node.val) || '' : ''}" required />
        <button type="submit" class="btn btn-sm btn-primary mt-2">确认</button>
      `;
            }
            else if (type === 'delete') {
                form.innerHTML = `
        <p class="text-sm text-error">确定要删除节点「${node === null || node === void 0 ? void 0 : node.val}」及其所有子节点吗？</p>
        <button type="submit" class="btn btn-sm btn-error mt-2">确认删除</button>
      `;
            }
            else if (type === 'migrate') {
                form.innerHTML = `
        <p class="text-sm">将「${node === null || node === void 0 ? void 0 : node.val}」移至根目录？</p>
        <button type="submit" class="btn btn-sm btn-warning mt-2">确认迁移</button>
      `;
            }
            else if (type === 'exchange') {
                form.className = 'flex flex-col gap-2';
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'targetKey';
                form.appendChild(hiddenInput);
                const container = document.createElement('div');
                container.className = 'flex flex-col gap-1 relative';
                const label = document.createElement('label');
                label.className = 'text-sm';
                label.textContent = '目标节点';
                container.appendChild(label);
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.className = 'input input-bordered input-sm w-full';
                searchInput.placeholder = '输入名称搜索...';
                container.appendChild(searchInput);
                const dropdown = document.createElement('div');
                dropdown.className = 'hidden absolute top-full left-0 right-0 z-50 bg-base-100 border rounded shadow-lg max-h-40 overflow-y-auto mt-1';
                container.appendChild(dropdown);
                form.appendChild(container);
                if (node) {
                    const allNodes = this.getAllNodes(this.data).filter(n => n.key != node.key);
                    searchInput.addEventListener('input', () => {
                        const keyword = searchInput.value.trim().toLowerCase();
                        dropdown.innerHTML = '';
                        if (!keyword) {
                            dropdown.classList.add('hidden');
                            return;
                        }
                        const matched = allNodes.filter(n => n.val.toLowerCase().includes(keyword));
                        if (matched.length === 0) {
                            dropdown.classList.add('hidden');
                            return;
                        }
                        matched.forEach(m => {
                            const item = document.createElement('div');
                            item.className = 'px-2 py-1 hover:bg-base-200 cursor-pointer text-sm';
                            item.textContent = m.val;
                            item.addEventListener('click', () => {
                                searchInput.value = m.val;
                                hiddenInput.value = String(m.key);
                                dropdown.classList.add('hidden');
                            });
                            dropdown.appendChild(item);
                        });
                        dropdown.classList.remove('hidden');
                    });
                    // 使用全局事件管理器，避免泄漏（destroy 时会统一移除）
                    this.globalEvents.add(document, 'click', (e) => {
                        if (!container.contains(e.target)) {
                            dropdown.classList.add('hidden');
                        }
                    });
                }
                const submitBtn = document.createElement('button');
                submitBtn.type = 'submit';
                submitBtn.className = 'btn btn-sm btn-secondary mt-2';
                submitBtn.textContent = '确认交换';
                form.appendChild(submitBtn);
            }
            return form;
        }
        getAllNodes(nodes) {
            let result = [];
            for (const node of nodes) {
                result.push(node);
                if (node.nodes) {
                    result = result.concat(this.getAllNodes(node.nodes));
                }
            }
            return result;
        }
        getFormContent(node, type, context) {
            if (this.options.formRenderer) {
                const custom = this.options.formRenderer(node, type, context);
                if (custom)
                    return custom;
            }
            return this.defaultFormContent(node, type, context);
        }
        // ---------- CRUD ----------
        async insertChild(parentNode) {
            const form = this.getFormContent(parentNode.originalNode, 'insert', { parent: parentNode.originalNode });
            const result = await this.showModal(form, '新增节点');
            if (!result || !result.val)
                return;
            let success = false;
            if (this.callbacks.onInsert) {
                success = !!(await this.callbacks.onInsert(parentNode.originalNode.key, { val: result.val }));
            }
            else {
                try {
                    await request({
                        url: this.options.apiUrl,
                        method: 'POST',
                        data: { parent_id: parentNode.originalNode.key, val: result.val, ...result }
                    });
                    success = true;
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (success)
                await this.refreshData();
        }
        async updateNode(flatNode) {
            const node = flatNode.originalNode;
            const form = this.getFormContent(node, 'update');
            const result = await this.showModal(form, '修改节点');
            if (!result || !result.val || result.val === node.val)
                return;
            let success = false;
            if (this.callbacks.onUpdate) {
                success = !!(await this.callbacks.onUpdate(node, result.val));
            }
            else {
                try {
                    await request({
                        url: `${this.options.apiUrl}/${node.key}`,
                        method: 'PUT',
                        data: { val: result.val, ...result }
                    });
                    success = true;
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (success)
                await this.refreshData();
        }
        async deleteNode(flatNode) {
            const node = flatNode.originalNode;
            const form = this.getFormContent(node, 'delete');
            const result = await this.showModal(form, '删除节点');
            if (!result)
                return;
            let success = false;
            if (this.callbacks.onDelete) {
                success = !!(await this.callbacks.onDelete(node));
            }
            else {
                try {
                    await request({
                        url: `${this.options.apiUrl}/${node.key}`,
                        method: 'DELETE'
                    });
                    success = true;
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (success)
                await this.refreshData();
        }
        async migrateToRoot(flatNode) {
            const node = flatNode.originalNode;
            const form = this.getFormContent(node, 'migrate');
            const result = await this.showModal(form, '迁移到根');
            if (!result)
                return;
            let success = false;
            const targetKey = 0;
            if (this.callbacks.onMigrate) {
                success = !!(await this.callbacks.onMigrate(node, targetKey));
            }
            else {
                try {
                    await request({
                        url: `${this.options.apiUrl}/migrate`,
                        method: 'POST',
                        data: { node_key: node.key, target_key: targetKey }
                    });
                    success = true;
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (success)
                await this.refreshData();
        }
        async exchangeNode(flatNode) {
            const node = flatNode.originalNode;
            const form = this.getFormContent(node, 'exchange');
            const result = await this.showModal(form, '交换节点');
            if (!result || !result.targetKey)
                return;
            let success = false;
            if (this.callbacks.onExchange) {
                const targetNode = this.findNodeByKey(result.targetKey);
                if (targetNode) {
                    success = !!(await this.callbacks.onExchange(node, targetNode));
                }
                else {
                    console.warn('目标节点未找到');
                }
            }
            else {
                try {
                    await request({
                        url: `${this.options.apiUrl}/exchange`,
                        method: 'POST',
                        data: { node_key: node.key, target_key: result.targetKey }
                    });
                    success = true;
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (success)
                await this.refreshData();
        }
        // ---------- 节点移动 ----------
        moveNode(dragged, target, position) {
            this.removeNodeFromTree(this.data, dragged);
            if (position === 'inside') {
                if (!target.nodes)
                    target.nodes = [];
                target.nodes.push(dragged);
            }
            else {
                this.insertNodeAdjacent(this.data, target, dragged, position);
            }
        }
        removeNodeFromTree(nodes, node) {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].key === node.key) {
                    nodes.splice(i, 1);
                    return;
                }
                if (nodes[i].nodes)
                    this.removeNodeFromTree(nodes[i].nodes, node);
            }
        }
        insertNodeAdjacent(nodes, target, newNode, position) {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].key === target.key) {
                    if (position === 'before')
                        nodes.splice(i, 0, newNode);
                    else
                        nodes.splice(i + 1, 0, newNode);
                    return;
                }
                if (nodes[i].nodes)
                    this.insertNodeAdjacent(nodes[i].nodes, target, newNode, position);
            }
        }
        async refreshData() {
            try {
                const response = await request({ url: this.options.apiUrl, method: 'GET' });
                const newData = Array.isArray(response) ? response : response.data || response;
                if (Array.isArray(newData)) {
                    this.data = newData;
                    this.flatData = dimensionalTree(newData);
                    this.rebuildStacks();
                }
            }
            catch (e) {
                console.error('刷新树数据失败', e);
            }
        }
        findNodeByKey(key, nodes = this.data) {
            for (const node of nodes) {
                if (node.key == key)
                    return node;
                if (node.nodes) {
                    const found = this.findNodeByKey(key, node.nodes);
                    if (found)
                        return found;
                }
            }
            return null;
        }
        getData() {
            return this.data;
        }
        setData(data) {
            this.data = data;
            this.flatData = dimensionalTree(data);
            this.rebuildStacks();
        }
        destroy() {
            var _a;
            (_a = this.treeDragDrop) === null || _a === void 0 ? void 0 : _a.destroy();
            this.globalEvents.removeAll();
            if (this.searchDebounceTimer)
                clearTimeout(this.searchDebounceTimer);
            this.container.innerHTML = '';
        }
    }

    class Sortable {
        constructor(list, options = {}) {
            var _a, _b, _c, _d;
            this.dragItem = null;
            this.placeholder = null;
            this.clone = null;
            this.dragging = false;
            this.startIndex = -1;
            this.dragOffset = { x: 0, y: 0 };
            this.startScrollTop = 0;
            this.startScrollLeft = 0;
            // ──────────────────────── 拖拽生命周期 ────────────────────────
            this.onStart = (e) => {
                if (this.dragging)
                    return;
                // 确定拖拽目标
                let item = null;
                if (this.options.handle) {
                    const handleEl = e.target.closest(this.options.handle);
                    if (handleEl) {
                        item = handleEl.closest('[data-sortable-item]');
                    }
                }
                else {
                    item = e.target.closest('[data-sortable-item]');
                }
                if (!item)
                    return;
                // 防止干扰输入框
                const tag = e.target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
                    return;
                e.preventDefault();
                document.body.style.userSelect = 'none';
                this.dragItem = item;
                // 获取所有项（此时占位符尚未创建，dragItem 仍在列表中）
                const allItems = this.getAllItems();
                this.startIndex = allItems.indexOf(item);
                const rect = item.getBoundingClientRect();
                this.dragOffset = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                };
                this.startScrollTop = this.list.scrollTop;
                this.startScrollLeft = this.list.scrollLeft;
                // 创建占位符并插入到原位置
                this.placeholder = this.createPlaceholder(item);
                item.parentNode.insertBefore(this.placeholder, item);
                // 创建拖拽幽灵
                this.clone = this.cloneWithLayout(item, rect);
                document.body.appendChild(this.clone);
                this.clone.getBoundingClientRect(); // 强制重排
                // 隐藏原元素
                item.style.display = 'none';
                this.dragging = true;
                window.addEventListener('pointermove', this.onMove);
                window.addEventListener('pointerup', this.onEnd);
            };
            this.onMove = (e) => {
                if (!this.dragging || !this.clone || !this.placeholder)
                    return;
                e.preventDefault();
                let newLeft = e.clientX - this.dragOffset.x;
                let newTop = e.clientY - this.dragOffset.y;
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - this.clone.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - this.clone.offsetHeight));
                this.clone.style.left = `${newLeft}px`;
                this.clone.style.top = `${newTop}px`;
                this.autoScroll(e);
                this.updatePlaceholderPosition(e);
            };
            this.onEnd = () => {
                var _a;
                if (!this.dragging || !this.dragItem || !this.placeholder) {
                    this.cleanup();
                    return;
                }
                window.removeEventListener('pointermove', this.onMove);
                window.removeEventListener('pointerup', this.onEnd);
                if (this.clone) {
                    this.clone.remove();
                    this.clone = null;
                }
                // 恢复原元素
                this.dragItem.style.display = '';
                // 将原元素移动到占位符位置
                (_a = this.placeholder.parentNode) === null || _a === void 0 ? void 0 : _a.insertBefore(this.dragItem, this.placeholder);
                this.placeholder.remove();
                this.placeholder = null;
                // 收集新的顺序
                const order = [];
                const currentItems = this.getAllItems(); // 此时 dragItem 已回到列表
                currentItems.forEach((el, idx) => {
                    const id = el.dataset.id;
                    order.push(id !== undefined ? id : idx);
                });
                this.options.onSort(order);
                this.cleanup();
            };
            this.list = list;
            this.options = {
                direction: (_a = options.direction) !== null && _a !== void 0 ? _a : 'vertical',
                handle: (_b = options.handle) !== null && _b !== void 0 ? _b : '',
                animationSpeed: (_c = options.animationSpeed) !== null && _c !== void 0 ? _c : 180,
                onSort: (_d = options.onSort) !== null && _d !== void 0 ? _d : (() => { }),
            };
            this.init();
        }
        init() {
            this.list.addEventListener('pointerdown', this.onStart);
        }
        // ──────────────────────── 元素类型判断 ────────────────────────
        getItemType(el) {
            return el.tagName === 'TR' ? 'row' : 'block';
        }
        isVertical() {
            return this.options.direction === 'vertical';
        }
        getPoint(e) {
            return this.isVertical() ? e.clientY : e.clientX;
        }
        getPrimarySize(el) {
            const rect = el.getBoundingClientRect();
            return this.isVertical() ? rect.height : rect.width;
        }
        getPrimaryClientPos(el) {
            const rect = el.getBoundingClientRect();
            return this.isVertical() ? rect.top : rect.left;
        }
        getItems() {
            return Array.from(this.list.querySelectorAll('[data-sortable-item]'))
                .filter(el => el !== this.placeholder && el !== this.dragItem);
        }
        // 获取所有项（包含当前拖拽项），用于计算初始索引
        getAllItems() {
            return Array.from(this.list.querySelectorAll('[data-sortable-item]'))
                .filter(el => el !== this.placeholder);
        }
        // ──────────────────────── 占位符与克隆 ────────────────────────
        createPlaceholder(item) {
            const type = this.getItemType(item);
            if (type === 'row') {
                const tr = document.createElement('tr');
                tr.className = 'sortable-placeholder';
                const cells = Array.from(item.children);
                cells.forEach((cell) => {
                    const td = document.createElement('td');
                    const width = cell.getBoundingClientRect().width;
                    td.style.width = `${width}px`;
                    td.style.height = `${this.getPrimarySize(item)}px`;
                    td.style.border = '1px dashed #ccc';
                    td.style.backgroundColor = 'rgba(0,0,0,0.05)';
                    td.innerHTML = '&nbsp;';
                    tr.appendChild(td);
                });
                return tr;
            }
            const div = document.createElement('div');
            div.className = 'sortable-placeholder';
            div.style.height = `${this.getPrimarySize(item)}px`;
            div.style.width = '100%';
            return div;
        }
        cloneWithLayout(src, rect) {
            const clone = src.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.top = `${rect.top}px`;
            clone.style.left = `${rect.left}px`;
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.margin = '0';
            clone.style.zIndex = '10000';
            clone.style.pointerEvents = 'none';
            clone.style.transition = 'none';
            clone.style.boxSizing = 'border-box';
            const bgColor = window.getComputedStyle(src).backgroundColor;
            clone.style.backgroundColor = bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' ? bgColor : '#fff';
            clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            clone.style.opacity = '0.95';
            // 处理表格行的克隆
            if (src.tagName === 'TR') {
                clone.style.display = 'flex';
                clone.style.flexDirection = 'row';
                const cells = Array.from(src.children);
                const cloneCells = Array.from(clone.children);
                cells.forEach((cell, idx) => {
                    if (!cloneCells[idx])
                        return;
                    const width = cell.getBoundingClientRect().width;
                    cloneCells[idx].style.width = `${width}px`;
                    cloneCells[idx].style.flex = '0 0 auto';
                    const computed = window.getComputedStyle(cell);
                    cloneCells[idx].style.padding = computed.padding;
                    cloneCells[idx].style.border = computed.border;
                    cloneCells[idx].style.whiteSpace = computed.whiteSpace;
                    cloneCells[idx].style.backgroundColor = bgColor;
                });
            }
            return clone;
        }
        autoScroll(e) {
            const scrollSpeed = 8;
            const edgeThreshold = 60;
            const rect = this.list.getBoundingClientRect();
            if (this.isVertical()) {
                const mouseY = e.clientY;
                if (mouseY - rect.top < edgeThreshold && mouseY - rect.top > 0) {
                    this.list.scrollTop -= scrollSpeed;
                }
                else if (rect.bottom - mouseY < edgeThreshold && rect.bottom - mouseY > 0) {
                    this.list.scrollTop += scrollSpeed;
                }
            }
            else {
                const mouseX = e.clientX;
                if (mouseX - rect.left < edgeThreshold && mouseX - rect.left > 0) {
                    this.list.scrollLeft -= scrollSpeed;
                }
                else if (rect.right - mouseX < edgeThreshold && rect.right - mouseX > 0) {
                    this.list.scrollLeft += scrollSpeed;
                }
            }
        }
        updatePlaceholderPosition(e) {
            const mousePos = this.getPoint(e);
            const items = this.getItems();
            if (items.length === 0)
                return;
            let targetItem = null;
            let insertAfter = false;
            const lastItem = items[items.length - 1];
            const firstItem = items[0];
            if (!lastItem)
                return;
            const lastItemEnd = this.getPrimaryClientPos(lastItem) + this.getPrimarySize(lastItem);
            const firstItemPos = this.getPrimaryClientPos(firstItem);
            if (mousePos > lastItemEnd) {
                targetItem = lastItem;
                insertAfter = true;
            }
            else if (mousePos < firstItemPos) {
                targetItem = firstItem;
                insertAfter = false;
            }
            else {
                let minDist = Infinity;
                for (const el of items) {
                    if (el === this.dragItem)
                        continue;
                    const elPos = this.getPrimaryClientPos(el);
                    const center = elPos + this.getPrimarySize(el) / 2;
                    const dist = Math.abs(mousePos - center);
                    if (dist < minDist) {
                        minDist = dist;
                        targetItem = el;
                        insertAfter = mousePos > center;
                    }
                }
            }
            if (targetItem && this.placeholder) {
                this.list.insertBefore(this.placeholder, insertAfter ? targetItem.nextSibling : targetItem);
            }
        }
        cleanup() {
            var _a, _b;
            this.dragging = false;
            this.dragItem = null;
            (_a = this.placeholder) === null || _a === void 0 ? void 0 : _a.remove();
            this.placeholder = null;
            (_b = this.clone) === null || _b === void 0 ? void 0 : _b.remove();
            this.clone = null;
            document.body.style.userSelect = '';
        }
        // ──────────────────────── 公共方法 ────────────────────────
        destroy() {
            window.removeEventListener('pointermove', this.onMove);
            window.removeEventListener('pointerup', this.onEnd);
            this.list.removeEventListener('pointerdown', this.onStart);
            // 确保残留的占位符和克隆被移除
            if (this.placeholder) {
                this.placeholder.remove();
                this.placeholder = null;
            }
            if (this.clone) {
                this.clone.remove();
                this.clone = null;
            }
            document.body.style.userSelect = '';
            this.dragging = false;
            this.dragItem = null;
        }
    }

    class EditableTable {
        constructor(selector, columns, options = {}) {
            var _a, _b, _c, _d, _e, _f;
            this.data = [];
            this.sortable = null;
            this.imgDelayQueue = [];
            this.imgDelaySettings = {};
            this.selectedRows = new Set();
            this.batchBar = null;
            // 用于清理的资源
            this.imgDelayCleanup = null;
            this.menuInstances = [];
            this.switcherInstances = [];
            this.eventCleanups = [];
            this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!this.container)
                throw new Error('Container not found');
            this.columns = columns.filter(col => col.type !== 'hidden');
            this.options = {
                sortable: (_a = options.sortable) !== null && _a !== void 0 ? _a : true,
                deletable: (_b = options.deletable) !== null && _b !== void 0 ? _b : true,
                border: (_c = options.border) !== null && _c !== void 0 ? _c : true,
                zebra: (_d = options.zebra) !== null && _d !== void 0 ? _d : true,
                hover: (_e = options.hover) !== null && _e !== void 0 ? _e : true,
                maxHeight: options.maxHeight || '400px',
                updateUrl: options.updateUrl || '',
                deleteUrl: options.deleteUrl || '',
                onDataChange: options.onDataChange || (() => { }),
                onSort: options.onSort || ((order, data) => data),
                showBatchBar: (_f = options.showBatchBar) !== null && _f !== void 0 ? _f : true,
                onBatchDelete: options.onBatchDelete,
                onBatchUpdate: options.onBatchUpdate,
            };
            this.render();
        }
        // ======================== 渲染 ========================
        render() {
            this.container.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'overflow-x-auto overflow-y-auto';
            wrapper.style.maxHeight = this.options.maxHeight;
            this.tableDom = document.createElement('table');
            let tableCls = 'table table-fixed w-full';
            if (this.options.zebra)
                tableCls += ' table-zebra';
            if (this.options.border)
                tableCls += ' border border-base-300';
            this.tableDom.className = tableCls;
            wrapper.appendChild(this.tableDom);
            this.container.appendChild(wrapper);
            this.renderHeader();
            this.renderBody();
            if (this.options.sortable) {
                this.sortable = new Sortable(this.tbodyDom, {
                    handle: '[data-sort-handle]',
                    onSort: (order) => this.handleSort(order),
                });
            }
            if (this.options.showBatchBar) {
                this.batchBar = document.createElement('div');
                this.batchBar.className = 'flex gap-1 mt-2 hidden';
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-xs btn-error';
                delBtn.textContent = '批量删除';
                delBtn.addEventListener('click', () => this.batchDelete());
                this.batchBar.appendChild(delBtn);
                this.container.appendChild(this.batchBar);
            }
        }
        handleSort(order) {
            if (this.options.onSort) {
                const newData = this.options.onSort(order, this.data);
                if (Array.isArray(newData)) {
                    this.data = newData;
                    this.triggerChange();
                }
                else {
                    console.warn('onSort 回调必须返回排序后的数组');
                }
                return;
            }
            // 默认排序：根据 data-id 映射
            const map = new Map();
            this.data.forEach((row, index) => {
                var _a;
                const id = (_a = row.id) !== null && _a !== void 0 ? _a : index;
                map.set(String(id), row);
            });
            const newData = order
                .map(id => map.get(String(id)))
                .filter(row => row !== undefined);
            if (newData.length === this.data.length) {
                this.data = newData;
                this.triggerChange();
            }
            else {
                console.error('排序失败：部分数据丢失，请检查 data-id 设置', order);
            }
        }
        getCellClasses(col) {
            let cls = '';
            if (col.align === 'center')
                cls += ' text-center';
            else if (col.align === 'right')
                cls += ' text-right';
            else
                cls += ' text-left';
            if (col.pinned === 'left')
                cls += ' sticky left-0 z-10 bg-base-100';
            else if (col.pinned === 'right')
                cls += ' sticky right-0 z-10 bg-base-100';
            return cls;
        }
        renderHeader() {
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            for (const col of this.columns) {
                const th = document.createElement('th');
                if (col.type === 'selection') {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'checkbox checkbox-sm';
                    checkbox.addEventListener('change', () => {
                        this.toggleSelectAll(checkbox.checked);
                    });
                    th.appendChild(checkbox);
                }
                else {
                    th.textContent = col.name;
                }
                if (col.width)
                    th.style.width = col.width;
                if (col.minWidth)
                    th.style.minWidth = col.minWidth;
                th.className = this.getCellClasses(col);
                th.classList.add('sticky', 'top-0', 'z-20', 'bg-base-100');
                tr.appendChild(th);
            }
            const optTh = document.createElement('th');
            optTh.className = 'w-12 sticky top-0 z-20 bg-base-100';
            tr.appendChild(optTh);
            thead.appendChild(tr);
            this.tableDom.appendChild(thead);
        }
        renderBody() {
            const tbody = document.createElement('tbody');
            this.tbodyDom = tbody;
            this.tableDom.appendChild(tbody);
            if (this.data.length) {
                this.data.forEach((row, idx) => this.renderRow(row, idx));
            }
        }
        renderRow(rowData, index) {
            var _a, _b;
            const tr = document.createElement('tr');
            tr.setAttribute('data-sortable-item', 'true');
            if (this.options.hover)
                tr.classList.add('hover');
            const rowId = (_a = rowData.id) !== null && _a !== void 0 ? _a : index;
            tr.setAttribute('data-id', String(rowId));
            for (const col of this.columns) {
                const td = document.createElement('td');
                td.style.padding = '0.25rem 0.5rem';
                td.className = this.getCellClasses(col) + ' align-middle overflow-visible';
                if (col.minWidth)
                    td.style.minWidth = col.minWidth;
                if (col.type === 'selection') {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'checkbox checkbox-sm';
                    checkbox.checked = this.selectedRows.has(index);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked)
                            this.selectedRows.add(index);
                        else
                            this.selectedRows.delete(index);
                        this.updateBatchBar();
                    });
                    td.appendChild(checkbox);
                }
                else {
                    const value = (_b = rowData[col.field]) !== null && _b !== void 0 ? _b : '';
                    this.renderCell(td, col, value, index);
                }
                tr.appendChild(td);
            }
            // 操作列
            const optTd = document.createElement('td');
            optTd.className = 'w-12 text-center align-middle';
            const div = document.createElement('div');
            div.className = 'flex items-center justify-center gap-1';
            if (this.options.sortable) {
                const moveIcon = document.createElement('i');
                moveIcon.innerHTML = Icon.move;
                moveIcon.setAttribute('data-sort-handle', 'true');
                moveIcon.className = 'cursor-grab text-base-content/50 hover:text-base-content';
                div.appendChild(moveIcon);
            }
            if (this.options.deletable) {
                const delIcon = document.createElement('i');
                delIcon.innerHTML = Icon.trash;
                delIcon.className = 'cursor-pointer text-error/70 hover:text-error';
                delIcon.addEventListener('click', () => this.deleteRow(index));
                div.appendChild(delIcon);
            }
            optTd.appendChild(div);
            tr.appendChild(optTd);
            this.tbodyDom.appendChild(tr);
        }
        createIconInput(type, value, icon, pattern, validationMessage, extraAttributes) {
            const container = document.createElement('label');
            container.className = 'input input-bordered input-sm flex items-center gap-1 w-full';
            if (icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'text-base-content/50';
                iconSpan.textContent = icon;
                container.appendChild(iconSpan);
            }
            const input = document.createElement('input');
            input.type = type;
            input.value = value;
            input.className = 'w-full bg-transparent outline-none border-none p-0 h-auto leading-none';
            if (pattern) {
                input.pattern = pattern;
                input.title = validationMessage || '格式不正确';
                input.addEventListener('input', () => {
                    if (input.checkValidity())
                        input.classList.remove('text-error');
                    else
                        input.classList.add('text-error');
                });
            }
            if (extraAttributes) {
                for (const key in extraAttributes) {
                    if (extraAttributes.hasOwnProperty(key)) {
                        input.setAttribute(key, extraAttributes[key]);
                    }
                }
            }
            container.appendChild(input);
            return container;
        }
        renderCell(td, col, value, rowIndex) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            const isEditable = col.editable !== false &&
                !['text', 'image', 'hidden', 'html', 'selection'].includes(col.type);
            const field = col.field;
            switch (col.type) {
                case 'text':
                    td.textContent = value != null ? String(value) : '';
                    break;
                case 'input':
                case 'time':
                case 'datetime-local':
                case 'date': {
                    const input = document.createElement('input');
                    input.className = 'input input-bordered input-sm w-full';
                    input.value = value;
                    if (col.type === 'time')
                        input.type = 'time';
                    else if (col.type === 'datetime-local')
                        input.type = 'datetime-local';
                    else if (col.type === 'date')
                        input.type = 'date';
                    else
                        input.type = 'text';
                    if ((_a = col.config) === null || _a === void 0 ? void 0 : _a.attributes) {
                        Object.entries(col.config.attributes).forEach(([k, v]) => input.setAttribute(k, v));
                    }
                    if (isEditable) {
                        input.addEventListener('change', () => this.onCellChange(rowIndex, field, input.value));
                    }
                    else {
                        input.disabled = true;
                    }
                    td.appendChild(input);
                    break;
                }
                case 'number':
                case 'email':
                case 'password':
                case 'url': {
                    const inputType = col.type === 'number' ? 'number' :
                        col.type === 'email' ? 'email' :
                            col.type === 'password' ? 'password' : 'url';
                    const iconInput = this.createIconInput(inputType, value, (_b = col.config) === null || _b === void 0 ? void 0 : _b.icon, (_c = col.config) === null || _c === void 0 ? void 0 : _c.pattern, (_d = col.config) === null || _d === void 0 ? void 0 : _d.validationMessage, (_e = col.config) === null || _e === void 0 ? void 0 : _e.attributes);
                    if (isEditable) {
                        const inputEl = iconInput.querySelector('input');
                        inputEl.addEventListener('change', () => this.onCellChange(rowIndex, field, inputEl.value));
                    }
                    else {
                        const inputEl = iconInput.querySelector('input');
                        inputEl.disabled = true;
                        iconInput.classList.add('opacity-50');
                    }
                    td.appendChild(iconInput);
                    break;
                }
                case 'textarea': {
                    const textarea = document.createElement('textarea');
                    textarea.className = 'textarea textarea-bordered textarea-sm w-full';
                    textarea.value = value;
                    textarea.rows = 2;
                    if (isEditable) {
                        textarea.addEventListener('change', () => this.onCellChange(rowIndex, field, textarea.value));
                    }
                    else {
                        textarea.disabled = true;
                    }
                    td.appendChild(textarea);
                    break;
                }
                case 'select': {
                    if (isEditable) {
                        const selectData = {};
                        if ((_f = col.options) === null || _f === void 0 ? void 0 : _f.list) {
                            for (const opt of col.options.list) {
                                selectData[opt.value] = String(opt.key);
                            }
                        }
                        const menuContainer = document.createElement('div');
                        menuContainer.style.width = '100%';
                        const currentOption = (_h = (_g = col.options) === null || _g === void 0 ? void 0 : _g.list) === null || _h === void 0 ? void 0 : _h.find(opt => String(opt.key) === String(value));
                        const menu = new Menu(selectData, {
                            limit: ((_j = col.options) === null || _j === void 0 ? void 0 : _j.multiple) ? 0 : 1,
                            searchOff: true,
                            placeholder: (currentOption === null || currentOption === void 0 ? void 0 : currentOption.value) || '请选择',
                            trigger: (data) => this.onCellChange(rowIndex, field, data.value),
                            show: false,
                            direction: exports.SELECTOR_DIRECTION.Up,
                            parentNode: menuContainer,
                        });
                        menu.make();
                        const triggerEl = menuContainer.querySelector('.btn');
                        if (triggerEl) {
                            triggerEl.classList.remove('btn-sm');
                            triggerEl.classList.add('btn-xs');
                        }
                        if (value)
                            menu.selected([String(value)]);
                        td.appendChild(menuContainer);
                        this.menuInstances.push(menu);
                    }
                    else {
                        const plainOption = (_l = (_k = col.options) === null || _k === void 0 ? void 0 : _k.list) === null || _l === void 0 ? void 0 : _l.find(opt => String(opt.key) === String(value));
                        td.textContent = (plainOption === null || plainOption === void 0 ? void 0 : plainOption.value) || (value != null ? String(value) : '');
                    }
                    break;
                }
                case 'switcher': {
                    if (isEditable) {
                        const switchData = {};
                        if ((_m = col.options) === null || _m === void 0 ? void 0 : _m.list) {
                            for (const opt of col.options.list) {
                                switchData[opt.value] = String(opt.key);
                            }
                        }
                        const switcherContainer = document.createElement('div');
                        const switcher = new Switcher(switchData, {
                            limit: 1,
                            trigger: (data) => this.onCellChange(rowIndex, field, data.value),
                            towards: (_o = col.config) === null || _o === void 0 ? void 0 : _o.towards,
                            parentNode: switcherContainer,
                        });
                        switcher.selected([String(value)]).make();
                        const buttons = switcherContainer.querySelectorAll('.btn');
                        buttons.forEach(btn => {
                            btn.classList.remove('btn-sm');
                            btn.classList.add('btn-xs');
                        });
                        td.appendChild(switcherContainer);
                        this.switcherInstances.push(switcher);
                    }
                    else {
                        const plainOption = (_q = (_p = col.options) === null || _p === void 0 ? void 0 : _p.list) === null || _q === void 0 ? void 0 : _q.find(opt => String(opt.key) === String(value));
                        td.textContent = (plainOption === null || plainOption === void 0 ? void 0 : plainOption.value) || (value != null ? String(value) : '');
                    }
                    break;
                }
                case 'checkbox': {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'checkbox checkbox-sm';
                    checkbox.checked = !!value;
                    if (isEditable) {
                        checkbox.addEventListener('change', () => this.onCellChange(rowIndex, field, checkbox.checked));
                    }
                    else {
                        checkbox.disabled = true;
                    }
                    td.appendChild(checkbox);
                    break;
                }
                case 'toggle': {
                    const toggle = document.createElement('input');
                    toggle.type = 'checkbox';
                    toggle.className = 'toggle toggle-sm';
                    toggle.checked = !!value;
                    if (isEditable) {
                        toggle.addEventListener('change', () => this.onCellChange(rowIndex, field, toggle.checked));
                    }
                    else {
                        toggle.disabled = true;
                    }
                    td.appendChild(toggle);
                    break;
                }
                case 'image': {
                    const img = document.createElement('img');
                    img.className = 'max-w-full max-h-12 object-contain';
                    if (col.delay) {
                        img.setAttribute('data-src', value);
                        this.imgDelayQueue.push(img);
                        if (col.zoomOptions)
                            this.imgDelaySettings = col.zoomOptions;
                    }
                    else {
                        img.src = value;
                    }
                    td.appendChild(img);
                    break;
                }
                case 'html':
                    // 注意：直接使用 innerHTML 存在 XSS 风险，请确保数据来源可信
                    td.innerHTML = value;
                    break;
                default:
                    td.textContent = value != null ? String(value) : '';
            }
        }
        onCellChange(rowIndex, field, value) {
            this.data[rowIndex][field] = value;
            this.triggerChange();
            this.triggerUpdate(rowIndex, field, value);
        }
        // ======================== 数据操作 ========================
        deleteRow(index) {
            var _a;
            const row = this.data[index];
            if (this.options.deleteUrl) {
                request({
                    url: this.options.deleteUrl,
                    method: 'DELETE',
                    data: { id: (_a = row.id) !== null && _a !== void 0 ? _a : index },
                }).catch(console.error);
            }
            this.data.splice(index, 1);
            // 调整 selectedRows 中大于被删索引的项
            const newSelected = new Set();
            this.selectedRows.forEach(i => {
                if (i > index)
                    newSelected.add(i - 1);
                else if (i < index)
                    newSelected.add(i);
                // 等于 index 的自动移除
            });
            this.selectedRows = newSelected;
            this.refresh();
            this.triggerChange();
        }
        async triggerUpdate(rowIndex, field, value) {
            if (this.options.updateUrl) {
                const row = this.data[rowIndex];
                await request({
                    url: this.options.updateUrl,
                    method: 'POST',
                    data: { id: row.id, field, value },
                }).catch(console.error);
            }
        }
        triggerChange() {
            this.options.onDataChange(this.data);
        }
        // ======================== 公共方法 ========================
        refresh() {
            // 清理之前的图片延迟加载定时器及事件
            if (this.imgDelayCleanup) {
                this.imgDelayCleanup();
                this.imgDelayCleanup = null;
            }
            // 清理之前的 Menu / Switcher 实例（需手动 destroy 若无 destroy 则至少移除 DOM）
            this.menuInstances.forEach(menu => { var _a; return (_a = menu.destroy) === null || _a === void 0 ? void 0 : _a.call(menu); });
            this.switcherInstances.forEach(switcher => { var _a; return (_a = switcher.destroy) === null || _a === void 0 ? void 0 : _a.call(switcher); });
            this.menuInstances = [];
            this.switcherInstances = [];
            // 重新渲染 tbody
            this.tbodyDom.innerHTML = '';
            this.data.forEach((row, idx) => this.renderRow(row, idx));
            // 重新应用图片延迟加载
            if (this.imgDelayQueue.length) {
                this.imgDelayCleanup = imgDelay(this.imgDelayQueue, 200, this.imgDelaySettings);
                this.imgDelayQueue = [];
            }
            // 更新批量栏状态
            this.updateBatchBar();
        }
        loadData(data) {
            this.data = data;
            this.selectedRows.clear();
            this.refresh();
        }
        getData() {
            return this.data;
        }
        setData(data) {
            this.data = data;
            this.selectedRows.clear();
            this.refresh();
        }
        getSelectedRows() {
            return Array.from(this.selectedRows).map(idx => this.data[idx]);
        }
        toggleSelectAll(checked) {
            if (checked) {
                this.data.forEach((_, idx) => this.selectedRows.add(idx));
            }
            else {
                this.selectedRows.clear();
            }
            // 仅更新所有行内复选框的状态，不重建 DOM，避免破坏其他组件
            const checkboxes = this.tbodyDom.querySelectorAll('td:first-child input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = checked;
            });
            this.updateBatchBar();
        }
        updateBatchBar() {
            if (this.batchBar) {
                this.batchBar.style.display = this.selectedRows.size > 0 ? 'flex' : 'none';
            }
        }
        async batchDelete() {
            const rows = this.getSelectedRows();
            if (rows.length === 0)
                return;
            if (this.options.onBatchDelete) {
                await this.options.onBatchDelete(rows);
            }
            this.data = this.data.filter((_, idx) => !this.selectedRows.has(idx));
            this.selectedRows.clear();
            this.refresh();
            this.triggerChange();
        }
        /**
         * 销毁表格，释放所有资源
         */
        destroy() {
            var _a;
            // 清理 sortable
            (_a = this.sortable) === null || _a === void 0 ? void 0 : _a.destroy();
            // 清理图片延迟加载
            if (this.imgDelayCleanup) {
                this.imgDelayCleanup();
                this.imgDelayCleanup = null;
            }
            // 清理所有 Menu/Switcher
            this.menuInstances.forEach(menu => { var _a; return (_a = menu.destroy) === null || _a === void 0 ? void 0 : _a.call(menu); });
            this.switcherInstances.forEach(switcher => { var _a; return (_a = switcher.destroy) === null || _a === void 0 ? void 0 : _a.call(switcher); });
            this.menuInstances = [];
            this.switcherInstances = [];
            // 清空容器
            this.container.innerHTML = '';
        }
    }

    class FormBuilder {
        constructor(schema) {
            this.schema = schema;
        }
        build() {
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
        createField(field) {
            var _a;
            const wrapper = document.createElement('div');
            wrapper.className = 'form-control';
            const label = document.createElement('label');
            label.className = 'label';
            label.textContent = field.label;
            wrapper.appendChild(label);
            let input;
            switch (field.type) {
                case 'text':
                case 'number':
                case 'date':
                    input = document.createElement('input');
                    input.type = field.type;
                    input.className = 'input input-bordered input-sm w-full';
                    if (field.required)
                        input.required = true;
                    if (field.placeholder)
                        input.placeholder = field.placeholder;
                    if (field.defaultValue !== undefined)
                        input.value = field.defaultValue;
                    break;
                case 'textarea':
                    input = document.createElement('textarea');
                    input.className = 'textarea textarea-bordered textarea-sm w-full';
                    if (field.defaultValue)
                        input.textContent = field.defaultValue;
                    break;
                case 'select': {
                    // ---------- 隐藏的原生 <select>（用于表单验证与值收集）----------
                    const hiddenSelect = document.createElement('select');
                    hiddenSelect.className = 'absolute w-0 h-0 opacity-0 -z-10';
                    if (field.name)
                        hiddenSelect.name = field.name;
                    if (field.required)
                        hiddenSelect.required = true;
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
                        var _a;
                        const selectedVal = hiddenSelect.value;
                        const selectedOption = (_a = field.options) === null || _a === void 0 ? void 0 : _a.find(o => String(o.key) === selectedVal);
                        triggerBtn.innerHTML = `${(selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.value) || field.placeholder || '请选择'} <span class="text-xs">▼</span>`;
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
                        if (!dropdown.contains(e.target)) {
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
                    input.type = 'checkbox';
                    input.className = 'checkbox checkbox-sm';
                    if (field.defaultValue)
                        input.checked = true;
                    break;
                default:
                    input = document.createElement('input');
                    input.className = 'input input-bordered input-sm w-full';
            }
            if (field.name)
                input.setAttribute('name', field.name);
            if ((_a = field.validation) === null || _a === void 0 ? void 0 : _a.pattern) {
                input.setAttribute('pattern', field.validation.pattern);
                if (field.validation.message)
                    input.setAttribute('title', field.validation.message);
            }
            wrapper.appendChild(input);
            return wrapper;
        }
    }

    class Paginator {
        constructor(selector, options) {
            var _a, _b, _c;
            this.totalPages = 1;
            this.currentPage = 1;
            this.eventCleanups = [];
            this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!this.container)
                throw new Error('Container not found');
            const labels = { ...Paginator.defaultLabels, ...options.labels };
            this.options = {
                total: options.total,
                pageSize: options.pageSize,
                currentPage: options.currentPage || 1,
                maxButtons: options.maxButtons || 5,
                showJump: (_a = options.showJump) !== null && _a !== void 0 ? _a : true,
                showTotal: (_b = options.showTotal) !== null && _b !== void 0 ? _b : true,
                onPageChange: options.onPageChange,
                pageSizeOptions: options.pageSizeOptions || [],
                onPageSizeChange: options.onPageSizeChange || (() => { }),
                labels,
                disabled: (_c = options.disabled) !== null && _c !== void 0 ? _c : false,
            };
            this.totalPages = Math.max(1, Math.ceil(this.options.total / this.options.pageSize));
            this.currentPage = Math.min(this.options.currentPage || 1, this.totalPages);
            this.render();
        }
        // ======================== 渲染 ========================
        render() {
            // 清理之前绑定的事件（通过 destroy 统一管理，但 render 会在内部调用，这里只需重建 DOM）
            this.container.innerHTML = '';
            this.container.className = 'flex flex-col items-center gap-2';
            if (this.options.total === 0) {
                this.renderEmpty();
                return;
            }
            if (this.options.showTotal) {
                const totalSpan = document.createElement('span');
                totalSpan.className = 'text-xs text-base-content/60';
                totalSpan.textContent = this.options.labels.total.replace('{total}', String(this.options.total));
                this.container.appendChild(totalSpan);
            }
            // 分页按钮区域
            const joinDiv = document.createElement('div');
            joinDiv.className = 'join';
            const prevBtn = this.createNavButton(this.options.labels.prev, this.currentPage - 1, 'join-item');
            joinDiv.appendChild(prevBtn);
            const pageButtons = this.generatePageButtons();
            pageButtons.forEach(btn => joinDiv.appendChild(btn));
            const nextBtn = this.createNavButton(this.options.labels.next, this.currentPage + 1, 'join-item');
            joinDiv.appendChild(nextBtn);
            this.container.appendChild(joinDiv);
            // 底部工具栏：页面大小切换 + 跳转
            const toolbar = document.createElement('div');
            toolbar.className = 'flex items-center gap-2 mt-1 flex-wrap justify-center';
            // 每页条数切换
            if (this.options.pageSizeOptions.length > 0) {
                const sizeWrapper = document.createElement('div');
                sizeWrapper.className = 'flex items-center gap-1';
                const sizeLabel = document.createElement('span');
                sizeLabel.className = 'text-xs text-base-content/60';
                sizeLabel.textContent = this.options.labels.pageSizeLabel;
                const select = document.createElement('select');
                select.className = 'select select-xs select-bordered';
                this.options.pageSizeOptions.forEach(size => {
                    const opt = document.createElement('option');
                    opt.value = String(size);
                    opt.textContent = String(size);
                    if (size === this.options.pageSize)
                        opt.selected = true;
                    select.appendChild(opt);
                });
                select.addEventListener('change', () => {
                    const newSize = parseInt(select.value);
                    if (newSize !== this.options.pageSize) {
                        this.options.pageSize = newSize;
                        this.options.onPageSizeChange(newSize);
                        this.totalPages = Math.max(1, Math.ceil(this.options.total / this.options.pageSize));
                        if (this.currentPage > this.totalPages)
                            this.currentPage = this.totalPages;
                        this.options.onPageChange(this.currentPage, this.options.pageSize);
                        this.render();
                    }
                });
                sizeWrapper.appendChild(sizeLabel);
                sizeWrapper.appendChild(select);
                toolbar.appendChild(sizeWrapper);
            }
            // 跳转
            if (this.options.showJump) {
                const jumpWrapper = document.createElement('div');
                jumpWrapper.className = 'flex items-center gap-1';
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.max = String(this.totalPages);
                input.placeholder = '页码';
                input.className = 'input input-bordered input-xs w-14 text-center';
                const goBtn = document.createElement('button');
                goBtn.className = 'btn btn-xs btn-outline';
                goBtn.textContent = this.options.labels.jump;
                const doJump = () => {
                    let page = parseInt(input.value);
                    if (isNaN(page))
                        page = 1;
                    this.goToPage(page);
                    input.value = '';
                };
                goBtn.addEventListener('click', doJump);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        doJump();
                    }
                });
                jumpWrapper.appendChild(input);
                jumpWrapper.appendChild(goBtn);
                toolbar.appendChild(jumpWrapper);
            }
            if (toolbar.children.length > 0) {
                this.container.appendChild(toolbar);
            }
            // 应用禁用状态
            this.setDisabled(this.options.disabled);
        }
        renderEmpty() {
            const span = document.createElement('span');
            span.className = 'text-sm text-base-content/40';
            span.textContent = '暂无数据';
            this.container.appendChild(span);
        }
        // ======================== 按钮生成 ========================
        createNavButton(text, targetPage, extraClass = '') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm ' + extraClass;
            btn.textContent = text;
            btn.setAttribute('aria-label', text);
            if (targetPage < 1 || targetPage > this.totalPages || this.options.total === 0) {
                btn.className += ' btn-disabled';
            }
            const handler = (e) => {
                e.preventDefault();
                if (!btn.classList.contains('btn-disabled'))
                    this.goToPage(targetPage);
            };
            btn.addEventListener('click', handler);
            this.eventCleanups.push(() => btn.removeEventListener('click', handler));
            return btn;
        }
        generatePageButtons() {
            const buttons = [];
            const max = this.options.maxButtons;
            let start = Math.max(1, this.currentPage - Math.floor(max / 2));
            let end = Math.min(this.totalPages, start + max - 1);
            if (end - start + 1 < max)
                start = Math.max(1, end - max + 1);
            if (start > 1) {
                buttons.push(this.createNumberButton(1));
                if (start > 2)
                    buttons.push(this.createEllipsis());
            }
            for (let i = start; i <= end; i++) {
                buttons.push(this.createNumberButton(i));
            }
            if (end < this.totalPages) {
                if (end < this.totalPages - 1)
                    buttons.push(this.createEllipsis());
                buttons.push(this.createNumberButton(this.totalPages));
            }
            return buttons;
        }
        createNumberButton(page) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm join-item';
            btn.textContent = String(page);
            btn.setAttribute('aria-label', `第 ${page} 页`);
            if (page === this.currentPage) {
                btn.classList.add('btn-active');
            }
            const handler = () => this.goToPage(page);
            btn.addEventListener('click', handler);
            this.eventCleanups.push(() => btn.removeEventListener('click', handler));
            return btn;
        }
        createEllipsis() {
            const span = document.createElement('span');
            span.className = 'px-2 text-base-content/50 self-center';
            span.textContent = '...';
            return span;
        }
        // ======================== 逻辑 ========================
        goToPage(page) {
            if (page < 1)
                page = 1;
            if (page > this.totalPages)
                page = this.totalPages;
            if (page === this.currentPage)
                return;
            this.currentPage = page;
            this.options.onPageChange(this.currentPage, this.options.pageSize);
            this.render();
        }
        // ======================== 公共接口 ========================
        refresh(total, pageSize) {
            this.options.total = total;
            if (pageSize)
                this.options.pageSize = pageSize;
            this.totalPages = total > 0 ? Math.max(1, Math.ceil(this.options.total / this.options.pageSize)) : 1;
            if (this.currentPage > this.totalPages)
                this.currentPage = this.totalPages;
            this.render();
        }
        setDisabled(disabled) {
            this.options.disabled = disabled;
            const buttons = this.container.querySelectorAll('button');
            buttons.forEach(btn => {
                if (disabled) {
                    btn.setAttribute('disabled', 'true');
                    btn.classList.add('btn-disabled');
                }
                else {
                    btn.removeAttribute('disabled');
                    btn.classList.remove('btn-disabled');
                }
            });
            const inputs = this.container.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = disabled;
            });
        }
        getCurrentPage() {
            return this.currentPage;
        }
        getPageSize() {
            return this.options.pageSize;
        }
        /**
         * 销毁分页器，移除所有事件并清空容器
         */
        destroy() {
            this.eventCleanups.forEach(fn => fn());
            this.eventCleanups = [];
            this.container.innerHTML = '';
        }
    }
    // 默认文案
    Paginator.defaultLabels = {
        prev: '上一页',
        next: '下一页',
        total: '共 {total} 条',
        jump: '跳转',
        pageSizeLabel: '每页',
    };

    class SidebarTabs {
        constructor(options) {
            var _a;
            this.contentContainer = null;
            this.navLinks = new Map();
            this.container = typeof options.container === 'string'
                ? document.querySelector(options.container)
                : options.container;
            if (!this.container)
                throw new Error('SidebarTabs container not found');
            this.options = options;
            this.activeTarget = options.defaultActive || ((_a = options.items[0]) === null || _a === void 0 ? void 0 : _a.target) || '';
            this.render();
        }
        /**
         * 完整渲染布局：左侧导航 + 右侧内容
         */
        render() {
            this.container.innerHTML = '';
            this.container.className = 'layout';
            // 左侧导航
            const sidebar = document.createElement('nav');
            sidebar.className = 'sidebar';
            const title = document.createElement('h2');
            title.textContent = '🧩 Junkman';
            sidebar.appendChild(title);
            let currentGroup = '';
            for (const item of this.options.items) {
                // 分组标题
                if (item.group && item.group !== currentGroup) {
                    const groupTitle = document.createElement('div');
                    groupTitle.className = 'group-title';
                    groupTitle.textContent = item.group;
                    sidebar.appendChild(groupTitle);
                    currentGroup = item.group;
                }
                const link = document.createElement('a');
                link.setAttribute('data-target', item.target);
                link.textContent = item.label;
                if (item.target === this.activeTarget) {
                    link.classList.add('active');
                }
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(item.target);
                });
                sidebar.appendChild(link);
                this.navLinks.set(item.target, link);
            }
            // 右侧内容
            const content = document.createElement('main');
            const contentId = this.options.contentId || 'mainContent';
            content.id = contentId;
            content.className = 'content';
            this.contentContainer = content;
            this.container.appendChild(sidebar);
            this.container.appendChild(content);
            // 渲染默认激活的内容
            this.navigateTo(this.activeTarget, true);
        }
        /**
         * 获取某项配置
         */
        getItem(target) {
            return this.options.items.find(i => i.target === target);
        }
        /**
         * 切换到指定 target
         */
        navigateTo(target, isInitial = false) {
            var _a;
            if (!isInitial && target === this.activeTarget)
                return;
            // 更新导航激活状态
            const oldLink = this.navLinks.get(this.activeTarget);
            if (oldLink)
                oldLink.classList.remove('active');
            const newLink = this.navLinks.get(target);
            if (newLink)
                newLink.classList.add('active');
            this.activeTarget = target;
            // 渲染内容
            const item = this.getItem(target);
            if (item === null || item === void 0 ? void 0 : item.render) {
                if (this.contentContainer) {
                    this.contentContainer.innerHTML = item.render();
                }
                // 内容渲染后执行初始化
                (_a = item.afterRender) === null || _a === void 0 ? void 0 : _a.call(item);
            }
            else {
                // 无渲染函数时显示提示
                if (this.contentContainer) {
                    this.contentContainer.innerHTML = '<div class="demo-section"><h2>请从左侧选择组件</h2></div>';
                }
            }
        }
        /**
         * 销毁组件
         */
        destroy() {
            this.navLinks.forEach(link => {
                link.removeEventListener('click', () => { });
            });
            this.navLinks.clear();
            this.container.innerHTML = '';
            this.contentContainer = null;
        }
    }

    // ============================================================
    // ============================================================
    // 📦 兼容性命名空间（保留旧的 selector 对象写法）
    // ============================================================
    const selector = {
        Menu: Menu,
        Switcher: Switcher,
    };

    exports.CascadeSelector = CascadeSelector;
    exports.CascadeTree = CascadeTree;
    exports.EditableTable = EditableTable;
    exports.FormBuilder = FormBuilder;
    exports.GlobalEventManager = GlobalEventManager;
    exports.Icon = Icon;
    exports.Modal = Modal;
    exports.Paginator = Paginator;
    exports.SidebarTabs = SidebarTabs;
    exports.Sortable = Sortable;
    exports.Tabs = Tabs;
    exports.Toast = Toast;
    exports.contextmenu = contextmenu;
    exports.createDOMFromTree = createDOMFromTree;
    exports.dimensionalTree = dimensionalTree;
    exports.imgDelay = imgDelay;
    exports.request = request;
    exports.selector = selector;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
