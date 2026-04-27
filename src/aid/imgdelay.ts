export interface ImgDelayOptions {
    /** 是否启用悬停放大预览 */
    zoom?: boolean;
    /** 预览图宽度（px），默认 300 */
    width?: number;
    /** 预览图高度：>0 固定高度，0 按比例自适应，<0 自动限制不超出视口 */
    height?: number;
    /** 预览图额外 CSS 类名 */
    previewClass?: string;
}

export function imgDelay(
    doms: HTMLElement[],
    time: number = 200,
    options: ImgDelayOptions = {},
): () => void {
    const { zoom = false, width = 300, height = 0, previewClass = '' } = options;

    // 收集需要清理的资源
    const cleanupFns: Array<() => void> = [];
    // 收集所有动态创建的预览图，确保在清里时移除
    const previewImgs: Set<HTMLImageElement> = new Set();

    doms.forEach((dom, idx) => {
        const src = dom.getAttribute('data-src');
        if (!src) return;

        // 如果图片已经通过其他方式加载完成（例如重复调用），跳过
        if (dom.getAttribute('src') === src) return;

        let loadHandler: (() => void) | null = null;
        let mouseoverHandler: ((e: MouseEvent) => void) | null = null;
        let mouseoutHandler: (() => void) | null = null;
        let previewImg: HTMLImageElement | null = null;
        let timeoutId: number;

        const cleanupDom = () => {
            if (timeoutId) clearTimeout(timeoutId);
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
            if (!zoom) return;

            mouseoverHandler = (e: MouseEvent) => {
                if (previewImg) return; // 已存在预览
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
                    if (!previewImg || !previewImg.parentNode) return;

                    let displayWidth = width || 300;
                    let displayHeight = height ?? 0;
                    const naturalWidth = previewImg.naturalWidth || 100;
                    const naturalHeight = previewImg.naturalHeight || 100;

                    if (displayHeight === 0) {
                        displayHeight = naturalHeight * (displayWidth / naturalWidth);
                    } else if (displayHeight < 0) {
                        const maxHeight = window.innerHeight - 20;
                        if (naturalHeight > maxHeight) {
                            displayHeight = maxHeight;
                            displayWidth = naturalWidth * (maxHeight / naturalHeight);
                        } else {
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
                } else {
                    const onPreviewLoad = () => {
                        applyPreview();
                        previewImg?.removeEventListener('load', onPreviewLoad);
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
                if (mouseoverHandler) dom.removeEventListener('mouseover', mouseoverHandler);
                if (mouseoutHandler) dom.removeEventListener('mouseout', mouseoutHandler);
                if (previewImg) {
                    previewImgs.delete(previewImg);
                    previewImg.remove();
                    previewImg = null;
                }
            });
        };

        timeoutId = window.setTimeout(() => {
            // 如果图片尚未加载，绑定 load 事件
            const imgDom = dom as HTMLImageElement;
            const onLoad = () => {
                imgDom.removeEventListener('load', onLoad);
                setupZoom();
            };

            // 检查图片是否已经完成加载（缓存）
            if (imgDom.complete && imgDom.naturalWidth > 0) {
                setupZoom();
            } else {
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
            try { fn(); } catch { /* 忽略可能的错误 */ }
        });
        cleanupFns.length = 0;

        // 确保所有预览图都被移除
        previewImgs.forEach(img => {
            if (img.parentNode) img.remove();
        });
        previewImgs.clear();
    };
}