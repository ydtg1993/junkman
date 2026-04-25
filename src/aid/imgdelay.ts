interface ImgDelayOptions {
    zoom?: boolean;
    width?: number;
    height?: number; // >0 固定高度, <0 自动限制不超出视口
}

export function imgDelay(
    doms: HTMLElement[],
    time: number = 200,
    options: ImgDelayOptions = { zoom: false, width: 300, height: 0 }
) {
    const cleanupFns: Array<() => void> = [];

    doms.forEach((dom, idx) => {
        const src = dom.getAttribute('data-src');
        if (!src) return;

        let previewImg: HTMLImageElement | null = null;
        let timeoutId: number;

        timeoutId = window.setTimeout(() => {
            // 先绑定 onload，再设置 src，确保图片加载事件一定触发
            dom.onload = () => {
                if (!options.zoom) return;

                const showPreview = (e: MouseEvent) => {
                    if (previewImg) previewImg.remove();
                    previewImg = document.createElement('img');

                    // 通用样式
                    previewImg.style.position = 'fixed';
                    previewImg.style.zIndex = '1000000';
                    previewImg.style.borderRadius = '3px';
                    previewImg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

                    function applyPreview() {
                        if (!previewImg) return;

                        let displayWidth = options.width || 300;
                        let displayHeight = options.height ?? 0;
                        const naturalWidth = previewImg.naturalWidth || 100;
                        const naturalHeight = previewImg.naturalHeight || 100;

                        if (displayHeight === 0) {
                            // 高度自适应：按原始比例计算
                            displayHeight = naturalHeight * (displayWidth / naturalWidth);
                        } else if (displayHeight < 0) {
                            // 高度限制：不超出视口 -20px
                            const maxHeight = window.innerHeight - 20;
                            if (naturalHeight > maxHeight) {
                                displayHeight = maxHeight;
                                displayWidth = naturalWidth * (maxHeight / naturalHeight);
                            } else {
                                displayHeight = naturalHeight;
                                displayWidth = naturalWidth;
                            }
                        }

                        // 应用尺寸
                        previewImg.style.width = `${displayWidth}px`;
                        previewImg.style.height = `${displayHeight}px`;

                        // 位置计算：鼠标右下方偏移15px，且保证不出视口
                        let left = e.clientX + 15;
                        let top = e.clientY + 15;
                        if (left + displayWidth > window.innerWidth) {
                            left = e.clientX - displayWidth - 15;
                        }
                        if (top + displayHeight > window.innerHeight) {
                            top = e.clientY - displayHeight - 15;
                        }

                        previewImg.style.left = `${left}px`;
                        previewImg.style.top = `${top}px`;

                        document.body.appendChild(previewImg);
                    }

                    // 关键修复：等待图片加载完成再计算尺寸
                    if (previewImg.complete && previewImg.naturalWidth > 0) {
                        applyPreview();
                    } else {
                        previewImg.onload = applyPreview;
                    }

                    // 最后设置 src（触发加载，若已缓存则立即触发 onload）
                    previewImg.src = src;
                };

                const hidePreview = () => {
                    if (previewImg) {
                        previewImg.remove();
                        previewImg = null;
                    }
                };

                dom.addEventListener('mouseover', showPreview);
                dom.addEventListener('mouseout', hidePreview);

                cleanupFns.push(() => {
                    dom.removeEventListener('mouseover', showPreview);
                    dom.removeEventListener('mouseout', hidePreview);
                    hidePreview();
                });
            };
            // 必须先绑定 onload，再设置 src
            dom.setAttribute('src', src);
        }, idx * time);

        cleanupFns.push(() => clearTimeout(timeoutId));
    });

    return () => {
        cleanupFns.forEach(fn => fn());
        cleanupFns.length = 0;
    };
}