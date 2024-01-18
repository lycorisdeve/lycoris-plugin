export async function parseImg(e) {
    if (e.msg && e.msg.includes('自己')) {
        e.img = [`https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.user_id}`]
    }
    if (!e.img) {
        if (e.atBot) {
            let setting = await Config.getSetting();
            if (setting.shield) {
                delete e.img;
            } else {
                e.img = [];
                e.img[0] = e.bot.avatar || `https://q1.qlogo.cn/g?b=qq&s=0&nk=${Bot.uin}`;
            }
        }
        if (e.at) {
            try {
                e.img = [await e.group.pickMember(e.at).getAvatarUrl()]
            } catch (error) {
                e.img = [`https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.at}`];
            }
        }
    }
    if (e.source) {
        let reply;
        if (e.isGroup) {
            reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message;
        } else {
            reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message;
        }
        if (reply) {
            for (let val of reply) {
                if (val.type == "image") {
                    e.img = [val.url];
                    break;
                }
            }
        }
    }
    return e
}
