
import { segment } from '@icqqjs/icqq'

export class IPixiv extends plugin {
    constructor() {
        super({
            name: 'Pixiv图片',
            dsc: '基于Lolicon API的图片获取功能',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(色图|涩图|瑟图|想看)\\s*(.*)$',
                    fnc: 'setu'
                },
                {
                    reg: '^#?(tag|标签)\\s*(.*)$',
                    fnc: 'searchTag'
                },
                {
                    reg: '^#?(pid|作品)\\s*([0-9]+)$',
                    fnc: 'searchPid'
                },
                {
                    reg: '^#?(r18|R18)\\s*(.*)$',
                    fnc: 'r18Setu'
                },
                {
                    reg: '^#?(多色图|多涩图)\\s*([0-9]+)?\\s*(.*)$',
                    fnc: 'multiSetu'
                },
                {
                    reg: '^#?(ss帮助|sshelp)$',
                    fnc: 'showHelp'
                }
            ]
        })
        this.baseUrl = 'https://api.lolicon.app/setu/v2'

        // 默认代理服务
        this.defaultProxy = 'i.pixiv.re'

        // 默认图片尺寸
        this.defaultSize = 'original'

        // 默认每次返回数量
        this.defaultNum = 1

        // 最大返回数量
        this.maxNum = 10
    }

    // 处理参数
    parseParams(input = '', options = {}) {
        // 基础参数
        const params = {
            r18: options.r18 || 0,
            num: options.num || this.defaultNum,
            size: options.size || this.defaultSize,
            proxy: this.defaultProxy,
            excludeAI: false
        }

        // 处理标签
        if (input) {
            // 检查是否有特殊参数
            const specialParams = this.extractSpecialParams(input)

            // 合并特殊参数
            Object.assign(params, specialParams.params)

            // 剩余的文本作为标签
            const remainingText = specialParams.remainingText.trim()
            if (remainingText) {
                // 处理标签逻辑
                const tags = this.processTagString(remainingText)
                if (tags.length > 0) {
                    params.tag = tags
                }
            }
        }

        // 限制num参数范围
        params.num = Math.min(Math.max(1, params.num), this.maxNum)

        return params
    }

    // 从输入中提取特殊参数
    extractSpecialParams(input) {
        const params = {}
        let remainingText = input

        // 提取排除AI参数
        if (remainingText.includes('--no-ai')) {
            params.excludeAI = true
            remainingText = remainingText.replace('--no-ai', '')
        }

        // 提取尺寸参数
        const sizeMatch = remainingText.match(/--size=(\w+)/)
        if (sizeMatch) {
            params.size = sizeMatch[1]
            remainingText = remainingText.replace(sizeMatch[0], '')
        }

        // 提取长宽比参数
        const ratioMatch = remainingText.match(/--ratio=(\w+)/)
        if (ratioMatch) {
            params.aspectRatio = ratioMatch[1]
            remainingText = remainingText.replace(ratioMatch[0], '')
        }

        // 提取UID参数
        const uidMatch = remainingText.match(/--uid=(\d+)/)
        if (uidMatch) {
            params.uid = [parseInt(uidMatch[1])]
            remainingText = remainingText.replace(uidMatch[0], '')
        }

        return { params, remainingText }
    }

    // 处理标签字符串
    processTagString(tagString) {
        // 分割标签
        const tagGroups = tagString.split('&').map(group => group.trim()).filter(Boolean)

        if (tagGroups.length === 0) return []

        // 处理OR关系的标签
        return tagGroups.map(group => {
            const orTags = group.split(/[|,,\s]+/).filter(Boolean)
            return orTags.length > 1 ? orTags.join('|') : group
        })
    }

    // 获取图片
    async getImage(params = {}) {
        try {
            // 使用POST方法发送请求,更适合复杂参数
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            })

            const data = await response.json()

            if (!data.error && data.data.length > 0) {
                return data.data
            }
            return []
        } catch (error) {
            logger.error(`获取图片失败: ${error}`)
            return []
        }
    }

    // 主要搜索功能
    async setu(e) {
        // 提取关键词
        const tags = e.msg.replace(/^#?(色图|涩图|瑟图|想看)\s*/, '').trim()

        // 获取参数
        const params = this.parseParams(tags)

        // 获取图片
        const results = await this.getImage(params)

        if (results.length === 0) {
            await e.reply('没有找到符合条件的图片哦~', true)
            return
        }

        // 发送图片
        await this.sendImageResult(e, results[0], params.r18 > 0)
    }

    // 生成二维码URL
    generateQRCode(imageUrl) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(imageUrl)}`;
    }

    // 发送图片结果
    async sendImageResult(e, result, isR18 = false) {
        // 构建回复消息
        const title = result.title || '无标题'
        const author = result.author || '未知作者'
        const resultTags = result.tags.join(', ')

        // 根据请求的size选择图片URL:original regular small thumb mini
        const imageUrl = result.urls[this.defaultSize] || result.urls.regular || result.urls.original

        if (!imageUrl) {
            await e.reply('获取图片链接失败,请稍后再试~', true)
            return
        }

        // 检查是否为R18内容
        const isR18Content = isR18 || result.tags.some(tag => tag.toLowerCase().includes('r-18')) || result.title.toLowerCase().includes('r-18')

        if (isR18Content) {
            // 生成二维码
            const qrcodeUrl = this.generateQRCode(imageUrl)
            // 发送二维码和提示信息
            const msg = [
                '该内容已转换为二维码,请自行扫码查看\n',
                segment.image(qrcodeUrl),
                `\n标题:${title}\n作者:${author}\nPID:${result.pid}\n标签:${resultTags}`
            ]
            await e.reply(msg)
            return
        }

        // 非R18内容直接发送
        const msg = [
            segment.image(imageUrl),
            `标题:${title}\n作者:${author}\nPID:${result.pid}\n标签:${resultTags}`
        ]
        await e.reply(msg)
    }

    // 多图搜索
    async multiSetu(e) {
        // 提取数量和关键词
        const match = e.msg.match(/^#?(多色图|多涩图)\s*([0-9]+)?\s*(.*)$/)
        const num = match[2] ? parseInt(match[2]) : 5 // 默认5张
        const tags = match[3] ? match[3].trim() : ''

        // 获取参数
        const params = this.parseParams(tags, { num: num })
        const isR18 = params.r18 > 0

        // 获取图片
        const results = await this.getImage(params)

        if (results.length === 0) {
            await e.reply('没有找到符合条件的图片哦~', true)
            return
        }

        // 构建合并消息
        let msgs = []

        // 为每张图片创建一个消息
        for (const result of results) {
            const imageUrl = result.urls.original
            if (imageUrl) {
                // 检查是否为R18内容
                const isR18Content = isR18 || result.tags.some(tag => tag.toLowerCase().includes('r-18')) || result.title.toLowerCase().includes('r-18')

                if (isR18Content) {
                    // 生成二维码
                    const qrcodeUrl = this.generateQRCode(imageUrl)
                    // 添加二维码消息
                    msgs.push({
                        message: '该内容已转换为二维码,请自行扫码查看',
                        nickname: Bot.nickname,
                        user_id: Bot.uin
                    })
                    msgs.push({
                        message: segment.image(qrcodeUrl),
                        nickname: Bot.nickname,
                        user_id: Bot.uin
                    })
                } else {
                    // 添加普通图片消息
                    msgs.push({
                        message: segment.image(imageUrl),
                        nickname: Bot.nickname,
                        user_id: Bot.uin
                    })
                }

                // 添加图片信息
                msgs.push({
                    message: `标题:${result.title || '无标题'}\n作者:${result.author || '未知作者'}\nPID:${result.pid}\n标签:${result.tags.join(', ')}`,
                    nickname: Bot.nickname,
                    user_id: Bot.uin
                })
            }
        }

        if (msgs.length === 0) {
            await e.reply('获取图片链接失败,请稍后再试~', true)
            return
        }

        // 发送合并消息
        try {
            await this.e.reply(await Bot.makeForwardMsg(msgs), false, {
                recallMsg: -1,
            });
        } catch (error) {
            logger.error(`发送合并转发消息失败: ${error}`)
            await e.reply('图片发送失败,请稍后再试~', true)
        }
    }

    // 标签搜索
    async searchTag(e) {
        const tags = e.msg.replace(/^#?(tag|标签)\s*/, '').trim()
        if (!tags) {
            await e.reply('请输入要搜索的标签~', true)
            return
        }

        // 复用setu方法
        e.msg = `#色图 ${tags}`
        await this.setu(e)
    }

    // 根据PID搜索
    async searchPid(e) {
        const pid = e.msg.match(/([0-9]+)/)?.[1]
        if (!pid) {
            await e.reply('请输入正确的PID~', true)
            return
        }

        const params = {
            pid: parseInt(pid),
            size: this.defaultSize,
            proxy: this.defaultProxy
        }

        const results = await this.getImage(params)

        if (results.length === 0) {
            await e.reply('没有找到该作品哦~', true)
            return
        }

        // 发送图片
        await this.sendImageResult(e, results[0])
    }

    async r18Setu(e) {
        // 提取关键词
        const tags = e.msg.replace(/^#?(r18|R18)\s*/, '').trim()

        // 获取参数,设置r18=1
        const params = this.parseParams(tags, { r18: 1 })

        // 获取图片
        const results = await this.getImage(params)

        if (results.length === 0) {
            await e.reply('没有找到符合条件的图片哦~', true)
            return
        }

        // 发送图片,强制使用合并转发方式
        await this.sendImageResult(e, results[0], true)
    }

    // 显示帮助信息
    async showHelp(e) {
        const helpMsg = `【Pixiv图片搜索帮助】
1. 基础搜索:#色图 [标签]
2. R18搜索:#r18 [标签]
3. 多图搜索:#多色图 [数量] [标签]
4. 标签搜索:#tag [标签]
5. PID搜索:#pid [作品ID]

【高级参数】
- 标签与:使用空格分隔多个标签
- 标签或:使用|分隔,如 萝莉|少女
- 标签组:使用&分隔,如 白丝&萝莉

【特殊参数】
- 排除AI作品:--no-ai
- 指定尺寸:--size=original/regular/small
- 指定长宽比:--ratio=portrait/landscape/square
- 指定作者UID:--uid=12345

例如:#色图 白丝|黑丝 萝莉 --no-ai --size=original`

        await e.reply(helpMsg)
    }
}
