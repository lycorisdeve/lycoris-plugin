/*
 * @description: 
 * @author: 名字
 * @date: Do not edit
 */
/*
* 此配置文件为系统使用，请勿修改，否则可能无法正常使用
*
* 如需自定义配置请复制修改上一级help_default.js
*
* */
// 帮助配置
export const helpCfg = {
    // 帮助标题
    title: '彼岸花帮助',

    // 帮助副标题
    subTitle: 'Yunzai-Bot & Lycoris-Plugin',

    // 帮助表格列数，可选：2-5，默认3
    // 注意：设置列数过多可能导致阅读困难，请参考实际效果进行设置
    colCount: 3,

    // 单列宽度，默认265
    // 注意：过窄可能导致文字有较多换行，请根据实际帮助项设定
    colWidth: 265,

    // 皮肤选择，可多选，或设置为all
    // 皮肤包放置于 resources/help/theme
    // 皮肤名为对应文件夹名
    // theme: 'all', // 设置为全部皮肤
    // theme: ['default','theme2'], // 设置为指定皮肤
    theme: 'all',

    // 排除皮肤：在存在其他皮肤时会忽略该项内设置的皮肤
    // 默认忽略default：即存在其他皮肤时会忽略自带的default皮肤
    // 如希望default皮肤也加入随机池可删除default项
    themeExclude: ['default'],

    // 是否启用背景毛玻璃效果，若渲染遇到问题可设置为false关闭
    bgBlur: true,
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

// 帮助菜单内容
export const helpList = [{
    group: '关联功能',
    list: [{
        icon: 80,
        title: '签到',
        desc: '签到/打卡/冒泡'
    }, {
        icon: 46,
        title: '商店',
        desc: '#商店 #购买商品纠缠之缘'
    }]
}, {
    group: '小功能',
    list: [{
        icon: 33,
        title: 'Epic',
        desc: '#epic 或 在config里配置定时发送'
    }, {
        icon: 31,
        title: 'Warframe',
        desc: 'wf警报 wf地球平原'
    }, {
        icon: 22,
        title: '壁纸',
        desc: '#来一张壁纸 #壁纸搜索xxx'
    }]
}, {
    group: '隐藏功能',
    list: [{
        icon: 57,
        title: '看秀图',
        desc: '不清楚'
    }]
    }, {
    group: '管理功能',
    auth: 'master',
    list: [{
        icon: 95,
        title: '#彼岸花(强制)更新',
        desc: '更新插件'
    }, {
            icon: 93,
            title: '#彼岸花帮助',
            desc: '查看本页面'
        }
    ]
}]


export const isSys = true
