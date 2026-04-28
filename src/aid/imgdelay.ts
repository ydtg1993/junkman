export interface ImgDelayOptions {
    /** 是否启用悬停放大预览 */
    zoom?: boolean;
    /** 预览图宽度（px），默认 300 */
    width?: number;
    /** 预览图高度：>0 固定高度，0 按比例自适应，<0 自动限制不超出视口 */
    height?: number;
    /** 预览图额外 CSS 类名 */
    previewClass?: string;
    /** 是否添加骨架屏加载动画（默认 true） */
    skeleton?: boolean;
}

/**
 * 图片延迟加载工具（含骨架屏）
 * @param doms 需要处理的图片元素数组
 * @param time 延迟加载的间隔时间 (ms)
 * @param options 配置项
 * @returns 销毁函数，用于清理所有事件和预览图
 */
export function ImgDelay(
    doms: HTMLElement[],
    time: number = 200,
    options: ImgDelayOptions = {},
): () => void {
    const { zoom = false, width = 300, height = 0, previewClass = '', skeleton = true } = options;

    const cleanupFns: Array<() => void> = [];
    const previewImgs: Set<HTMLImageElement> = new Set();

    doms.forEach((dom, idx) => {
        const src = dom.getAttribute('data-src');
        if (!src) return;

        // 避免重复处理
        if (dom.getAttribute('data-loaded') === 'true') return;
        dom.setAttribute('data-loaded', 'true');

        // 骨架屏：给图片添加占位样式，并保存原始背景用于清除
        let originalBg = '';
        if (skeleton && dom instanceof HTMLImageElement) {
            originalBg = dom.style.background;
            dom.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
            dom.style.backgroundSize = '200% 100%';
            dom.style.animation = 'imgloader-skeleton 1.5s ease-in-out infinite';
            // 确保动画定义存在（只注入一次）
            if (!document.getElementById('imgloader-skeleton-style')) {
                const style = document.createElement('style');
                style.id = 'imgloader-skeleton-style';
                style.textContent = `
          @keyframes imgloader-skeleton {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `;
                document.head.appendChild(style);
            }
        }

        let loadHandler: (() => void) | null = null;
        let mouseoverHandler: ((e: MouseEvent) => void) | null = null;
        let mouseoutHandler: (() => void) | null = null;
        let previewImg: HTMLImageElement | null = null;
        let timeoutId: number;

        const clearSkeleton = () => {
            if (skeleton && dom instanceof HTMLImageElement) {
                dom.style.background = originalBg;
                dom.style.backgroundSize = '';
                dom.style.animation = '';
            }
        };

        const setupZoom = () => {
            if (!zoom) return;

            mouseoverHandler = (e: MouseEvent) => {
                if (previewImg) return;
                previewImg = document.createElement('img');
                previewImgs.add(previewImg);

                previewImg.style.position = 'fixed';
                previewImg.style.zIndex = '1000000';
                previewImg.style.borderRadius = '3px';
                previewImg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                if (previewClass) previewImg.className = previewClass;

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

                    let left = e.clientX + 15;
                    let top = e.clientY + 15;
                    if (left + displayWidth > window.innerWidth) left = e.clientX - displayWidth - 15;
                    if (top + displayHeight > window.innerHeight) top = e.clientY - displayHeight - 15;
                    left = Math.max(0, left);
                    top = Math.max(0, top);

                    previewImg.style.left = `${left}px`;
                    previewImg.style.top = `${top}px`;
                };

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
            const imgDom = dom as HTMLImageElement;
            const onLoad = () => {
                imgDom.removeEventListener('load', onLoad);
                clearSkeleton();
                setupZoom();
            };

            if (imgDom.complete && imgDom.naturalWidth > 0) {
                clearSkeleton();
                setupZoom();
            } else {
                imgDom.addEventListener('load', onLoad);
                loadHandler = onLoad;
            }

            imgDom.src = src; // 触发加载
        }, idx * time);

        cleanupFns.push(() => {
            clearTimeout(timeoutId);
            if (loadHandler && dom) dom.removeEventListener('load', loadHandler);
            if (mouseoverHandler && dom) dom.removeEventListener('mouseover', mouseoverHandler);
            if (mouseoutHandler && dom) dom.removeEventListener('mouseout', mouseoutHandler);
            if (previewImg) {
                previewImgs.delete(previewImg);
                previewImg.remove();
                previewImg = null;
            }
        });
    });

    return () => {
        cleanupFns.forEach(fn => { try { fn(); } catch { /* ignore */ } });
        cleanupFns.length = 0;
        previewImgs.forEach(img => { if (img.parentNode) img.remove(); });
        previewImgs.clear();
    };
}