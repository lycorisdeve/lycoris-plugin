import * as cheerio from 'cheerio';
import axios from 'axios';
import fs from 'node:fs';
import { pluginResources } from '../../components/lib/Path.js'

export async function getRandomLinkId() {
    const page = Math.floor(Math.random() * 11001);
    let url = `https://wallhaven.cc/search?categories=111&purity=010&sorting=favorites&order=desc&ai_art_filter=0&page=${page}`
    
    try {
        // 发送 HTTP 请求获取 HTML 内容
        const response = await axios.get(url);
        const html = response.data;

        // 使用 Cheerio 解析 HTML 内容，并返回一个解析器函数
        const $ = cheerio.load(html);

            // 获取该 ul 元素下的所有 li 元素
            const lis = $('figure');
            
            if (lis.length > 0) {
                // 随机选择一个 li 元素
                const randomLiIndex = Math.floor(Math.random() * lis.length);
                const randomLi = lis.eq(randomLiIndex);
                // 获取该 li 元素下的第一个 img 标签的 src 属性
                const imgUrl = randomLi.find('img').attr('data-src');
                logger.info(imgUrl)
                // 提取链接中最后一个 '/' 后面的内容作为 ID
                let imgName = imgUrl.substring(imgUrl.lastIndexOf('/') + 1);
                // 返回 ID
                return imgName;
            } else {
            logger.info('图片不存在')
            return false;
        }
    } catch (err) {
        logger.error('An error occurred:', err);
        return false;
    }

}

export function getHDWallpaper(name) {
    if (!name) { return false; }
    if (typeof name === 'string') {
        const prefix = name.substring(0, 2);
        let url = `https://w.wallhaven.cc/full/${prefix}/wallhaven-${name}`
        logger.info(url)
        // 发送 GET 请求获取图片二进制数据
        axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer'
        }).then(response => {
            // 将二进制数据写入文件
            fs.writeFileSync(`${pluginResources}/wallpaper/${name}`, response.data);
        }).catch(error => {
            logger.error(error);
        });

    }



}