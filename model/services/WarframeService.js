import fetch from "node-fetch";
import https from "https";

/**
 * 通用 fetch 封装，自动忽略 HTTPS 证书过期
 * @param {string} api_url 完整 URL
 * @param {object} options fetch 参数
 * @returns JSON 数据
 */
async function fetchJSON(api_url, options = {}) {
    const agent = api_url.startsWith("https:")
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined;

    try {
        const resp = await fetch(api_url, { agent, ...options, timeout: 10000 });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        return await resp.json();
    } catch (err) {
        console.error(`[fetchJSON] 请求失败: ${api_url}`, err);
        throw err;
    }
}

export default fetchJSON;