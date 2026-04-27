export interface RequestOptions {
    url: string;
    method?: string;
    header?: Record<string, string>;
    data?: Record<string, any> | FormData;
    timeout?: number;
    /** 期望的响应类型，默认 'json'，可选 'text' | 'blob' 等 */
    responseType?: XMLHttpRequestResponseType;
    /** 用于支持请求取消的 AbortSignal */
    signal?: AbortSignal;
    /** 上传进度回调 */
    onUploadProgress?: (event: ProgressEvent) => void;
    /** 是否启用 HTTP 错误状态码抛错（状态不在 200-299），默认 true */
    throwOnHttpError?: boolean;
}

export interface RequestError extends Error {
    status?: number;
    response?: any;
    type: 'timeout' | 'network' | 'abort' | 'http' | 'parse';
}

/**
 * 通用网络请求函数
 * @returns 自动根据 responseType 解析的响应数据
 */
export function request(options: RequestOptions): Promise<any> {
    const {
        url: rawUrl,
        method = 'GET',
        header = {},
        data = {},
        timeout = 30000,
        responseType = 'json',
        signal,
        onUploadProgress,
        throwOnHttpError = true,
    } = options;

    return new Promise((resolve, reject) => {
        // 处理 signal 提前取消
        if (signal?.aborted) {
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
        signal?.addEventListener('abort', onAbort, { once: true });

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
                    } catch {
                        // 保持原样
                    }
                }
                resolve(result);
            } else {
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
            } else if (data instanceof FormData) {
                // FormData 已经包含了 multipart/form-data；
                // 如果之前手动设置了 Content-Type，则保留；否则浏览器会自动添加带 boundary 的头
                xhr.send(data);
            } else {
                xhr.send(JSON.stringify(data));
            }
        } catch (e) {
            reject(createError('network', 'Failed to send request'));
        }
    });
}

function createError(
    type: RequestError['type'],
    message: string,
): RequestError {
    const error = new Error(message) as RequestError;
    error.type = type;
    return error;
}