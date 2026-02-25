
import Config from '../components/Config.js'
import fs from 'fs'
import yaml from 'yaml'

/*
 * @description: 全国油价查询推送 (重构版)
 * @author: lycoris
 */

const config = Config.getConfig('config')
const plugin_config = config.oilPrice
const ISTERO_TOKEN = 'YlicDEqnkViPylOKPfCIrqhAaXYFoImw'

const API_SOURCES = [
    {
        name: 'IAMWAWA',
        url: province => `https://www.iamwawa.cn/oilprice/api?area=${province}`,
        headers: { 'User-Agent': 'iamwawa-open-api' },
        parse: data => ({
            province: data.data.name,
            oil89: '暂无数据',
            oil92: data.data.p92,
            oil95: data.data.p95,
            oil98: data.data.p98,
            oil0: data.data.p0,
            updateTime: data.data.next_update_time
        })
    },

    {
        name: 'NXVAV',
        url: province => `https://api.nxvav.cn/api/fuel-price/?region=${province}`,
        parse: data => ({
            province: data.data.region,
            oil89: '暂无数据',
            oil92: data.data.p92,
            oil95: data.data.p95,
            oil98: data.data.p98,
            oil0: data.data.p0,
            updateTime: data.data.updated_at
        })
    },
    {
        name: 'ISTERO',
        url: province => `https://api.istero.com/resource/v1/oilprice?province=${province}&token=${ISTERO_TOKEN}`,
        parse: data => ({
            province: data.data.name,
            oil89: '暂无数据',
            oil92: data.data.p92,
            oil95: data.data.p95,
            oil98: data.data.p98,
            oil0: data.data.p0,
            updateTime: data.data.update_time
        })
    },
    {
        name: 'LOLIMI',
        url: province => `https://api.lolimi.cn/API/youjia/api?msg=${province}`,
        parse: data => ({
            province: data.data.region,
            oil89: '暂无数据',
            oil92: data.data['92h'],
            oil95: data.data['95h'],
            oil98: data.data['98h'],
            oil0: data.data['0h'],
            updateTime: '实时数据'
        })
    },
    {
        name: 'VMY',
        url: province => `https://api.52vmy.cn/api/query/oil?city=${province}`,
        parse: data => ({
            province: data.data.city,
            oil89: '暂无数据',
            oil92: data.data['92'],
            oil95: data.data['95'],
            oil98: data.data['98'],
            oil0: data.data['0'],
            updateTime: '实时数据'
        })
    },

    {
        name: 'QQSUU',
        url: province => `https://api.qqsuu.cn/api/dm-oilprice?prov=${province}&apiKey=fc07b3a2f4091e6ee21cea6785e6abf5`,
        parse: data => ({
            province: data.data.prov,
            oil89: data.data.p89,
            oil92: data.data.p92,
            oil95: data.data.p95,
            oil98: data.data.p98,
            oil0: data.data.p0,
            updateTime: data.data.time
        })
    }
]

const VALID_PROVINCES = [
    "安徽", "北京", "福建", "甘肃", "广东", "广西", "贵州", "海南",
    "河北", "河南", "黑龙江", "湖北", "湖南", "吉林", "江苏", "江西",
    "辽宁", "内蒙古", "宁夏", "青海", "山东", "山西", "陕西", "上海",
    "四川", "天津", "西藏", "新疆", "云南", "浙江", "重庆"
]

export class OilPricePlugin extends plugin {
    constructor() {
        super({
            name: '油价查询',
            dsc: '获取全国各省份油价信息,并定时推送',
            event: 'message',
            priority: 1200,
            rule: [
                { reg: '^#油价$|^油价查询$', fnc: 'getOilPrice' },
                { reg: '^#油价\\s*(.*)$', fnc: 'getOilPriceByProvince' },
                { reg: '^#添加(.*)油价推送$', fnc: 'addOilPriceProvince' }
            ]
        })
        const cron = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * ${plugin_config.schedule.week}`;
        this.task = { name: '油价定时推送', fnc: () => this.sendOilPriceInfo(), cron }
    }

    // 默认查询
    async getOilPrice(e) {
        return this.handleOilPriceRequest(e, '江苏')
    }

    // 指定省份查询
    async getOilPriceByProvince(e) {
        const province = e.msg.replace(/^#油价\s*/, '').trim()
        return this.handleOilPriceRequest(e, province)
    }

    // 核心请求处理逻辑
    async handleOilPriceRequest(e, province) {
        if (!VALID_PROVINCES.includes(province)) {
            return e.reply(`请输入正确的省份名称, 支持:\n${VALID_PROVINCES.join('、')}`)
        }

        try {
            const oilInfo = await this.getOilPriceInfo(province)
            if (oilInfo) return e.reply(this.formatOilPrice(oilInfo))
        } catch (error) {
            logger.error('[油价查询] 失败:', error)
        }
        return e.reply("获取油价信息失败, 请稍后重试!")
    }

    // 循环尝试 API 源
    async getOilPriceInfo(province) {
        for (const api of API_SOURCES) {
            try {
                const response = await fetch(api.url(province), { headers: api.headers || {} })
                if (!response.ok) continue

                const data = await response.json()
                const result = api.parse(data)

                // 验证核心数据完整性, 防止获取到空数据
                if (result && result.province && result.oil92 && result.oil92 !== '暂无数据') {
                    return result
                }
                logger.debug(`[油价查询] API ${api.name} 返回数据不完整, 尝试下一个源`)
            } catch (error) {
                logger.debug(`[油价查询] API ${api.name} 失败: ${error.message}`)
            }
        }
        return null
    }

    // 格式化输出
    formatOilPrice(data, isGroup = false) {
        const province = isGroup ? data.provinces.join('、') : data.province
        const info = isGroup ? data.info : data
        const updateTime = isGroup ? data.info.updateTime : data.updateTime

        const formatLine = (label, value) => {
            const displayValue = value === '暂无数据' ? value : `${value} 元/升`
            return `┃ ${label}：${displayValue}`
        }

        return [
            `┏━━━━━ 📍 ${province} ━━━━━┓`,
            `┃ 🚗 今日油价信息概览`,
            `┣━━━━━━━━━━━━━━━━━━━━━`,
            formatLine('⛽ 89# 汽油', info.oil89),
            formatLine('⛽ 92# 汽油', info.oil92),
            formatLine('⛽ 95# 汽油', info.oil95),
            formatLine('⛽ 98# 汽油', info.oil98),
            formatLine('⛽ 0#  柴油', info.oil0),
            `┣━━━━━━━━━━━━━━━━━━━━━`,
            `┃ ⏰ 更新时间：${updateTime}`,
            `┗━━━━━━━━━━━━━━━━━━━━━┛`
        ].join('\n')
    }

    // 添加省份到配置
    async addOilPriceProvince(e) {
        const province = e.msg.replace(/^#添加|油价推送$/g, '').trim()
        if (!VALID_PROVINCES.includes(province)) {
            return e.reply(`省份名称错误, 支持:\n${VALID_PROVINCES.join('、')}`)
        }

        try {
            const info = await this.getOilPriceInfo(province)
            if (!info) return e.reply("无法获取该省份油价, 暂不支持添加")

            const configPath = 'config/config.yaml'
            const document = yaml.parseDocument(fs.readFileSync(configPath, 'utf8'))
            let provinces = document.getIn(['oilPrice', 'provinces']) || []

            if (provinces.includes(province)) return e.reply(`${province}已在推送列表中`)

            provinces.push(province)
            document.setIn(['oilPrice', 'provinces'], provinces)
            fs.writeFileSync(configPath, document.toString({ lineWidth: -1, noCompatMode: true, simpleKeys: true }), 'utf8')

            return e.reply(`成功添加${province}到推送列表`)
        } catch (error) {
            logger.error('[油价查询] 添加失败:', error)
            return e.reply("添加失败, 请检查控制台日志")
        }
    }

    // 定时推送逻辑
    async sendOilPriceInfo() {
        if (!plugin_config.isPush) return

        try {
            const provinces = plugin_config.provinces || ['广东']
            const priceGroups = new Map()

            for (const prov of provinces) {
                const info = await this.getOilPriceInfo(prov)
                if (!info) continue

                const key = `${info.oil89}-${info.oil92}-${info.oil95}-${info.oil98}-${info.oil0}`
                if (!priceGroups.has(key)) priceGroups.set(key, { provinces: [], info })
                priceGroups.get(key).provinces.push(prov)
            }

            for (const group of priceGroups.values()) {
                const msg = group.provinces.length === 1
                    ? this.formatOilPrice(group.info)
                    : this.formatOilPrice(group, true)

                const send = (ids, type) => ids.forEach(id => Bot[`send${type}Msg`](id, msg).catch(e => logger.error(e)))
                send(plugin_config.private_ids, 'Private')
                send(plugin_config.group_ids, 'Group')
            }
        } catch (error) {
            logger.error('[油价查询] 定时推送错误:', error)
        }
    }
}