import axios from "axios"


export async function btApi(keyword, pageNum) {
    const http = `http://`
    try {
        let url = `w=jie&name=${keyword}&page=${pageNum}`
        const response = await axios.get(`${http}209.141.34.64:4117/so/clso.php?${url}`, {
            timeout: 1500
        });
        if (response.status !== 200) {
            throw new Error(`API请求失败：${response.statusText}`);
        }

        const data = response.data;

        // 将每个元素转换为包含所需字段的对象
        const result = Array.isArray(data) ? data.map(item => ({
            magnet: 'magnet:?xt=urn:btih:' + item.hash,
            name: item.name,
            type: item.type,
            time: item.time
        })) : [];

        return result;

    } catch (error) {
        logger.error(error);
        return null;
    }


}