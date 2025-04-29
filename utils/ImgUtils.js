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

/**
 * 将图片上传到临时免费的图床，返回图片链接，并将链接制作成二维码
 * @param {string} imgUrl - 图片URL或Base64
 * @returns {Promise<{imgUrl: string, qrcode: string}>} 返回图床链接和二维码链接
 */
export async function uploadAndGenerateQR(imgUrl) {
    try {
        // 使用sm.ms免费图床API
        const formData = new FormData();
        formData.append('smfile', imgUrl);

        const uploadResponse = await fetch('https://sm.ms/api/v2/upload', {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0'  // sm.ms需要User-Agent
            },
            body: formData
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.code !== 'success' && !uploadResult.data?.url) {
            throw new Error(uploadResult.message || '图片上传失败');
        }

        // 获取上传后的图片URL
        const uploadedImgUrl = uploadResult.data.url;

        // 使用QR Code API生成二维码
        const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(uploadedImgUrl)}`;

        return {
            imgUrl: uploadedImgUrl,
            qrcode: qrcodeUrl
        };
    } catch (error) {
        logger.error('图片上传或二维码生成失败:', error);
        throw error;
    }
}

// 使用示例：
// const result = await uploadAndGenerateQR('https://example.com/image.jpg');
// console.log('图床链接:', result.imgUrl);
// console.log('二维码链接:', result.qrcode);
