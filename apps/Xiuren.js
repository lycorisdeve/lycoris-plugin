
import axios from 'axios'
import * as cheerio from 'cheerio';

// 使用反代API
const PROXY_API = 'https://proxyapi.198143.xyz/'
const XIUREN_SITE = 'https://www.xiurenb.net/page/'
let xiurenResult = [];
let keyword = ''

export class XiuRenPlugin extends plugin {
  constructor() {
    super({
      name: 'Xiu Ren Plugin', // 插件名称
      dsc: '秀人网', // 插件描述
      event: 'message', // 监听事件类型
      priority: 1000, // 优先级（数值越大，优先级越高）
      rule: [
        {
          reg: "^#秀人搜索(.*)$|#看秀图(.*)", // 匹配规则
          fnc: 'searchXiuren', // 匹配成功时调用的方法名
        },
      ],
    });
  }

  // 使用反代API获取URL内容
  async fetchWithProxy(url) {
    try {
      // 对目标URL进行编码
      const encodedUrl = encodeURIComponent(url);
      const proxyUrl = `${PROXY_API}${encodedUrl}`;
      
      const response = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000 // 15秒超时
      });
      
      return response.data;
    } catch (error) {
      logger.error(`代理请求失败: ${error.message}`);
      throw error;
    }
  }

  async searchXiuren(e) {
    let message = e.msg
    if (message.includes("#秀人搜索")) {
      let pageNum
      if (message.includes("#秀人搜索页码")) {
        pageNum = message.replace(/#秀人搜索页码/g, "").trim()
      } else {
        pageNum = 1
        keyword = message.replace(/#秀人搜索/g, "").trim()
      }
      if (!keyword) {
        e.reply("请输入搜索关键词~")
        return
      }
      try {
        let targetUrl = XIUREN_SITE + pageNum + "?s=" + encodeURIComponent(keyword)
        
        // 使用反代API获取内容
        const html = await this.fetchWithProxy(targetUrl);
        const $ = cheerio.load(html);
        let msgInfos = []
        xiurenResult = []; // 清空之前的结果
        
        $('.article-content').each((i, ele) => {
          let obj = {};
          let href = $(ele).find('a').attr('href');
          obj.title = $(ele).find('img').attr('alt');
          obj.imgSrc = $(ele).find('img').attr('src');
          
          // 确保图片链接是完整的URL
          if (obj.imgSrc && !obj.imgSrc.startsWith('http')) {
            obj.imgSrc = new URL(obj.imgSrc, XIUREN_SITE).href;
          }
          
          if (href) {
            xiurenResult.push(href);
            msgInfos.push(obj);
          }
        });

        if (msgInfos.length > 0) {
          let msgList = [];
          msgList.push({
            message: '你可以使用 #看秀图1 / #看秀图2 来查看详细图片，或者使用 #秀人搜索页码2 来跳转页码',
            nickname: e.nickname,
            user_id: e.user_id
          })
          let count = 1
          msgInfos.forEach((item) => {
            let tmpTitle = item.title
            if (tmpTitle && !tmpTitle.endsWith(']')) {
              tmpTitle += ']';
            }
            tmpTitle = tmpTitle.replace(/\[/g, '【').replace(/\]/g, '】');
            let tmpMsg = `${count}、\n[CQ:image,file=${item.imgSrc}]\n${tmpTitle}`
            count++
            let msgInfo = {
              message: tmpMsg,
              nickname: e.nickname,
              user_id: e.user_id
            };
            msgList.push(msgInfo)
          });
          logger.info(msgList)
          e.reply("搜索ing，请稍后。。。")
          e.reply(await Bot.makeForwardMsg(msgList), false)
        } else {
          await e.reply('未找到匹配的内容，请尝试其他关键词');
        }
      } catch (err) {
        logger.error(`秀人网请求失败: ${err.message}`);
        await e.reply(`请求失败，请稍后重试。错误信息: ${err.message}`);
      }
    } else if (message.includes("#看秀图")) {
      let k = e.msg.replace(/#看秀图/g, "").trim()
      if (isNaN(k)) {
        e.reply("请输入数字！！！")
        return
      }
      let k1 = Number(k - 1)
      let url2 = xiurenResult[k1]

      if (url2) {
        try {
          // 使用反代API获取详情页内容
          const html1 = await this.fetchWithProxy(url2);
          const $1 = cheerio.load(html1);
          const msgList1 = [];
          
          $1('.entry-wrapper img').each((index, element) => {
            let imgSrc = $1(element).attr('src');
            
            // 确保图片链接是完整的URL
            if (imgSrc && !imgSrc.startsWith('http')) {
              imgSrc = new URL(imgSrc, url2).href;
            }
            
            if (imgSrc) {
              let msg = {
                message: segment.image(imgSrc),
                nickname: e.nickname,
                user_id: e.user_id
              }
              msgList1.push(msg);
            }
          });
          
          if (msgList1.length > 0) {
            e.reply(await Bot.makeForwardMsg(msgList1), false)
          } else {
            e.reply("未找到图片，可能是网站结构已变更")
          }
        } catch (err) {
          logger.error(`获取详细图片失败: ${err.message}`);
          e.reply(`获取图片失败，请稍后重试。错误信息: ${err.message}`);
        }
      } else {
        e.reply("结果不存在！！！")
      }
    }
  }
}
