// 帮助配置
export const helpCfg = {
  // 帮助标题
  title: "星际战甲菜单",

  // 帮助副标题
  subTitle: "Warframe & Lycoris-Plugin",

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
  theme: "all",

  // 排除皮肤：在存在其他皮肤时会忽略该项内设置的皮肤
  // 默认忽略default：即存在其他皮肤时会忽略自带的default皮肤
  // 如希望default皮肤也加入随机池可删除default项
  themeExclude: ["default"],

  // 是否启用背景毛玻璃效果，若渲染遇到问题可设置为false关闭
  bgBlur: true,
};

// 帮助菜单内容
export const helpList = [
  {
    group: "常规查询",
    list: [
      {
        icon: 80,
        title: "警报信息",
        desc: "#警报信息 / 警报",
      },
      {
        icon: 82,
        title: "裂隙信息",
        desc: "#裂隙信息 / 裂隙",
      },
      {
        icon: 46,
        title: "活动事件",
        desc: "#事件 #活动 尸鬼、热美亚裂隙等活动",
      },
      {
        icon: 55,
        title: "突击任务",
        desc: "#突击任务",
      },
      {
        icon: 57,
        title: "入侵任务",
        desc: "#入侵任务 #入侵",
      },
      {
        icon: 58,
        title: "新闻公告",
        desc: "#wf新闻",
      },
      {
        icon: 59,
        title: "电波任务",
        desc: "#电波任务 #电波",
      },
    ],
  },
  {
    group: "时间查询",
    list: [
      {
        icon: 30,
        title: "奸商",
        desc: "#奸商",
      },
      {
        icon: 33,
        title: "地球时间",
        desc: "#地球时间",
      },
      {
        icon: 31,
        title: "平原时间",
        desc: "平原时间 / #平原时间",
      },
      {
        icon: 23,
        title: "地球平原",
        desc: "#地球平原",
      },
      {
        icon: 24,
        title: "金星平原",
        desc: "#金星平原",
      },
      {
        icon: 25,
        title: "火卫二平原",
        desc: "#火卫二",
      },
    ],
  },
  {
    group: "赏金任务",
    list: [
      {
        icon: 95,
        title: "赏金列表",
        desc: "#赏金 / 赏金列表",
      },
      {
        icon: 97,
        title: "地球赏金",
        desc: "#地球赏金",
      },
      {
        icon: 98,
        title: "金星赏金",
        desc: "#金星赏金",
      },
      {
        icon: 99,
        title: "火卫二赏金",
        desc: "#火卫二赏金",
      },
    ],
  },
];
