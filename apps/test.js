/*
 * @description: 
 * @author: 名字
 * @date: Do not edit
 */
/**
 * @Description bt搜索
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import axios from 'axios'
import cheerio from 'cheerio'


export class test extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: '彼岸花test',
            /** 功能描述 */
            dsc: '彼岸花test',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1300,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^#?tset$',
                    /** 执行方法 */
                    fnc: 'test',
                }
            ]
        })
    }

    /**
     * @param e oicq传递的事件参数e
     */
    async test(e) {
        let    msg=`[CQ:image,file='https://w.wallhaven.cc/full/3z/wallhaven-3z12gy.png']`
       e.reply(msg)
    }


}
