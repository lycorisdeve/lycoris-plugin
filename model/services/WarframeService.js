import { Agent } from "undici";

/**
 * 通用 fetch 封装，自动忽略 HTTPS 证书过期
 * @param {string} api_url 完整 URL
 * @param {object} options fetch 参数
 * @returns JSON 数据
 */
async function fetchJSON(api_url, options = {}) {
    const dispatcher = new Agent({
        connect: {
            rejectUnauthorized: false
        }
    });

    const timeout = options.timeout || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Remove timeout from options if present
    const { timeout: _, ...fetchOptions } = options;

    try {
        const resp = await fetch(api_url, {
            dispatcher,
            signal: controller.signal,
            ...fetchOptions
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        return await resp.json();
    } catch (err) {
        console.error(`[fetchJSON] 请求失败: ${api_url}`, err);
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

export default fetchJSON;