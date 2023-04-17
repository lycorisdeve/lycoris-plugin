import * as cheerio from 'cheerio';
import axios from 'axios';
import Translate from '../../utils/translate.js'

export async function getRandomLinkId() {
  const page = Math.floor(Math.random() * 11000);
  let url = `https://wallhaven.cc/search?categories=111&purity=010&sorting=favorites&order=desc&ai_art_filter=0&page=${page}`

  try {
    // 发送 HTTP 请求获取 HTML 内容
    const response = await axios.get(url, {
      timeout: 15000
    });
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

export async function getHDWallpaper(name) {
  if (!name) { return false; }
  if (typeof name === 'string') {
    const prefix = name.substring(0, 2);
    const url = `https://w.wallhaven.cc/full/${prefix}/wallhaven-${name}`;


    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      });

      const base64Image = Buffer.from(response.data, 'binary').toString('base64');

      return base64Image;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }
  return false;
}

export async function searchImage(keyword) {
  const url = `https://wallhaven.cc/search?q=${keyword}&categories=111&purity=010&sorting=relevance&order=desc&ai_art_filter=0`
  try {
    // 发送 HTTP 请求获取 HTML 内容
    const response = await axios.get(url, {
      timeout: 15000
    });
    const html = response.data;

    // 使用 Cheerio 解析 HTML 内容，并返回一个解析器函数
    const $ = cheerio.load(html);

    // 获取所有 <figure> 元素下的 <img> 元素
    const imgs = $('figure img[data-src]');

    if (imgs.length > 0) {
      let imgInfos = [];
      // 遍历每个 <img> 元素，并提取 data-src 属性值作为图片链接
      imgs.each(function () {
        const imgUrl = $(this).attr('data-src');
        if (imgUrl) {

          const imgName = imgUrl.substring(imgUrl.lastIndexOf('/') + 1);
          let imgInfo = {
            imgUrl: imgUrl,
            imgName
          }
          imgInfos.push(imgInfo);
        }
      });
      return imgInfos;
    } else {
      logger.info('没有找到任何图片');
      return false;
    }
  } catch (err) {
    logger.error('获取图片列表出错:', err);
    return false;
  }
}

