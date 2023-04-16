
import plugin from '../../../lib/plugins/plugin.js'
import axios from 'axios'
import cheerio from 'cheerio'


const XIUREN_URL = 'https://www.tuxiuren.com/page/'
let xiurenResult = [];
let keyword = ''

export class XiuRenPlugin extends plugin {
  constructor() {
    super({
      name: 'Xiu Ren Plugin', // 插件名称
      dsc: '秀人网妹子爬虫插件', // 插件描述
      event: 'message', // 监听事件类型
      priority: 1000, // 优先级（数值越大，优先级越高）
      rule: [
        {
          reg: "^#秀人搜索(.*)$|#看秀图(.*)|#选隐藏视频(.*)", // 匹配规则
          fnc: 'searchXiuren', // 匹配成功时调用的方法名
        },
      ],
    });
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
        e.reply("请输入搜素关键词~")
        return
      }
      try {
        let url = XIUREN_URL + pageNum + "?s=" + keyword
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        let msgInfos = []
        $('div.placeholder').each((i, ele) => {
          let obj = {};
          let href = $(ele).find('a').attr('href');
          obj.title = $(ele).find('img').attr('alt');
          obj.imgSrc = $(ele).find('img').attr('data-src');
          xiurenResult.push(href);
          msgInfos.push(obj)
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
          await e.reply('未找到匹配的内容');
        }
      } catch (err) {
        logger.error(err);
        await e.reply('请求失败');
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
        const response1 = await axios.get(url2);
        const html1 = response1.data;
        const $1 = cheerio.load(html1);
        const msgList1 = [];
        $1('.entry-wrapper img').each((index, element) => {
          const imgSrc = $1(element).attr('src');
          let msg = {
            message: segment.image(imgSrc),
            nickname: e.nickname,
            user_id: e.user_id
          }
          msgList1.push(msg);
        });
        e.reply(await Bot.makeForwardMsg(msgList1), false)

      } else {
        e.reply("结果不存在！！！")
      }

    }

  }
}
