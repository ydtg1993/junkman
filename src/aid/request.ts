export function request({
                            url = '',
                            method = "GET",
                            header = {},
                            data = {},
                            timeout = 30000
                        }: {
    url: string;
    method?: string;
    header?: Record<string, any>;
    data?: Record<string, any>;
    timeout?: number;
}): Promise<any> {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        if (method === 'GET') {
            // 参数拼接逻辑，修复 falsy 值丢失和编码问题
            const paramsArray: string[] = [];
            if (Object.keys(data).length > 0) {
                Object.keys(data).forEach(key => {
                    if (data[key] != null) {
                        paramsArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
                    }
                });
            }
            if (paramsArray.length) {
                url += (url.includes('?') ? '&' : '?') + paramsArray.join('&');
            }
        }
        xhr.open(method, url, true);
        xhr.timeout = timeout;
        if (header) {
            for (let h in header) {
                if (header.hasOwnProperty(h)) xhr.setRequestHeader(h, header[h]);
            }
        }
        if (method === 'GET') {
            xhr.setRequestHeader("Content-type", "application/text;charset=UTF-8");
            xhr.responseType = "text";
            xhr.send(null);
        } else {
            if (data instanceof FormData) {
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                xhr.responseType = "json";
                xhr.send(data);
            } else {
                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhr.responseType = "json";
                xhr.send(JSON.stringify(data));
            }
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        };
        xhr.ontimeout = () => reject(new Error('Request timeout'));
        xhr.onerror = () => reject(new Error('Network error'));
    });
}