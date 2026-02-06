
import service from '../model/services/EatWhatService.js';

export class EatWhat extends plugin {
    constructor() {
        super({
            name: '今天吃什么',
            dsc: '随机推荐食物,带自定义彩蛋',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '(吃(什么|啥)|(今天|今晚|中午|早上|夜宵)吃(什么|啥))',
                    fnc: 'eat'
                },
                {
                    reg: '^#?添加食物\\s*(.*)$',
                    fnc: 'addFood'
                },
                {
                    reg: '^#?删除食物\\s*(.*)$',
                    fnc: 'delFood'
                },
                {
                    reg: '^#?((食物)?菜单|食物列表)$',
                    fnc: 'listFood'
                }
            ]
        });
    }

    /**
     * 随机推荐食物
     */
    async eat(e) {
        const { apiRes, egg } = await service.getRecommendation();
        let foodNames = [];
        let msg = '';
        let eggMsg = '';

        if (apiRes && apiRes.code === 200) {
            msg = '今天吃\n';
            if (apiRes.food) {
                msg += apiRes.food;
                foodNames.push(apiRes.food);
            } else if (apiRes.data && apiRes.data.food) {
                msg += apiRes.data.food;
                foodNames.push(apiRes.data.food);
            } else if (apiRes.meal1) {
                msg += `${apiRes.meal1}\n${apiRes.meal2}`;
                foodNames.push(apiRes.meal1, apiRes.meal2);
            }

            // 30% 几率额外追加一个彩蛋食物
            if (egg && Math.random() < 0.3) {
                eggMsg = `\n或者再来点额外的 "${egg.name}"?`;
                foodNames.push(egg.name);
            }
        } else if (egg) {
            foodNames.push(egg.name);
            const replies = [
                `推荐吃:${egg.name}`,
                `今天就吃 ${egg.name} 吧!`,
                `要不试试 ${egg.name}?`
            ];
            msg = replies[Math.floor(Math.random() * replies.length)];
        }

        if (msg) {
            let replyMsg = [msg];
            // 遍历所有食物名称获取图片
            for (let name of foodNames) {
                const imageUrl = await service.getFoodImage(name);
                if (imageUrl) {
                    replyMsg.push(segment.image(imageUrl));
                }
            }
            //彩蛋信息 调整到最后面
            if (eggMsg) {
                replyMsg.push(eggMsg);
            }
            await e.reply(replyMsg);
        } else {
            await e.reply('呜呜,菜单空空的,API 也罢工了,要不去添加点食物(发送"添加食物 xxxx")?或者干脆喝点凉水吧!');
        }
    }


    /**
     * 添加食物 (彩蛋)
     */
    async addFood(e) {
        let name = e.msg.replace(/^#?添加食物\s*/, '').trim();
        if (!name) {
            await e.reply('请指定要添加的食物名称,例如:添加食物 电脑屏幕');
            return;
        }

        try {
            const result = service.addFood(name, e.user_id);
            if (result.success) {
                await e.reply(`成功将 "${name}" 加入彩蛋!`);
            } else if (result.message === 'exists') {
                await e.reply(`"${name}" 已经在彩蛋列表里啦。`);
            }
        } catch (error) {
            await e.reply('添加失败,请查看日志');
        }
    }

    /**
     * 删除食物
     */
    async delFood(e) {
        let name = e.msg.replace(/^#?删除食物\s*/, '').trim();
        if (!name) {
            await e.reply('请指定要删除的食物名称。');
            return;
        }

        try {
            const success = service.delFood(name);
            if (success) {
                await e.reply(`已从彩蛋中移除 "${name}"。`);
            } else {
                await e.reply(`没找到 "${name}" 呢。`);
            }
        } catch (error) {
            await e.reply('删除失败。');
        }
    }

    /**
     * 列出所有食物 (彩蛋列表)
     */
    async listFood(e) {
        try {
            const rows = service.getAllFoods();
            if (rows.length === 0) {
                await e.reply('当前彩蛋列表是空的。');
                return;
            }

            const foodList = rows.map(r => r.name).join('、');
            const msg = `当前共有 ${rows.length} 个彩蛋食物:\n${foodList}`;
            await e.reply(msg);
        } catch (error) {
            await e.reply('获取失败。');
        }
    }
}
