import { btApi } from '../model/services/BtService.js';

const MAX_RESULTS = 10;

export class bt extends plugin {
    constructor() {
        super({
            name: 'bt搜索',
            dsc: '多源 BT 搜索',
            event: 'message',
            priority: 5000,
            rule: [{
                reg: '^#?bt(?:搜索)?(.*)$',
                fnc: 'search'
            }]
        });
    }

    async search(e) {
        const keyword = e.msg.replace(/^#?bt(?:搜索)?/, '').trim();
        if (!keyword) {
            await e.reply('请输入搜索关键词，例如：#bt搜索 Ubuntu');
            return true;
        }

        let results;
        try {
            results = await btApi(keyword);
        } catch (error) {
            logger.error(`[BT搜索] 搜索失败: ${error.message}`);
            await e.reply('BT 搜索来源暂时不可用，请稍后重试或检查 bt 代理配置。');
            return true;
        }
        if (!results.length) {
            await e.reply(`没有搜索到: ${keyword}，请尝试其他关键词。`);
            return true;
        }

        const userInfo = {
            nickname: String(e.sender?.card || e.sender?.nickname || e.nickname || e.user_id),
            user_id: e.user_id
        };
        const displayResults = results.slice(0, MAX_RESULTS);
        const messages = [{
            ...userInfo,
            message: `搜索到 ${results.length} 条结果（显示前 ${displayResults.length} 条）：\n请复制磁力链接或种子地址到下载工具。`
        }, ...displayResults.map(item => ({
            ...userInfo,
            message: `[${item.source}] ${item.name}\n大小: ${item.size}\n时间: ${item.time}\n${item.magnet.startsWith('magnet:') ? '磁力' : '种子'}: ${item.magnet}`
        }))];

        try {
            const forward = e.group?.makeForwardMsg
                ? await e.group.makeForwardMsg(messages)
                : e.friend?.makeForwardMsg
                    ? await e.friend.makeForwardMsg(messages)
                    : await Bot.makeForwardMsg(messages);
            const response = await e.reply(forward, false, { recallMsg: -1 });
            if (!response) throw new Error('合并转发未发送成功');
        } catch (error) {
            logger.error(`[BT搜索] 发送失败: ${error.message}`);
            await e.reply('搜索结果发送失败，请稍后重试或换一个关键词。');
        }
        return true;
    }
}
