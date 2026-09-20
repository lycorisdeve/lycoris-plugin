/**
* 此配置文件为系统使用,请勿修改,否则可能无法正常使用
*
* 如需自定义配置请修改上一级 help.js
*
* */
// 帮助配置
export const helpCfg = {
    // 帮助标题
    title: '彼岸花帮助',

    // 帮助副标题
    subTitle: 'Yunzai-Bot & Lycoris-Plugin',

    // 帮助表格列数,可选:2-5,默认3
    // 注意:设置列数过多可能导致阅读困难,请参考实际效果进行设置
    colCount: 3,

    // 单列宽度,默认265
    // 注意:过窄可能导致文字有较多换行,请根据实际帮助项设定
    colWidth: 265,

    // 皮肤选择,可多选,或设置为all
    // 皮肤包放置于 resources/help/theme
    // 皮肤名为对应文件夹名
    // theme: 'all', // 设置为全部皮肤
    // theme: ['default','theme2'], // 设置为指定皮肤
    theme: 'all',

    // 排除皮肤:在存在其他皮肤时会忽略该项内设置的皮肤
    // 默认忽略default:即存在其他皮肤时会忽略自带的default皮肤
    // 如希望default皮肤也加入随机池可删除default项
    themeExclude: ['default'],

    // 是否启用背景毛玻璃效果,若渲染遇到问题可设置为false关闭
    bgBlur: false,
    style: {
        fontColor: '#ceb78b',
        descColor: '#eee',
        contBgColor: 'rgba(6, 21, 31, .5)',
        contBgBlur: 3,
        headerBgColor: 'rgba(6, 21, 31, .4)',
        rowBgColor1: 'rgba(6, 21, 31, .2)',
        rowBgColor2: 'rgba(6, 21, 31, .35)'
    }
}

// 默认帮助菜单：按用途分组，示例与当前插件指令保持一致。
export const helpList = [{
    group: '日常生活',
    list: [
        { icon: 80, title: '签到 / 打卡 / 冒泡', desc: '每日签到，领取好感度和原石' },
        { icon: 81, title: '上班 / 下班', desc: '记录工作时长与打卡奖励' },
        { icon: 24, title: '#日期', desc: '今日日期、节日与倒计时' },
        { icon: 63, title: '#吃什么', desc: '随机推荐食物' },
        { icon: 63, title: '#添加食物 苹果', desc: '添加自定义食物' },
        { icon: 63, title: '#删除食物 苹果', desc: '删除指定自定义食物' },
        { icon: 63, title: '#食物列表', desc: '查看已添加的食物菜单' }
    ]
}, {
    group: '新闻与资讯',
    list: [
        { icon: 23, title: '#新闻 / #news', desc: '60 秒早报，可用 #news1 至 #news4' },
        { icon: 25, title: 'AI新闻', desc: '获取每日 AI 资讯' },
        { icon: 25, title: 'AI排行', desc: '查看 AI 模型排行榜' },
        { icon: 26, title: '#油价 江苏', desc: '查询指定省份油价，默认江苏' }
    ]
}, {
    group: '游戏功能',
    list: [
        { icon: 33, title: '#epic', desc: '本期 Epic 免费游戏' },
        { icon: 31, title: '#wf帮助', desc: '战甲指令，如 #wf赏金、#wf地球平原' },
        { icon: 46, title: '#商店', desc: '旧版商店：#购买商品纠缠之缘1' }
    ]
}, {
    group: '图片与绘图',
    list: [
        { icon: 22, title: '#来一张壁纸', desc: '获取随机壁纸' },
        { icon: 22, title: '#壁纸搜索 landscape', desc: '翻页：#下一页壁纸 / #上一页壁纸' },
        { icon: 21, title: '#次元壁纸', desc: '也支持 #次元cos、#次元jk、#次元插画' },
        { icon: 59, title: '#色图 风景', desc: '按标签搜索 Pixiv 图片' },
        { icon: 59, title: '#ss帮助', desc: 'Pixiv 标签、作品、多图等完整用法' },
        { icon: 25, title: '#ts绘图 星空', desc: '根据提示词生成 AI 图片' }
    ]
}, {
    group: '搜索与工具',
    list: [
        { icon: 58, title: '#bt搜索 Ubuntu', desc: '多源搜索，返回磁力或种子地址' },
        { icon: 65, title: 'https://example.com', desc: '直接发送网址触发网页截图' },
        { icon: 65, title: '#gittr', desc: '查看 GitHub 趋势' },
        { icon: 27, title: '#rss 帮助', desc: '查看订阅用法，管理操作限主人' },
        { icon: 97, title: '#彼岸花帮助', desc: '查看本菜单' },
        { icon: 98, title: '#彼岸花版本', desc: '查看版本与更新记录' }
    ]
}, {
    group: '聊天关键词触发',
    list: [
        { icon: 61, title: '老猫 / 猫佬 / 羊总', desc: '随机图片，也支持大部分原有称呼' },
        { icon: 62, title: '紫卡 / 灵化 / 白鸡 / 大佬', desc: '随机 COS 图片' },
        { icon: 63, title: '原神 / 电波 / 买家秀 / 图', desc: '随机买家秀或壁纸' }
    ]
}, {
    group: '主人管理',
    auth: 'master',
    list: [
        { icon: 95, title: '#彼岸花更新', desc: '强制更新：#彼岸花强制更新' },
        { icon: 27, title: '#rss add URL 名称', desc: '添加订阅；#rss list 查看列表' },
        { icon: 27, title: '#rss del 1', desc: '按列表序号或 URL 删除订阅' },
        { icon: 27, title: '#rss 开启合并推送 1', desc: '按订阅合并，单条也合并；关闭用 #rss 关闭合并推送 1' },
        { icon: 27, title: '#rss 开启全局合并推送', desc: '本轮所有订阅按群合并；#rss 关闭全局合并推送 恢复' },
        { icon: 27, title: '#rss push', desc: '检查更新；#rss 强制推送 重发近期内容' },
        { icon: 27, title: '#rss 开启 / #rss 关闭', desc: '文本回退：#rss 开启文本推送' },
        { icon: 27, title: '#rss cron */10 * * * *', desc: '设置 RSS 检查频率' },
        { icon: 65, title: '#截图开启 / #截图关闭', desc: '#截图切换 切换模式；#截图设置 查看配置' },
        { icon: 26, title: '#添加江苏油价推送', desc: '添加要推送油价的省份' }
    ]
}]

export const isSys = true
