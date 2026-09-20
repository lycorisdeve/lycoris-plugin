# Lycoris-Plugin

Lycoris-Plugin 是一个 Yunzai-Bot 的附属插件,具体可见#彼岸花帮助
**自用插件**,内含许多借鉴的其他插件代码

## 功能入口

- `apps/Ai.js`：AI 新闻与 AI 模型排行榜，分别使用原有 `aiNews`、`arenaRank` 配置，独立定时推送。
- `apps/DailyLife.js`：日期节日提醒、今天吃什么及食物菜单管理，日期推送仍使用 `dateReminder` 配置。

以上入口由原 `AiNews.js`、`AiRank.js`、`Date.js`、`EatWhat.js` 合并而来，指令保持不变。手动覆盖更新时请移除这四个旧入口，避免重复注册，然后重启 Yunzai-Bot。


## 安装与更新

请将 Lycoris-Plugin 放置在 Yunzai-Bot 的 plugins 目录下,重启 Yunzai-Bot 后即可使用。

推荐使用 git 进行安装,以方便后续升级。在 Yunzai 根目录夹打开终端,运行

```
使用Gitee
git clone https://gitee.com/aurora-love/lycoris-plugin.git ./plugins/lycoris-plugin/
使用Github
git clone https://github.com/nighamare/lycoris-plugin.git ./plugins/lycoris-plugin/
```

进行安装。建议使用上述命令进行安装,以便于后续更新。 管理员发送 #彼岸花更新 即可自动更新

如果是手工下载的 zip 压缩包,请将解压后的 lycoris-plugin 文件夹(请删除压缩自带的-master 后缀)放置在 Yunzai 目录下的 plugins 文件夹内。
你可以发送 #彼岸花帮助 来获取菜单,#彼岸花版本 看当前版本更新内容

#### 功能列表

| 分类 | 功能 | 命令示例 |
| ---- | ---- | -------- |
| 日常 | 签到、上下班打卡 | 签到 / 上班 / 下班 |
| 日常 | 日期与食物菜单 | #日期 / #吃什么 / #添加食物 苹果 / #食物列表 |
| 资讯 | 早报、AI 新闻与排行 | #新闻 / AI新闻 / AI排行 |
| 资讯 | 油价 | #油价 江苏 |
| 游戏 | Epic、Warframe | #epic / #wf帮助 / #wf赏金 |
| 游戏 | 旧版商店 | #商店 / #购买商品纠缠之缘1 |
| 图片 | 壁纸、次元小镇、Pixiv | #来一张壁纸 / #壁纸搜索 landscape / #次元壁纸 / #ss帮助 |
| 绘图 | AI 图片生成 | #ts绘图 星空 |
| 工具 | BT 搜索 | #bt搜索 Ubuntu（也支持 bt Ubuntu） |
| 工具 | 网页截图、GitHub 趋势 | 直接发送 https:// 开头的网址 / #gittr |
| 订阅 | RSS 使用说明 | #rss 帮助（订阅管理限主人） |

秀人插件已移除。手动覆盖更新时请删除旧的 `apps/Xiuren.js`，避免旧指令继续加载。

#### BT 搜索

使用 [Nyaa RSS](https://nyaa.si/?page=rss&q=Ubuntu)、[动漫花园 RSS](https://share.dmhy.org/topics/rss/rss.xml?keyword=Ubuntu) 和 [蜜柑计划 RSS](https://mikanani.me/RSS/Search?searchstr=Ubuntu)。2026-09-20 已验证三者返回有效 RSS；这些来源以动漫资源为主，搜索不保证覆盖所有类型。

新安装默认直连。已有 `bt.proxy`、`bt.proxyApi` 配置仍可使用；代理 API 返回错误或非 RSS 时，会回退原站请求。若启用 HTTP 代理，原站请求仍通过该代理，否则直连。不会改写本地配置。结果最多展示 10 条，并区分磁力链接与 `.torrent` 地址；网络失败不会再提示成“没有搜索到”。

回归测试（无需启动 Yunzai）：`node --experimental-vm-modules --test tests/*.test.js`。

## 免责声明

1. 功能仅限内部交流与小范围使用,请勿将 Yunzai-Bot 及 Earth-K-Plugin 用于以盈利为目的的场景
2. 图片与其他素材均来自于网络,仅供交流学习使用,如有侵权请联系,会立即删除
3. 请注意,使用本代码的用户必须遵守所有适用的法律、规定和政策。本代码仅供参考和教育目的,不应用于任何商业或实际应用。使用本代码造成的任何损失或损害,开发者不承担任何责任。本代码并不保证其完整性、准确性或可靠性。使用本代码所产生的结果,开发者不对其质量或效果作任何保证或承诺。用户应自行承担任何因使用本代码而导致的后果或风险。请注意,使用本代码可能会涉及到第三方知识产权或其他权利。用户应确保他们拥有使用所有相关资料的合法权利,并遵守所有适用的法律、规定和政策。本代码开发者不对用户在此方面的行为承担任何责任。最后,请注意本代码可能存在缺陷或错误,如有任何问题,请联系开发者进行修正。感谢您的使用!

#### 其他

- 最后再求一个 star~,您的支持是维护本项目的动力
- 交流群号:木得
- 赞助支持:[Lycoris 爱发电](https://afdian.net/a/lycorisdeve)

#### 鸣谢

- [Yunzai-Bot](URL_ADDRESS.com/yunzai-bot/yunzai)
- [miao-plugin](URL_ADDRESS.com/imcute/miao-plugin)
- [earth-k-plugin](URL_ADDRESS.com/earth-k/earth-k-plugin)
- [kkk-plugin](URL_ADDRESS.com/kkk/kkk-plugin)
