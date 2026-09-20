import Config from "../components/Config.js";
import { Render } from "../components/Index.js";
import plugin from "../../../lib/plugins/plugin.js";
import HelpService from "../model/HelpService.js";
import fetchJSON from "../model/services/WarframeService.js";
import { queryPattern, resolveQuery, buildWarframeView, paginateWarframeView } from "../model/services/WarframeView.js";

export class warframe extends plugin {
  constructor() {
    super({
      name: "warframe",
      dsc: "Warframe 图片情报查询",
      event: "message",
      priority: 2000,
      rule: [
        { reg: /^#?wf\s*(帮助|help|菜单)$/i, fnc: "menu" },
        { reg: queryPattern, fnc: "wfquery" },
        { reg: /^奥迪斯(.*)/, fnc: "ordis" },
      ],
    });
  }

  async menu(e) {
    const data = await HelpService.customHelp(e, "warframe_help");
    return e.reply(await Render.render("help/index.html", data));
  }

  async sendView(e, view) {
    for (const page of paginateWarframeView(view)) {
      const images = await Render.render("html/warframe/warframe", {
        ...page, imgType: "png", multiPage: true, multiPageHeight: 2400,
      });
      if (!images || (Array.isArray(images) && !images.length)) throw new Error("图片渲染未返回结果");
      await e.reply(images);
    }
  }

  async query(e, endpoint, request) {
    try {
      const configured = Config.getConfig("config")?.warframe?.server;
      const server = configured === "ZH" ? "ZH" : "ZHCN";
      const data = await request(server);
      await this.sendView(e, buildWarframeView(endpoint, data, { server }));
    } catch {
      logger.error("[Warframe] 查询或图片发送失败");
      await e.reply("Warframe 查询或图片发送失败，请稍后重试。");
    }
  }

  async wfquery(e) {
    const endpoint = resolveQuery(e.msg);
    if (!endpoint) return e.reply("请使用 #wf帮助 查看可用查询指令。");
    return this.query(e, endpoint, server => fetchJSON(`https://api.null00.com/world/${server}/${endpoint}`));
  }

  async ordis(e) {
    const keyword = e.msg.replace(/^奥迪斯/, "").trim();
    if (!keyword) return e.reply("请在命令后输入查询内容，例如：奥迪斯 阴阳双子");
    return this.query(e, "ordis", () => fetchJSON("https://api.null00.com/ordis/getTextMessage", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text: keyword }),
    }));
  }
}
