export interface ImgLoaderOptions {
    /** 是否启用悬停放大预览 */
    zoom?: boolean;
    /** 预览图宽度（px），默认 300 */
    width?: number;
    /** 预览图高度：>0 固定高度，0 按比例自适应，<0 自动限制不超出视口 */
    height?: number;
    /** 预览图额外 CSS 类名 */
    previewClass?: string;
    /** 加载模式：'sync' 逐个延迟加载（默认），'async' 同时加载 */
    mode?: 'sync' | 'async';
}

/**
 * 图片延迟加载工具（含骨架屏）
 * @param doms 需要处理的图片元素数组（必须为 <img> 元素）
 * @param time 每个图片加载间隔 (ms)，仅在 mode='sync' 时有效
 * @param options 配置项
 * @returns 销毁函数，用于清理所有事件和预览图
 */
export function ImgLoader(
    doms: HTMLElement[],
    time: number = 200,
    options: ImgLoaderOptions = {},
): () => void {
    const {
        zoom = false,
        width = 300,
        height = 0,
        previewClass = '',
        mode = 'sync',
    } = options;

    const cleanupFns: Array<() => void> = [];
    const previewImgs: Set<HTMLImageElement> = new Set();

    // 骨架动画注入
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

    const EMPTY_IMG_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    doms.forEach((dom, idx) => {
        if (!(dom instanceof HTMLImageElement)) return;
        const img = dom;
        const src = img.getAttribute('data-src');
        if (!src) return;
        if (img.getAttribute('data-loaded') === 'true') return;
        img.setAttribute('data-loaded', 'true');

        // ─── 保存原始样式 ───
        const originalBg = img.style.background;
        const originalBgSize = img.style.backgroundSize;
        const originalAnimation = img.style.animation;
        const originalWidth = img.style.width;
        const originalHeight = img.style.height;
        const originalObjectFit = img.style.objectFit;

        // ─── 固定元素尺寸为当前实际显示尺寸 ───
        // 防止透明占位图导致元素坍塌
        if (!originalWidth && img.offsetWidth > 0) {
            img.style.width = img.offsetWidth + 'px';
        }
        if (!originalHeight && img.offsetHeight > 0) {
            img.style.height = img.offsetHeight + 'px';
        }
        // 如果不设置 object-fit，透明占位图会被拉伸，维持 cover 可让背景渐变填充整个区域
        img.style.objectFit = 'cover';

        // ─── 设置透明占位图 + 骨架动画 ───
        img.src = EMPTY_IMG_SRC;
        img.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
        img.style.backgroundSize = '200% 100%';
        img.style.animation = 'imgloader-skeleton 1.5s ease-in-out infinite';

        // 清理骨架样式并还原原始值
        const clearSkeleton = () => {
            img.style.background = originalBg;
            img.style.backgroundSize = originalBgSize;
            img.style.animation = originalAnimation;
            // 还原宽高（如果原先没有内联样式则移除）
            if (originalWidth) {
                img.style.width = originalWidth;
            } else {
                img.style.removeProperty('width');
            }
            if (originalHeight) {
                img.style.height = originalHeight;
            } else {
                img.style.removeProperty('height');
            }
            img.style.objectFit = originalObjectFit;
        };

        let loadHandler: (() => void) | null = null;
        let mouseoverHandler: ((e: MouseEvent) => void) | null = null;
        let mouseoutHandler: (() => void) | null = null;
        let previewImg: HTMLImageElement | null = null;
        let timeoutId: number | null = null;

        // ─── 缩放预览逻辑（不变） ───
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

            img.addEventListener('mouseover', mouseoverHandler);
            img.addEventListener('mouseout', mouseoutHandler);

            cleanupFns.push(() => {
                if (mouseoverHandler) img.removeEventListener('mouseover', mouseoverHandler);
                if (mouseoutHandler) img.removeEventListener('mouseout', mouseoutHandler);
                if (previewImg) {
                    previewImgs.delete(previewImg);
                    previewImg.remove();
                    previewImg = null;
                }
            });
        };

        // ─── 真实图片加载触发 ───
        const triggerLoad = () => {
            const onLoad = () => {
                img.removeEventListener('load', onLoad);
                clearSkeleton();
                setupZoom();
            };

            if (img.complete && img.naturalWidth > 0 && img.src !== EMPTY_IMG_SRC) {
                clearSkeleton();
                setupZoom();
            } else {
                img.addEventListener('load', onLoad);
                loadHandler = onLoad;
                img.src = src;
            }
        };

        if (mode === 'async') {
            triggerLoad();
        } else {
            timeoutId = window.setTimeout(triggerLoad, idx * time);
        }

        // 清理函数
        cleanupFns.push(() => {
            if (timeoutId !== null) clearTimeout(timeoutId);
            if (loadHandler && img) img.removeEventListener('load', loadHandler);
            if (mouseoverHandler && img) img.removeEventListener('mouseover', mouseoverHandler);
            if (mouseoutHandler && img) img.removeEventListener('mouseout', mouseoutHandler);
            if (previewImg) {
                previewImgs.delete(previewImg);
                previewImg.remove();
                previewImg = null;
            }
            clearSkeleton();
        });
    });

    return () => {
        cleanupFns.forEach(fn => { try { fn(); } catch { /* ignore */ } });
        cleanupFns.length = 0;
        previewImgs.forEach(img => { if (img.parentNode) img.remove(); });
        previewImgs.clear();
    };
}