import axios from 'axios'
import Config from '../components/Config.js'
import fs from 'fs'
import yaml from 'yaml'

/*
 * @description: 全国油价查询推送
 * @author: lycoris
 * @date: undefined
 */
const config = Config.getConfig('config')

const API_CONFIG = {
    DEFAULT: 'https://api.qqsuu.cn/api/dm-oilprice?prov=广东',
    BACKUP1: 'https://www.iamwawa.cn/oilprice/api?area=广东'
}

const plugin_config = config.oilPrice
const CRON_EXPRESSION = `${plugin_config.schedule.second} ${plugin_config.schedule.minute} ${plugin_config.schedule.hour} * * *`;
const VALID_PROVINCES = [
    "安徽", "北京", "福建", "甘肃", "广东", "广西", "贵州", "海南",
    "河北", "河南", "黑龙江", "湖北", "湖南", "吉林", "江苏", "江西",
    "辽宁", "内蒙古", "宁夏", "青海", "山东", "山西", "陕西", "上海",
    "四川", "天津", "西藏", "新疆", "云南", "浙江", "重庆"
];

export class OilPricePlugin extends plugin {
    constructor() {
        super({
            name: '油价查询',
            dsc: '获取全国各省份油价信息，并定时推送',
            event: 'message',
            priority: 1200,
            rule: [
                {
                    reg: '^#油价$|^油价查询$',
                    fnc: 'getOilPrice'
                },
                {
                    reg: '^#油价\\s*(.*)$',
                    fnc: 'getOilPriceByProvince'
                },
                {
                    reg: '^#添加(.*)油价推送$',
                    fnc: 'addOilPriceProvince'
                }
            ]
        })
        this.task = {
            name: '油价定时推送',
            fnc: () => this.sendOilPriceInfo(),
            cron: CRON_EXPRESSION
        }
    }



    // 验证省份是否有效
    validateProvince(province) {
        return VALID_PROVINCES.includes(province);
    }

    // 通用的油价信息获取和回复方法
    async handleOilPriceRequest(e, province = '江苏') {
        if (!this.validateProvince(province)) {
            await e.reply(`请输入正确的省份名称，支持以下省份：\n${VALID_PROVINCES.join('、')}`);
            return false;
        }

        try {
            const oilInfo = await this.getOilPriceInfo(province);
            if (oilInfo) {
                await e.reply(this.formatOilPriceInfo(oilInfo));
                return true;
            }
        } catch (error) {
            logger.error('获取油价信息失败:', error);
        }
        await e.reply("获取油价信息失败，请稍后重试！");
        return false;
    }

    // 默认查询（江苏油价）
    async getOilPrice(e) {
        return this.handleOilPriceRequest(e);
    }

    // 指定省份查询
    async getOilPriceByProvince(e) {
        const province = e.msg.replace(/^#油价\s*/, '').trim();
        return this.handleOilPriceRequest(e, province);
    }

    // 获取油价信息
    async getOilPriceInfo(province) {
        const apis = [
            {
                url: API_CONFIG.DEFAULT.replace('广东', province),
                process: data => ({
                    province: data.data.prov,
                    oil89: data.data.p89,
                    oil92: data.data.p92,
                    oil95: data.data.p95,
                    oil98: data.data.p98,
                    oil0: data.data.p0,
                    updateTime: data.data.time
                })
            },
            {
                url: API_CONFIG.BACKUP1.replace('广东', province),
                headers: {
                    'User-Agent': 'iamwawa-open-api'
                },
                process: data => ({
                    province: data.data.name,
                    oil89: '暂无数据',
                    oil92: data.data.p92,
                    oil95: data.data.p95,
                    oil98: data.data.p98,
                    oil0: data.data.p0,
                    updateTime: data.data.next_update_time
                })
            }
        ];

        for (const api of apis) {
            try {
                const response = await axios.get(api.url, {
                    headers: api.headers || {}
                });
                return api.process(response.data);
            } catch (error) {
                logger.error(`API ${api.url} failed:`, error);
                continue;
            }
        }
        throw new Error('All APIs failed');
    }

    // 格式化油价信息
    formatOilPriceInfo(data) {
        return `
📍 ${data.province} 🚘油价信息
⛽89号汽油：${data.oil89}元/升
⛽92号汽油：${data.oil92}元/升
⛽95号汽油：${data.oil95}元/升
⛽98号汽油：${data.oil98}元/升
⛽0号柴油：${data.oil0}元/升
⏰更新时间：${data.updateTime}
        `;
    }

    // 添加新的省份到推送列表
    async addOilPriceProvince(e) {
        const province = e.msg.replace(/^#添加|油价推送$/g, '').trim();

        // 验证省份名称
        if (!this.validateProvince(province)) {
            await e.reply(`请输入正确的省份名称，支持以下省份：\n${VALID_PROVINCES.join('、')}`);
            return false;
        }

        try {
            // 验证省份是否有效
            const oilInfo = await this.getOilPriceInfo(province);
            if (!oilInfo) {
                await e.reply("添加失败：无法获取该省份的油价信息");
                return false;
            }

            // 读取当前配置
            const configPath = 'config/config.yaml';
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = yaml.parse(configContent);

            // 确保provinces数组存在
            if (!config.oilPrice.provinces) {
                config.oilPrice.provinces = [];
            }

            // 检查是否已存在
            if (config.oilPrice.provinces.includes(province)) {
                await e.reply(`${province}已在推送列表中`);
                return false;
            }

            // 添加新省份
            config.oilPrice.provinces.push(province);

            // 保存配置
            fs.writeFileSync(configPath, yaml.stringify(config), 'utf8');
            await e.reply(`成功添加${province}到油价推送列表`);
            return true;
        } catch (error) {
            logger.error('添加油价推送省份失败:', error);
            await e.reply("添加失败，请稍后重试");
            return false;
        }
    }

    // 修改定时推送方法，支持相同油价合并发送
    async sendOilPriceInfo() {
        try {
            const provinces = plugin_config.provinces || ['广东'];
            const priceGroups = new Map(); // 用于存储相同油价的省份

            // 获取所有省份的油价信息
            for (const province of provinces) {
                try {
                    const oilInfo = await this.getOilPriceInfo(province);
                    // 创建价格键（不包含省份和时间）
                    const priceKey = `${oilInfo.oil89}-${oilInfo.oil92}-${oilInfo.oil95}-${oilInfo.oil98}-${oilInfo.oil0}`;

                    if (!priceGroups.has(priceKey)) {
                        priceGroups.set(priceKey, {
                            provinces: [],
                            info: oilInfo
                        });
                    }
                    priceGroups.get(priceKey).provinces.push(province);
                } catch (error) {
                    logger.error(`获取${province}油价信息失败:`, error);
                }
            }

            // 发送消息
            for (const [_, group] of priceGroups) {
                let message;
                if (group.provinces.length === 1) {
                    message = this.formatOilPriceInfo(group.info);
                } else {
                    message = this.formatGroupOilPriceInfo(group);
                }

                const sendPromises = [
                    ...plugin_config.private_ids.map(qq =>
                        Bot.sendPrivateMsg(qq, message).catch(err => logger.error(err))
                    ),
                    ...plugin_config.group_ids.map(qqGroup =>
                        Bot.sendGroupMsg(qqGroup, message).catch(err => logger.error(err))
                    )
                ];
                await Promise.all(sendPromises);
            }
        } catch (error) {
            logger.error('Error sending oil price messages:', error);
        }
    }

    // 添加新的格式化方法，用于多省份相同油价的情况
    formatGroupOilPriceInfo(group) {
        const { provinces, info } = group;
        return `
        📍 ${provinces.join('、')}油价信息
        ⏰ 更新时间：${info.updateTime}
        
        89号汽油：${info.oil89}元/升
        92号汽油：${info.oil92}元/升
        95号汽油：${info.oil95}元/升
        98号汽油：${info.oil98}元/升
        0号柴油：${info.oil0}元/升
        `;
    }
}