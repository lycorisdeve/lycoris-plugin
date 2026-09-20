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

// 使用系统菜单，避免两份默认菜单不同步；可改为自定义 helpList。
export { helpList } from './system/help_system.js'
