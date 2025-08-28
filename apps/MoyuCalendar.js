import Config from "../components/Config.js";

const config = Config.getConfig("config");

const plugin_config = config.moyu;
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;
const isPush = config.moyu.isPush;

export class MoyuCalendarPlugin extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: "摸鱼日历",
      /** 功能描述 */
      dsc: "获取摸鱼日历，并定时推送",
      /** https://oicqjs.github.io/oicq/#events */
      event: "message",
      /** 优先级，数字越小等级越高 */
      priority: 1200,
      rule: [
        {
          /** 命令正则匹配 */
          reg: "^#摸鱼日历$",
          /** 执行方法 */
          fnc: "replyMoyuCalendar1",
        },
        {
          /** 命令正则匹配 */
          reg: "^#摸鱼日历1$",
          /** 执行方法 */
          fnc: "replyMoyuCalendar",
        },
        {
          /** 命令正则匹配 */
          reg: "^#摸鱼日历2$",
          /** 执行方法 */
          fnc: "replyMoyuCalendar2",
        },
        {
          /** 命令正则匹配 */
          reg: "^#摸鱼日报|摸鱼日报",
          /** 执行方法 */
          fnc: "moyuDayReport",
        },
        {
          /** 命令正则匹配 */
          reg: "#日期",
          /** 执行方法 */
          fnc: "todayInfo",
        },
        {
          /** 命令正则匹配 */
          reg: "段子|内涵段子|今日段子",
          /** 执行方法 */
          fnc: "neihanduanzi",
        },
        {
          /** 命令正则匹配 */
          reg: "摸鱼视频日报",
          /** 执行方法 */
          fnc: "videoMoyuRiBao",
        },
        {
          /** 命令正则匹配 */
          reg: "^#生成(.*)$",
          /** 执行方法 */
          fnc: "genImg",
        },
      ],
    });
    this.task = {
      /** 任务名 */
      name: "read60s定时推送",
      /** 任务方法名 */
      fnc: () => this.sendCornMoyuImage(),
      /** 任务cron表达式 */
      cron: CRON_EXPRESSION,
    };
  }

  async sendCornMoyuImage() {
    if (!isPush) {
      return;
    }
    try {
      let message = "摸鱼日历";
      let img = await getCalendar2();
      if (img != false) {
        message = segment.image(img);
      } else {
        message = "摸鱼日历获取失败，请稍后使用 #摸鱼日历 手动获取 ！";
      }

      for (const qq of plugin_config.private_ids) {
        Bot.sendPrivateMsg(qq, message).catch((err) => {
          logger.error(err);
        });
        await nonebot.get_bot().sendPrivateMsg(qq, message);
      }

      for (const qqGroup of plugin_config.group_ids) {
        Bot.sendGroupMsg(qqGroup, message).catch((err) => {
          logger.error(err);
        });
      }
    } catch (error) {
      logger.error("Error sending messages:", error);
    }
  }

  async replyMoyuCalendar(e) {
    let img = await getCalendar();
    if (img != false) {
      e.reply(segment.image(img));
    } else {
      e.reply("摸鱼日历获取失败，请稍后重试！");
    }
  }
  async replyMoyuCalendar1(e) {
    let img = await getCalendar2();
    if (img != false) {
      e.reply(segment.image(img));
    } else {
      e.reply("摸鱼日历获取失败，请稍后重试！");
    }
  }

  async moyuDayReport(e) {
    // e = await parseImg(e);
    let url = "https://dayu.qqsuu.cn/moyuribao/apis.php?type=json";
    let data = await fetch(url)
      .then((res) => res.json())
      .catch((err) => console.error(err));
    e.reply(segment.image(data.data));
  }
  async todayInfo(e) {
    // e = await parseImg(e);
    let url = "https://dayu.qqsuu.cn/moyurili/apis.php?type=json";
    let data = await fetch(url)
      .then((res) => res.json())
      .catch((err) => console.error(err));
    e.reply(segment.image(data.data));
  }
  async neihanduanzi(e) {
    // e = await parseImg(e);
    let url = "https://dayu.qqsuu.cn/neihanduanzi/apis.php?type=json";
    let data = await fetch(url)
      .then((res) => res.json())
      .catch((err) => console.error(err));
    e.reply(segment.image(data.data));
  }
  async videoMoyuRiBao(e) {
    // e = await parseImg(e);
    let url = "https://dayu.qqsuu.cn/moyuribaoshipin/apis.php?type=json";
    let data = await fetch(url)
      .then((res) => res.json())
      .catch((err) => console.error(err));
    e.reply(segment.video(data.data));
  }

  async genImg(e) {
    let tag = e.msg.replace(/#生成/g, "").trim();
    let url = `https://api.linhun.vip/api/huitu?text=${tag}&prompt=水印,最差质量，低质量，裁剪&ratio=宽&apiKey=2842bc94ca70fd0cd4190ee06c51dac4`;
    let data = await fetch(url)
      .then((res) => res.json())
      .catch((err) => console.error(err));
    e.reply(data.url, true);
  }
}

async function getCalendar() {
  try {
    // let url = 'https://api.vvhan.com/api/moyu?type=json';
    let url = "https://api.j4u.ink/v1/store/other/proxy/remote/moyu.json";
    // 发起第一个GET请求，明确不跟随重定向
    const response = await fetch(url).then((rs) => rs.json());
    if (response.code == 200) {
      return response.data.img_url;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}
async function getCalendar1() {
  try {
    let url = "https://api.vvhan.com/api/moyu?type=json";
    // let url = 'https://api.j4u.ink/v1/store/other/proxy/remote/moyu.json';
    // 发起第一个GET请求，明确不跟随重定向
    const response = await fetch(url).then((rs) => rs.json());
    if (response.success) {
      return response.url;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}
async function getCalendar2() {
  try {
    // let url = 'https://udp.qqsuu.cn/apis/moyu.php?type=json';
    let url = "https://api.zxki.cn/api/myrl";
    // 该接口会302重定向到摸鱼人图片地址
    // node-fetch 默认会跟随重定向，最终 response.url 即为图片地址
    const response = await fetch(url);
    // 检查响应类型
    if (response.ok && response.url && response.headers.get('content-type')?.startsWith('image')) {
      // 返回最终图片地址
      return response.url;
    } else {
      // 若未获取到图片地址则返回false
      return false;
    }
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}
