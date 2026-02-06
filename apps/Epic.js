import plugin from "../../../lib/plugins/plugin.js";
import Config from "../components/Config.js";
import epicGamesMsg from "../model/services/EpicService.js";

/*
 * @description: epic免费游戏推送
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig("config");

const CRON_EXPRESSION = `${config.epicGames.schedule.second} ${config.epicGames.schedule.minute} ${config.epicGames.schedule.hour} * * ${config.epicGames.schedule.dayOfWeek}`;
// 获取group_ids和private_ids
const groupIds = config.epicGames.group_ids;
const privateIds = config.epicGames.private_ids;
const isPush = config.epicGames.isPush;
export class EpicGamesPlugin extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: "Epic免费游戏信息",
      /** 功能描述 */
      dsc: "获取Epic免费游戏信息,并定时推送",
      /** https://oicqjs.github.io/oicq/#events */
      event: "message",
      /** 优先级,数字越小等级越高 */
      priority: 1200,
      rule: [
        {
          /** 命令正则匹配 */
          reg: "^#epic$",
          /** 执行方法 */
          fnc: "getEpicGamesInfo",
        },
        // 强制推送
        {
            reg: "^#epic强制推送$",
            fnc: "epicGamesCorn",
        }
      ],
    });
    this.task = {
      /** 任务名 */
      name: "epic定时推送",
      /** 任务方法名 */
      fnc: () => this.epicGamesCorn(),
      /** 任务cron表达式 */
      cron: CRON_EXPRESSION,
    };
  }
  async epicGamesCorn() {
    if (!isPush) {
      return false;
    }
    // 检查groupIds和privateIds是否至少有一个有值且为数组类型
    if (
      (Array.isArray(groupIds) && groupIds.length > 0) ||
      (Array.isArray(privateIds) && privateIds.length > 0)
    ) {
      // 获取Epic Games消息
      let msgs = await epicGamesMsg();
      if (msgs.length > 0) {
        if (Array.isArray(groupIds)) {
          for (const id of groupIds) {
            for (const msg of msgs) {
              Bot.sendGroupMsg(id, msg).catch((err) => {
                logger.error(err);
              });
            }
          }
        }
        if (Array.isArray(privateIds)) {
          for (const id of privateIds) {
            for (const msg of msgs) {
              Bot.sendPrivateMsg(id, msg).catch((err) => {
                logger.error(err);
              });
            }
          }
        }
      } else {
        logger.error("groupIds 和 privateIds 都不是数组或者没有值。");
        return false;
      }
    }
  }
  async getEpicGamesInfo(e) {
    e.reply("正在为你检索epic免费游戏~~~");
    let msgs = await epicGamesMsg();
    if (msgs.length > 0) {
      for (const msg of msgs) {
        e.reply(msg);
      }
    } else {
      e.reply(msgs);
    }
  }
}
