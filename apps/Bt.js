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
                    reg: '^(#)?bt搜索(.*)$',
                    /** 执行方法 */
                    fnc: 'search',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^bt(.*)$',
                    /** 执行方法 */
                    fnc: 'search',
                }
            ]
        })
    }

    /**
     * @param e oicq传递的事件参数e
     */
    async search(e) {
        if (e.isGroup) {
            if (!IS_GROUPS) {
                e.reply('群聊搜索已关闭，请联系机主开通！')
                return
            }
        }
        
        // Clean keyword
        let keyword = e.msg.replace(/^(#)?bt(搜索)?/g, "").trim();
        
        if (!keyword) {
            return; // Ignore empty keyword
        }

        logger.info('[BT搜索] 用户命令:', keyword);
        
        // Use the new API service
        let results = await btApi(keyword);
        
        let userInfo = {
            nickname: this.e.sender.card || this.e.user_id,
            user_id: this.e.user_id,
        }
        let msgList = []
        
        if (!results || results.length === 0) {
            await this.e.reply(`没有搜索到: ${keyword}`);
            return
        }

        // Limit results to avoid message too long
        const MAX_RESULTS = 10;
        const displayResults = results.slice(0, MAX_RESULTS);

        msgList.push({
            ...userInfo, 
            message: `搜索到 ${results.length} 条结果 (显示前${displayResults.length}条)：\n请自行复制磁力链接下载。`
        });

        for (let i = 0; i < displayResults.length; i++) {
            let item = displayResults[i];
            let msg = `[${item.source}] ${item.name}\n大小: ${item.size}\n时间: ${item.time}\n磁力: ${item.magnet}`;
            msgList.push({ ...userInfo, message: msg })
        }

        const res = await this.e.reply(await Bot.makeForwardMsg(msgList), false, {
            recallMsg: -1,
        });
        
        this.handleReplyResult(res);
    }

    handleReplyResult(res) {
        if (!res) {
            if (this.e.group && this.e.group.is_admin) {
                if (
                    Number(Math.random().toFixed(2)) * 100 <
                    (this.mysterySetData ? this.mysterySetData.mute : 0)
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