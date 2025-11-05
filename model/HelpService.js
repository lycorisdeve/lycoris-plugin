/*
 * @description:
 * @author: 名字
 * @date: Do not edit
 */
// 导入所需函数
import fs from "fs/promises";
import lodash from "lodash";
import { Common, Data } from "../components/Index.js";
import Theme from "../components/help/HelpTheme.js";
import { pluginResources } from "../components/lib/Path.js";

// 定义 help 文件夹路径和配置文件路径
const helpPath = `${pluginResources}/help`;
const HELP_CFG_PATH = `${helpPath}/help-cfg.js`;
const HELP_LIST_PATH = `${helpPath}/help-list.js`;

// 异步加载并合并帮助配置
async function loadHelpConfig() {
  try {
    // 检查配置文件是否存在
    const [helpCfgStat, helpListStat] = await Promise.all([
      fs.promises.stat(HELP_CFG_PATH),
      fs.promises.stat(HELP_LIST_PATH),
    ]);

    // 如果至少一个配置文件存在，则加载并合并它们
    if (helpCfgStat.isFile() || helpListStat.isFile()) {
      const version = new Date().getTime();
      const fileUrl = `file://${
        helpCfgStat.isFile() ? HELP_CFG_PATH : HELP_LIST_PATH
      }?version=${version}`;
      const [helpCfg, helpList] = await Promise.all([
        helpCfgStat.isFile() ? import(fileUrl) : null,
        helpListStat.isFile() ? import(fileUrl) : null,
      ]);

      return { helpCfg, helpList };
    }

    // 如果两个配置文件都不存在，则返回空对象
    return {};
  } catch (err) {
    // 如果发生错误，则返回空对象
    return {};
  }
}

class HelpService {
  async help(e) {
    // 加载自定义和系统级配置数据
    const { diyCfg, sysCfg } = await Data.importCfg("help");

    // 加载并合并帮助配置
    const { helpCfg, helpList } = await loadHelpConfig();
    const custom = lodash.isArray(helpCfg?.helpCfg)
      ? { helpList: helpCfg.helpCfg, helpCfg: {} }
      : helpCfg || {};
    const mergedHelpCfg = lodash.defaults(
      diyCfg.helpCfg || {},
      custom.helpCfg,
      sysCfg.helpCfg
    );
    const mergedHelpList =
      diyCfg.helpList || custom.helpList || sysCfg.helpList;

    // 过滤和转换帮助项目组数组
    const helpGroup = mergedHelpList
      .flatMap((group) => {
        if (group.auth === "master" && !e.isMaster) {
          return [];
        }

        group.list.forEach((help) => {
          const icon = +help.icon;
          help.css = icon
            ? `background-position:-${((icon - 1) % 10) * 50}px -${
                Math.floor((icon - 1) / 10) * 50
              }px`
            : "display:none";
        });

        return [group];
      })
      .filter(Boolean);

    // 获取主题数据，并渲染帮助页面
    const themeData = await Theme.getThemeData(
      diyCfg.helpCfg || {},
      sysCfg.helpCfg || {}
    );

    return {
      helpCfg: mergedHelpCfg,
      helpGroup,
      ...themeData,
      element: "default",
    };
  }
  /**
   * 通用帮助方法
   * @param  e - event对象
   * @param {string} path - 配置路径文件
   * @returns {object} 帮助数据对象
   */
  async customHelp(e, path) {
    // 确定path路径文件是否存在

    // 加载自定义和系统级配置数据
    let diyCfg = await Data.importModule(`config/help/${path}.js`);
    let sysCfg = await Data.importModule(`config/system/help_system.js`);
    if (diyCfg.isSys) {
      console.error(`lycoris-plugin: config/help/${path}.js无效，已忽略`);
      diyCfg = {};
    }

    const mergedHelpCfg = lodash.defaults(
      diyCfg.helpCfg || {},
      {},
      sysCfg.helpCfg
    );

    const mergedHelpList = diyCfg.helpList || {};

    // 过滤和转换帮助项目组数组
    const helpGroup = mergedHelpList
      .flatMap((group) => {
        if (group.auth === "master" && !e.isMaster) {
          return [];
        }

        group.list.forEach((help) => {
          const icon = +help.icon;
          help.css = icon
            ? `background-position:-${((icon - 1) % 10) * 50}px -${
                Math.floor((icon - 1) / 10) * 50
              }px`
            : "display:none";
        });

        return [group];
      })
      .filter(Boolean);

    // 获取主题数据，并渲染帮助页面
    const themeData = await Theme.getThemeData(
      diyCfg.helpCfg || {},
      sysCfg.helpCfg || {}
    );

    return {
      helpCfg: mergedHelpCfg,
      helpGroup,
      ...themeData,
      element: "default",
    };
  }
}

export default new HelpService();
