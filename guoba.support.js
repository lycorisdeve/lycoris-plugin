import Config from "./components/Config.js";
import _ from "lodash";
import path from "path";
import { pluginName, pluginRootPath } from './components/lib/Path.js';

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'lycoris-plugin',
      title: '彼岸花插件',
      author: ['lycoris'],
      authorLink: ['https://github.com/lycorisdeve'],
      link: 'https://github.com/lycorisdeve/lycoris-plugin',
      isV3: true,
      isV2: false,
      showInMenu: true,
      description: 'Yunzai-Bot彼岸花插件',
      icon: 'twemoji:cherry-blossom',
      iconColor: '#FF69B4',
    },
    configInfo: {
      schemas: [
        {
          component: "Divider",
          label: "Epic Games 配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "epicGames.isPush",
          label: "是否推送",
          component: "Switch",
        },
        {
          field: "epicGames.schedule.month",
          label: "月份",
          component: "Input",
          componentProps: {
            placeholder: '每月',
          },
        },
        {
          field: "epicGames.schedule.dayOfWeek",
          label: "星期",
          component: "Input",
          componentProps: {
            placeholder: '周五,周日',
          },
        },
        {
          field: "epicGames.schedule.hour",
          label: "小时",
          component: "Input",
          componentProps: {
            placeholder: '12',
          },
        },
        {
          field: "epicGames.schedule.minute",
          label: "分钟",
          component: "Input",
          componentProps: {
            placeholder: '0',
          },
        },
        {
          field: "epicGames.schedule.second",
          label: "秒",
          component: "Input",
          componentProps: {
            placeholder: '0',
          },
        },
        {
          field: "epicGames.group_ids",
          label: "推送群组",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: "epicGames.private_ids",
          label: "推送私聊",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          component: "Divider",
          label: "每日60秒配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "read60s.isPush",
          label: "是否推送",
          component: "Switch",
        },
        {
          field: "read60s.schedule.hour",
          label: "小时",
          component: "Input",
          componentProps: {
            placeholder: '8',
          },
        },
        {
          field: "read60s.schedule.minute",
          label: "分钟",
          component: "Input",
          componentProps: {
            placeholder: '20',
          },
        },
        {
          field: "read60s.schedule.second",
          label: "秒",
          component: "Input",
          componentProps: {
            placeholder: '0',
          },
        },
        {
          field: "read60s.group_ids",
          label: "推送群组",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: "read60s.private_ids",
          label: "推送私聊",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          component: "Divider",
          label: "AI新闻配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "aiNews.isPush",
          label: "是否推送",
          component: "Switch",
        },
        {
          field: "aiNews.schedule.hour",
          label: "小时",
          component: "Input",
          componentProps: {
            placeholder: '9',
          },
        },
        {
          field: "aiNews.schedule.minute",
          label: "分钟",
          component: "Input",
          componentProps: {
            placeholder: '11',
          },
        },
        {
          field: "aiNews.schedule.second",
          label: "秒",
          component: "Input",
          componentProps: {
            placeholder: '0',
          },
        },
        {
          field: "aiNews.group_ids",
          label: "推送群组",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: "aiNews.private_ids",
          label: "推送私聊",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          component: "Divider",
          label: "翻译配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "baidu_translate.id",
          label: "百度翻译 APP ID",
          component: "Input",
          componentProps: {
            placeholder: '请输入APP ID',
          },
        },
        {
          field: "baidu_translate.key",
          label: "百度翻译密钥",
          component: "Input",
          componentProps: {
            placeholder: '请输入密钥',
          },
        },
        {
          field: "youdao_translate.id",
          label: "有道翻译 APP ID",
          component: "Input",
          componentProps: {
            placeholder: '请输入APP ID',
          },
        },
        {
          field: "youdao_translate.key",
          label: "有道翻译密钥",
          component: "Input",
          componentProps: {
            placeholder: '请输入密钥',
          },
        },
        {
          component: "Divider",
          label: "油价查询配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "oilPrice.isPush",
          label: "是否推送",
          component: "Switch",
        },
        {
          field: "oilPrice.schedule.year",
          label: "年",
          component: "Input",
          componentProps: {
            placeholder: '*',
          },
        },
        {
          field: "oilPrice.schedule.month",
          label: "月",
          component: "Input",
          componentProps: {
            placeholder: '*',
          },
        },
        {
          field: "oilPrice.schedule.week",
          label: "周",
          component: "Input",
          componentProps: {
            placeholder: '5',
          },
        },
        {
          field: "oilPrice.schedule.hour",
          label: "小时",
          component: "Input",
          componentProps: {
            placeholder: '8',
          },
        },
        {
          field: "oilPrice.schedule.minute",
          label: "分钟",
          component: "Input",
          componentProps: {
            placeholder: '30',
          },
        },
        {
          field: "oilPrice.schedule.second",
          label: "秒",
          component: "Input",
          componentProps: {
            placeholder: '0',
          },
        },
        {
          field: "oilPrice.group_ids",
          label: "推送群组",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: "oilPrice.private_ids",
          label: "推送私聊",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          field: "oilPrice.provinces",
          label: "推送省份",
          component: "GTags",
          componentProps: {
            allowAdd: true,
            allowDel: true,
          },
        },
        {
          component: "Divider",
          label: "Warframe 配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "warframe.server",
          label: "服务器",
          component: "Select",
          componentProps: {
            options: [
              { label: "国服", value: 'ZHCN' },
              { label: "国际服", value: 'ZH' },
            ],
          },
        },
        {
          component: "Divider",
          label: "截图配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "screenshot.fullScreen",
          label: "全屏截图",
          component: "Switch",
        },
        {
          field: "screenshot.quality",
          label: "质量",
          component: "InputNumber",
          componentProps: {
            min: 1,
            max: 100,
            step: 1,
          },
        },
        {
          field: "screenshot.minWidth",
          label: "最小宽度",
          component: "InputNumber",
          componentProps: {
            min: 1,
            step: 1,
          },
        },
        {
          field: "screenshot.maxWidth",
          label: "最大宽度",
          component: "InputNumber",
          componentProps: {
            min: 1,
            step: 1,
          },
        },
        {
          field: "screenshot.padding",
          label: "内边距",
          component: "InputNumber",
          componentProps: {
            min: 0,
            step: 1,
          },
        },
        {
          field: "screenshot.timeout.page",
          label: "页面超时",
          component: "InputNumber",
          componentProps: {
            min: 0,
            step: 1000,
          },
        },
        {
          field: "screenshot.timeout.resource",
          label: "资源超时",
          component: "InputNumber",
          componentProps: {
            min: 0,
            step: 1000,
          },
        },
        {
          field: "screenshot.timeout.render",
          label: "渲染超时",
          component: "InputNumber",
          componentProps: {
            min: 0,
            step: 1000,
          },
        },
        {
          field: "screenshot.proxyApi.url",
          label: "代理API URL",
          component: "Input",
          componentProps: {
            placeholder: 'https://proxyapi.198143.xyz/',
          },
        },
        {
          field: "screenshot.proxyApi.enabled",
          label: "启用代理API",
          component: "Switch",
        },
        {
          field: "renderScale",
          label: "HTML渲染精度",
          component: "InputNumber",
          componentProps: {
            min: 50,
            max: 200,
            step: 1,
          },
        },
        {
          component: "Divider",
          label: "BT搜索配置",
          componentProps: {
            orientation: "left",
            plain: true,
          },
        },
        {
          field: "bt.proxy.enable",
          label: "启用代理",
          component: "Switch",
        },
        {
          field: "bt.proxy.url",
          label: "代理URL",
          component: "Input",
          componentProps: {
            placeholder: 'http://127.0.0.1:7890',
          },
        },
        {
          field: "bt.proxyApi.enable",
          label: "启用代理API",
          component: "Switch",
        },
        {
          field: "bt.proxyApi.url",
          label: "代理API URL",
          component: "Input",
          componentProps: {
            placeholder: 'https://proxyapi.198143.xyz/{{url}}',
          },
        },
      ],
      getConfigData() {
        let config = Config.userConfig
        return config
      },
      setConfigData(data, { Result }) {
        for (let [keyPath, value] of Object.entries(data)) {
          Config.modify('config', keyPath, value)
        }
        return Result.ok({}, '保存成功~')
      },
    },
  }
}