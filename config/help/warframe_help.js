// 帮助配置
export const helpCfg = {
  // 帮助标题
  title: "星际战甲菜单",

  // 帮助副标题
  subTitle: "Warframe & Lycoris-Plugin",

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
  theme: "all",

  // 排除皮肤:在存在其他皮肤时会忽略该项内设置的皮肤
  // 默认忽略default:即存在其他皮肤时会忽略自带的default皮肤
  // 如希望default皮肤也加入随机池可删除default项
  themeExclude: ["default"],

  // 是否启用背景毛玻璃效果,若渲染遇到问题可设置为false关闭
  bgBlur: true,
};

// 帮助菜单内容
export const helpList = [
  {
    group: "世界状态 · 图片简报",
    list: [
      { icon: 80, title: "警报任务", desc: "#wf警报" },
      { icon: 82, title: "虚空裂隙", desc: "#wf裂隙" },
      { icon: 46, title: "活动追踪", desc: "#wf活动" },
      { icon: 55, title: "今日突击", desc: "#wf突击" },
      { icon: 57, title: "入侵战况", desc: "#wf入侵" },
      { icon: 58, title: "飞船新闻", desc: "#wf新闻" },
      { icon: 59, title: "午夜电波", desc: "#wf电波" },
      { icon: 95, title: "各地区赏金", desc: "#wf赏金 · 奖励自动分页" },
    ],
  },
  {
    group: "周期与交易",
    list: [
      { icon: 33, title: "地球周期", desc: "#wf地球时间" },
      { icon: 23, title: "赛特斯平原", desc: "#wf地球平原" },
      { icon: 24, title: "金星平原", desc: "#wf金星平原" },
      { icon: 30, title: "虚空商人", desc: "#wf商人 · 到访时间与商品" },
      { icon: 31, title: "每日特惠", desc: "#wf特惠" },
    ],
  },
  {
    group: "奥迪斯通讯",
    list: [
      { icon: 99, title: "问答查询", desc: "奥迪斯 阴阳双子 · 图片回复" },
    ],
  },
];
