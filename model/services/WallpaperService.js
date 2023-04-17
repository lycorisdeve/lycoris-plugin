import * as cheerio from 'cheerio';
import axios from 'axios';
import fs from 'node:fs';

export async function getRandomLinkId() {
    try {
        // 发送 HTTP 请求获取 HTML 内容
        const response = await axios.get('https://wallhaven.cc/random');
        const html = response.data;

        // 使用 Cheerio 解析 HTML 内容，并返回一个解析器函数
        const $ = cheerio.load(html);

        // 获取所有 ul 元素
        const uls = $('ul');

        if (uls.length > 0) {
            // 随机选择一个 ul 元素
            const randomUlIndex = Math.floor(Math.random() * uls.length);
            const randomUl = uls.eq(randomUlIndex);

            // 获取该 ul 元素下的所有 li 元素
            const lis = randomUl.find('li');

            if (lis.length > 0) {
                // 随机选择一个 li 元素
                const randomLiIndex = Math.floor(Math.random() * lis.length);
                const randomLi = lis.eq(randomLiIndex);

                // 获取该 li 元素下的第一个 img 标签的 src 属性
                const imgUrl = randomLi.find('img').attr('src');

                // 提取链接中最后一个 '/' 后面的内容作为 ID
                let imgName = imgUrl.substring(imgUrl.lastIndexOf('/') + 1);
                // 返回 ID
                return imgName;
            }
        } else {
            return false;
        }
    } catch (err) {
        console.error('An error occurred:', err.message);
        return false;
    }

}

export function getHDWallpaper(name) {
    if (!name) { return false; }
    if (typeof name === 'string') {
        const prefix = str.substring(0, 2);
        let url = `https://w.wallhaven.cc/full/${prefix}/wallhaven-${name}`

        // 发送 GET 请求获取图片二进制数据
        axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer'
        }).then(response => {
            // 将二进制数据写入文件
            fs.writeFileSync(`../../resources/wallpaper/${name}`, response.data);
        }).catch(error => {
            console.log(error);
        });

    }



}