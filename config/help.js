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
    bgBlur: true
}

// 帮助菜单内容
export const helpList = [{
    group: '日常功能',
    list: [{
        icon: 80,
        title: '签到',
        desc: '签到/打卡/冒泡'
    }, {
        icon: 63,
        title: '吃什么',
        desc: '#吃什么 #添加食物'
    }, {
        icon: 46,
        title: '商店',
        desc: '#商店 #购买商品纠缠之缘'
    }]
}, {
    group: '资讯功能',
    list: [{
        icon: 23,
        title: '60S新闻',
        desc: '#news #news1 #news2 #新闻'
    }, {
        icon: 25,
        title: 'AI新闻',
        desc: 'AI新闻 | 新闻推送'
    }, {
        icon: 24,
        title: '摸鱼日历',
        desc: '#摸鱼日历 #摸鱼日报 #日期'
    }, {
        icon: 25,
        title: '摸鱼视频',
        desc: '#摸鱼视频日报 #内涵段子'
    }, {
        icon: 33,
        title: 'Epic免费游戏',
        desc: '#epic (可在config配置推送)'
    }, {
        icon: 31,
        title: 'Warframe',
        desc: '#wf赏金 #wf地球平原'
    }, {
        icon: 27,
        title: 'RSS订阅',
        desc: '#rss 开启/关闭/订阅列表'
    }, {
        icon: 26,
        title: '查油价',
        desc: '#油价 [省份]'
    }]
}, {
    group: '图片功能',
    list: [{
        icon: 22,
        title: '壁纸',
        desc: '#来一张壁纸 #壁纸搜索xxx'
    }, {
        icon: 21,
        title: '次元小镇',
        desc: '#次元[cos|jk|汉服|插画|壁纸]'
    }, {
        icon: 57,
        title: '秀人网',
        desc: '#秀人热门 #秀人搜索xxx'
    }, {
        icon: 58,
        title: 'BT搜索',
        desc: '#bt搜索xxx'
    }, {
        icon: 59,
        title: 'Pixiv图片',
        desc: '#色图 [标签] #r18 [标签]'
    }, {
        icon: 60,
        title: '动漫写真',
        desc: '#动漫写真 #写真'
    }, {
        icon: 61,
        title: '高清壁纸',
        desc: '#高清壁纸 #游戏壁纸'
    }, {
        icon: 64,
        title: 'COS视频',
        desc: '#来点cos'
    }, {
        icon: 65,
        title: '网页截图',
        desc: '#网页截图 [网址]'
    }]
}, {
    group: '随机触发',
    list: [{
        icon: 61,
        title: '随机触发1',
        desc: '酒仙|井空|老猫|猫佬|羊总|猫哥|酒佬'
    }, {
        icon: 62,
        title: '随机触发2',
        desc: '紫卡|灵化|白鸡|大佬|吗喽|捞'
    }, {
        icon: 63,
        title: '随机触发3',
        desc: '原神|电波|声望|买家秀|图'
    }]
}, {
    group: '管理功能',
    auth: 'master',
    list: [{
        icon: 95,
        title: '#彼岸花(强制)更新',
        desc: '更新插件,可选强制更新'
    }, {
        icon: 97,
        title: '#彼岸花帮助',
        desc: '查看本页面'
    }, {
        icon: 98,
        title: '#彼岸花版本',
        desc: '查看版本信息'
    }]
}]
