/**
 * @Description 图片获取
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import fetch from 'node-fetch'




export class Photo extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: '图片识别',
            /** 功能描述 */
            dsc: '图片识别',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 5000,
            rule: [

                {
                    /** 命令正则匹配 */
                    reg: '^#摸鱼日报|摸鱼日报',
                    /** 执行方法 */
                    fnc: 'moyuDayReport',
                },
                {
                    /** 命令正则匹配 */
                    reg: '#日期',
                    /** 执行方法 */
                    fnc: 'todayInfo',
                },
                {
                    /** 命令正则匹配 */
                    reg: '段子|内涵段子|今日段子',
                    /** 执行方法 */
                    fnc: 'neihanduanzi',
                },
                {
                    /** 命令正则匹配 */
                    reg: '摸鱼视频日报',
                    /** 执行方法 */
                    fnc: 'videoMoyuRiBao',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#生成(.*)$',
                    /** 执行方法 */
                    fnc: 'genImg',
                },

            ]
        })
    }





}
