import { segment } from '@icqqjs/icqq'
import fetch from 'node-fetch'

/**
 * TsAi 绘图插件
 * 访问实例: curl -X POST "https://www.tsart.lat/api.php?action=generate"
 */
export class TsAi extends plugin {
    constructor() {
        super({
            name: 'TsAi绘图',
            dsc: '基于 tsart.lat API 的 AI 绘图功能',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(ts绘图|ts渲染)\\s*(.*)$',
                    fnc: 'tsGenerate'
                }
            ]
        })
        this.apiUrl = 'https://www.tsart.lat/api.php?action=generate'
        this.apiKey = 'sk-046066ff2e5c8678b608ed5d4015f660c3952ea09d0651ec'
    }

    /**
     * AI 绘图指令
     * @param e 消息事件
     */
    async tsGenerate(e) {
        let prompt = e.msg.replace(/^#?(ts绘图|ts渲染)\s*/, '').trim()

        if (!prompt) {
            await e.reply('请输入绘图关键词，例如：#ts绘图 a beautiful landscape', true)
            return true
        }

        await e.reply('正在为您生成图片，请稍候...', true)

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    settings: {
                        width: 1920,
                        height: 1080
                    }
                })
            })

            const data = await response.json()

            if (data && data.status === 'success' && data.images && data.images.length > 0) {
                // 假设返回的 images 是图片链接数组
                // 如果是 base64，可以用 segment.image(`base64://${data.images[0]}`)
                let imgUrl = data.images[0]

                // 检查是否已经是完整的 URL，如果不是则根据 API 文档拼接（假设是直接的 URL）
                await e.reply([
                    segment.at(e.user_id),
                    '\n生成成功！\n提示词：' + prompt + '\n',
                    segment.image(imgUrl)
                ])
            } else {
                logger.error('[TsAi] 绘图失败:', data)
                await e.reply(`生成失败：${data.message || '未知错误'}`, true)
            }
        } catch (error) {
            logger.error('[TsAi] 接口请求异常:', error)
            await e.reply('抱歉，绘图接口请求异常，请稍后再试。', true)
        }

        return true
    }
}
