
import RssService from '../model/services/RssService.js';
import Config from '../components/Config.js';
import _ from 'lodash';

export class Rss extends plugin {
    constructor() {
        super({
            name: 'RSS订阅',
            dsc: 'RSS订阅插件',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#rss\\s*add\\s*.*$',
                    fnc: 'add',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*cron\\s*.*$',
                    fnc: 'cron',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*list$',
                    fnc: 'list',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*del\\s*.*$',
                    fnc: 'del',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*push$',
                    fnc: 'push',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*强制推送$',
                    fnc: 'forcePush',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*(开启|关闭)$',
                    fnc: 'switch',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*(开启|关闭)文本推送$',
                    fnc: 'textSwitch',
                    permission: 'master'
                },
                {
                    reg: '^#rss\\s*(命令|帮助)$',
                    fnc: 'help'
                }
            ]
        });

        const rssConfig = Config.getConfig('config').rss || {};
        this.task = {
            name: 'RSS定时任务',
            cron: rssConfig.cron || '*/30 * * * *',
            fnc: () => {
                const cfg = Config.getConfig('config').rss || {};
                if (cfg.push !== false) { // 默认为true
                    return RssService.task();
                }
            },
            log: false
        };
    }


    /**
     * 设置RSS定时任务Cron表达式
     * #rss cron <cron>
     */
    async cron(e) {
        let msg = e.msg.replace(/^#rss\s*cron\s*/, '').trim();
        if (!msg) {
            await e.reply('请提供Cron表达式，例如：#rss cron */30 * * * *');
            return;
        }

        const config = Config.getConfig('config');
        const rssConfig = config.rss || {};
        rssConfig.cron = msg;

        Config.modify('config', 'rss', rssConfig);

        await e.reply(`RSS定时任务频率已更新为：${msg}\n注意：需要重启Bot才能生效`);
    }

    /**
     * 添加RSS订阅
     * #rss add <url> [name]
     */
    async add(e) {
        let msg = e.msg.replace(/^#rss\s*add\s*/, '').trim();
        // Support: url [name] [remark]
        let args = msg.split(/\s+/);
        let url = args[0];
        let name = args[1];
        let remark = args[2] || '';

        // Handle remarks with spaces
        if (args.length > 3) {
            remark = args.slice(2).join(' ');
        }

        if (!url) {
            await e.reply('请提供RSS URL，格式：#rss add <url> [name] [remark]');
            return;
        }

        // 验证URL
        if (!url.startsWith('http')) {
            await e.reply('URL必须以http或https开头');
            return;
        }

        const config = Config.getConfig('config');
        const list = config.rss.subscribe_list || [];

        // 检查重复
        if (list.some(item => item.url === url)) {
            await e.reply('该RSS源已存在');
            return;
        }

        if (!name) {
            await e.reply('正在获取RSS标题...');
            try {
                const feed = await RssService.fetchFeed(url);
                if (feed && feed.title) {
                    name = feed.title;
                } else {
                    name = '未命名RSS';
                }
            } catch (err) {
                name = '未命名RSS';
            }
        }

        const newItem = {
            url,
            name,
            group: [e.group_id || ''] // 默认添加到当前群，如果是私聊则为空
        };
        // 过滤空group
        if (!newItem.group[0]) newItem.group = [];

        list.push(newItem);

        // 更新配置
        const rssConfig = config.rss;
        rssConfig.subscribe_list = list;
        Config.modify('config', 'rss', rssConfig);

        await e.reply(`RSS订阅添加成功：${name}\n${url}`);
    }

    async list(e) {
        const config = Config.getConfig('config');
        const list = config.rss.subscribe_list || [];

        if (list.length === 0) {
            await e.reply('当前没有任何RSS订阅');
            return;
        }

        let msg = ['当前RSS订阅列表：'];
        list.forEach((item, index) => {
            msg.push(`${index + 1}. ${item.name}\n${item.url}`);
        });

        await e.reply(msg.join('\n'));
    }

    async del(e) {
        let msg = e.msg.replace(/^#rss\s*del\s*/, '').trim();
        if (!msg) {
            await e.reply('请指定要删除的订阅，支持序号或URL');
            return;
        }

        const config = Config.getConfig('config');
        let list = config.rss.subscribe_list || [];
        let index = -1;

        if (/^\d+$/.test(msg)) {
            index = parseInt(msg) - 1;
        } else {
            index = list.findIndex(item => item.url === msg);
        }

        if (index < 0 || index >= list.length) {
            await e.reply('未找到指定RSS订阅');
            return;
        }

        const deleted = list.splice(index, 1);
        const rssConfig = config.rss;
        rssConfig.subscribe_list = list;
        Config.modify('config', 'rss', rssConfig);

        await e.reply(`RSS订阅已删除：${deleted[0].name}`);
    }

    async push(e) {
        await e.reply('开始执行RSS检查...');
        const res = await RssService.task();
        await e.reply(`RSS检查完成\n共检查 ${res.total} 个订阅\n推送 ${res.pushed} 条新内容`);
    }

    async forcePush(e) {
        await e.reply('开始执行RSS强制推送 (推送每个源的前3条)...');
        const res = await RssService.task(true);
        await e.reply(`RSS强制推送完成\n共检查 ${res.total} 个订阅\n共强制推送 ${res.pushed} 条内容`);
    }

    async switch(e) {
        let isClose = e.msg.includes('关闭');
        const config = Config.getConfig('config');
        const rssConfig = config.rss || {};

        rssConfig.push = !isClose;
        Config.modify('config', 'rss', rssConfig);

        await e.reply(`RSS推送已${isClose ? '关闭' : '开启'}`);
    }

    async textSwitch(e) {
        let isClose = e.msg.includes('关闭');
        const config = Config.getConfig('config');
        const rssConfig = config.rss || {};

        rssConfig.text_push = !isClose;
        Config.modify('config', 'rss', rssConfig);

        await e.reply(`RSS文本推送已${isClose ? '关闭' : '开启'}`);
    }

    async help(e) {
        let msg = [
            '【RSS订阅命令说明】',
            '#rss cron <cron> : 设置检查更新频率',
            '#rss add <URL> [名称] : 添加订阅',
            '#rss list : 查看订阅列表',
            '#rss del <序号/URL> : 删除订阅',
            '#rss push : 手动触发更新检查',
            '#rss 强制推送 : 强制触发最近内容推送',
            '#rss 开启/关闭 : 开启或关闭RSS推送',
            '#rss 开启/关闭文本推送 : 开启或关闭图片加载失败后的文本推送',
            '#rss 帮助 : 查看此说明'
        ];
        await e.reply(msg.join('\n'));
    }
}
