import { Version } from "../Index.js";
import Config from "../Config.js";
import { pluginResources, pluginRootPath } from "./Path.js";
import { join } from "path";
import puppeteer from "../../../../lib/puppeteer/puppeteer.js";

async function rednering(path, params, cfg) {
  let { e } = cfg;
  if (!e.runtime) {
    console.log("未找到e.runtime，请升级至最新版Yunzai");
  }
  return e.runtime.render("lycoris-plugin", path, params, {
    retType: cfg.retMsgId ? "msgId" : "default",
    beforeRender({ data }) {
      let resPath = data.pluResPath;
      const layoutPath = `${pluginResources}/common/layout/`;
      return {
        ...data,
        _res_path: resPath,
        _layout_path: layoutPath,
        _tpl_path: `${pluginResources}/common/tpl/`,
        defaultLayout: layoutPath + "default.html",
        elemLayout: layoutPath + "elem.html",
        sys: {
          scale: Cfg.scale(cfg.scale || 1),
          copyright: `Created By Yunzai-Bot<span class="version">${Version.yunzai}</span> & Lycoris-Plugin<span class="version">${Version.version}</span>`,
        },
      };
    },
  });
}

function scale(pct = 1) {
  const scale = Math.min(
    2,
    Math.max(0.5, Number(Config.config.renderScale) / 100)
  );
  pct = pct * scale;
  return `style=transform:scale(${pct})`;
}

async function gitstatus() {
  const status = await Version.getUpdateStatus();
  if (status.latest) {
    return ` SHA: <span class="version">${status.currentCommitId}</span>`;
  } else {
    return ` SHA: <span class="version">${status.currentCommitId}</span> <span class="tip">(有新版本: ${status.remoteCommitId})</span>`;
  }
}

const Render = {
  /**
   *
   * @param {string} path html模板路径
   * @param {*} params 模板参数
   * @param {*} cfg 渲染参数
   * @param {boolean} multiPage 是否分页截图，默认false
   * @returns
   */
  async render(path, params) {
    path = path.replace(/.html$/, "");
    const savePath = "/resources/" + path.replace("html/", "") + "/";
    const data = {
      _res_path: (join(pluginRootPath, "/resources") + "/").replace(/\\/g, "/"),
      _layout_path: (
        join(pluginRootPath, "/resources", "html", "common", "layout") + "/"
      ).replace(/\\/g, "/"),
      defaultLayout: (
        join(pluginRootPath, "/resources", "html", "common", "layout") +
        "/default.html"
      ).replace(/\\/g, "/"),
      elemLayout: (
        join(pluginRootPath, "/resources", "html", "common", "layout") +
        "/elem.html"
      ).replace(/\\/g, "/"),
      sys: {
        scale: scale(params?.scale || 1),
      },
      copyright: ``,
      pageGotoParams: {
        waitUntil: "load",
      },
      tplFile: `${pluginRootPath}/resources/${path}.html`,
      pluResPath: `${pluginRootPath}/resources/`,
      saveId: path.split("/").pop(),
      imgType: "jpeg",
      multiPage: true,
      multiPageHeight: 12000,
      ...params,
    };
    return await puppeteer.screenshots(
      Version.BotName === "Karin" ? savePath : pluginRootPath + savePath,
      data
    );
  },
};

export default Render;
