/**
 * @Description bt搜索
 * @author lycoris
 * @time 2023-03-31 23:57
 */
import { btApi } from '../model/services/BtService.js';

/* 
    免责声明
请注意，使用本代码的用户必须遵守所有适用的法律、规定和政策。本代码仅供参考和教育目的，不应用于任何商业或实际应用。使用本代码造成的任何损失或损害，开发者不承担任何责任。
本代码并不保证其完整性、准确性或可靠性。使用本代码所产生的结果，开发者不对其质量或效果作任何保证或承诺。用户应自行承担任何因使用本代码而导致的后果或风险。
请注意，使用本代码可能会涉及到第三方知识产权或其他权利。用户应确保他们拥有使用所有相关资料的合法权利，并遵守所有适用的法律、规定和政策。本代码开发者不对用户在此方面的行为承担任何责任。
最后，请注意本代码可能存在缺陷或错误，如有任何问题，请联系开发者进行修正。
感谢您的使用。
*/

const IS_GROUPS = true // 是否开启群聊搜索

export class bt extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'bt搜索',
            /** 功能描述 */
            dsc: 'bt搜索',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 5000,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^#bt搜索(.*)$',
                    /** 执行方法 */
                    fnc: 'btInfo',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^bt(.*)$',
                    /** 执行方法 */
                    fnc: 'btSearch',
                }
            ]
        })
    }

    /**
     * @param e oicq传递的事件参数e
     */
    async btSearch(e) {
        if (e.isGroup) {
            if (!IS_GROUPS) {
                e.reply('群聊搜索已关闭，请联系机主开通！')
                return
            }
        }
        /** e.msg 用户的命令消息 */
        logger.info('[用户命令]', e.msg)
        let keyword = e.msg.replace(/bt/g, "").trim()
        
        // Use the new API
        let results = await btApi(keyword)
        
        let userInfo = {
            nickname: this.e.sender.card || this.e.user_id,
            user_id: this.e.user_id,
        }
        let msgList = []
        
        if (!results || results.length === 0) {
            await this.e.reply(`没有搜索到: ${keyword}`);
            return
        }

        for (let i = 0; i < results.length; i++) {
            let item = results[i];
            let msg = `标题 :: ${item.name}\n磁力链接 :: ${item.magnet}\n大小 :: ${item.size}\n时间 :: ${item.time}\n`;
            msgList.push({ ...userInfo, message: msg })
        }

        const res = await this.e.reply(await Bot.makeForwardMsg(msgList), false, {
            recallMsg: -1,
        });
        
        this.handleReplyResult(res);
    }

    async btInfo(e) {
        if (e.isGroup) {
            if (!IS_GROUPS) {
                e.reply('群聊搜索已关闭，请联系机主开通！')
                return
            }
        }
        /** e.msg 用户的命令消息 */
        logger.info('[用户命令]', e.msg)
        let keyword = e.msg.replace(/#bt搜索/g, "").trim()

        let myMagnet = await btApi(keyword, 0)
        let msgs = []
        let userInfo = {
            nickname: this.e.sender.card || this.e.user_id,
            user_id: this.e.user_id,
        }
        if (myMagnet && myMagnet.length > 0) {
            msgs.push({
                ...userInfo, message: `你已经长大了，需要学会自己加磁力头了：
magnet:?xt=urn:btih: 
\n`})
            for (let i = 0; i < myMagnet.length; i++) {
                let msg = `
标题：${myMagnet[i].name}
类型：${myMagnet[i].type}
大小：${myMagnet[i].size}
创建时间：${myMagnet[i].time}
种子：${myMagnet[i].magnet}\n
`;
                msgs.push({ ...userInfo, message: msg });
            }
        } else {
            e.reply(`没有找到：${keyword} 哦~~~~`)
            return
        }
        const res = await this.e.reply(await Bot.makeForwardMsg(msgs), false, {
            recallMsg: -1,
        });
        
        this.handleReplyResult(res);
    }

    handleReplyResult(res) {
        if (!res) {
            if (this.e.group && this.e.group.is_admin) {
                if (
                    Number(Math.random().toFixed(2)) * 100 <
                    (this.mysterySetData ? this.mysterySetData.mute : 0) // Safety check for mysterySetData
                ) {
                    let duration = Math.floor(Math.random() * 600) + 1;
                    this.e.group.muteMember(this.e.sender.user_id, duration);
                    this.e.reply(
                        `不用等了，不用等了，搜索失败，请重试～～ 并随手将你禁锢${duration}秒`
                    );
                } else {
                    this.reply(`不用等了，搜索失败，请重试～ `);
                }
            } else {
                this.reply(`不用等了，搜索失败，请重试～ `);
            }
        }
    }
}