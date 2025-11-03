import fetch from "node-fetch";
import fs from "node:fs";
import yaml from "yaml";
import Config from "../components/Config.js";
import moment from "moment";
import puppeteer from "puppeteer";
import { pluginRootPath } from "../components/lib/Path.js";
import plugin from "../../../lib/plugins/plugin.js";
import HelpService from "../model/HelpService.js";

const config = Config.getConfig("config");
let server = config.warframe.server;

let url;
if (server === "ZHCN") {
  url = "https://api.null00.com/world/ZHCN/";
} else if (server === "ZH") {
  url = "https://api.null00.com/world/ZH/";
} else {
  logger.error("warframe插件配置错误，服务器默认设置为国服");
  url = "https://api.null00.com/world/ZHCN/";
}

//1.定义命令规则
export class warframe extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: "warframe",
      /** 功能描述 */
      dsc: "warframe信息查询",
      /** https://oicqjs.github.io/oicq/#events */
      event: "message",
      /** 优先级,数字越小等级越高 */
      priority: 2000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: "#wf帮助|wfhelp|wf菜单|wf帮助|wf菜单", //匹配消息正则,命令正则
          /** 执行方法 */
          fnc: "menu",
        },
      ],
    });
  }

  async menu(e) {
    let data = await HelpService.customHelp(e, "warframe_help");

    let img = await Render.render("help/index.html", data, { e, scale: 1.2 });
    e.reply(img);
    return;
  }
}
