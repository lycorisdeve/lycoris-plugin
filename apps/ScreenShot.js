/** 
 * 改编自https://gitee.com/a1_panda/Yunzai-Bot-plugins
  */
import fs from "fs";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import sizeOf from "image-size";
import yaml from 'yaml';
import path from 'path';

// 使用绝对路径
const BASE_PATH = path.resolve('.');
const CONFIG_PATH = path.join(BASE_PATH, 'config', 'screenshot.yaml');
const TEMP_DIR = path.join(BASE_PATH, 'temp');

// 默认配置
const DEFAULT_CONFIG = {
    fullScreen: true,
    screenshot: {
        quality: 80,
        minWidth: 800,
        maxWidth: 1920,
        padding: 80,
        timeout: {
            page: 60000,
            resource: 30000,
            render: 10000
        }
    },
    proxyApi: {
        url: 'https://proxyapi.198143.xyz/',
        enabled: true
    }
};

// 验证配置
function validateConfig(config) {
    const defaultKeys = Object.keys(DEFAULT_CONFIG);
    const configKeys = Object.keys(config);

    // 检查缺失的配置项
    for (const key of defaultKeys) {
        if (!configKeys.includes(key)) {
            config[key] = DEFAULT_CONFIG[key];
        } else if (typeof config[key] === 'object') {
            config[key] = { ...DEFAULT_CONFIG[key], ...config[key] };
        }
    }

    return config;
}

// 读取配置
let config;
try {
    if (fs.existsSync(CONFIG_PATH)) {
        const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = validateConfig(yaml.parse(fileContent));
    } else {
        // 确保配置目录存在
        const configDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        config = DEFAULT_CONFIG;
        fs.writeFileSync(CONFIG_PATH, yaml.stringify(config));
    }
} catch (error) {
    logger.error(`[截图] 读取配置文件失败: ${error}`);
    config = DEFAULT_CONFIG;
}

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 清理临时文件
function cleanupTempFiles() {
    try {
        const files = fs.readdirSync(TEMP_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            const stats = fs.statSync(filePath);
            // 跳过目录
            if (stats.isDirectory()) {
                continue;
            }
            // 删除超过1小时的临时文件
            if (now - stats.mtimeMs > 3600000) {
                fs.unlinkSync(filePath);
            }
        }
    } catch (error) {
        logger.error(`[截图] 清理临时文件失败: ${error}`);
    }
}

// 定期清理临时文件
setInterval(cleanupTempFiles, 3600000);

// 截图前等待的时间
const screenWaitTime = 10;

export class Screenshot extends plugin {
    constructor() {
        super({
            name: "网页截图工具",
            dsc: "http截图",
            event: "message",
            priority: 8000,
            rule: [
                {
                    reg: "^http(s)?://",
                    fnc: "screenshot",
                },
                {
                    reg: "^#截图(开启|关闭|切换)$",
                    fnc: "screenshotStatus",
                },
                {
                    reg: "^#gittr$",
                    fnc: "githubTrending",
                },
                {
                    reg: "^#截图设置$",
                    fnc: "showConfig",
                }
            ],
        });

        // 初始化时清理临时文件
        cleanupTempFiles();
    }

    // 显示当前配置
    async showConfig(e) {
        if (!e.isMaster) {
            e.reply("只有主人才能查看配置");
            return true;
        }

        const configStr = yaml.stringify(config);
        e.reply(`当前配置：\n${configStr}`);
        return true;
    }

    // 保存配置
    saveConfig() {
        try {
            fs.writeFileSync(CONFIG_PATH, yaml.stringify(config));
        } catch (error) {
            logger.error(`[截图] 保存配置失败: ${error}`);
        }
    }

    async delay(timeout) {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }

    async screenshotStatus(e) {
        if (!e.isMaster) {
            e.reply("只有主人才能切换截图模式");
            return true;
        }

        const command = e.msg.replace('#截图', '');

        switch (command) {
            case '开启':
                config.fullScreen = true;
                e.reply("已开启长截图模式");
                break;
            case '关闭':
                config.fullScreen = false;
                e.reply("已关闭长截图模式");
                break;
            case '切换':
                config.fullScreen = !config.fullScreen;
                e.reply(`已${config.fullScreen ? '开启' : '关闭'}长截图模式`);
                break;
        }

        this.saveConfig();
        logger.info(`[截图] ${config.fullScreen ? '开启' : '关闭'}长截图模式`);
        return true;
    }

    async screenshot(e) {
        if (!e.isMaster) {
            logger.info("[截图] 检测到当前不是主人，忽略");
            return true;
        }

        const url = e.msg.trim();
        if (!url.startsWith('http')) {
            // e.reply("请输入正确的网址");
            return true;
        }

        await this.sendScreenShot(url, config.fullScreen);
        return true;
    }

    async githubTrending(e) {
        if (!e.isMaster) {
            logger.info("[截图] 检测到当前不是主人，忽略");
            return true;
        }
        e.reply("正在获取GitHub趋势...");
        await this.sendNormalScreenShot("https://github.com/trending", true);
        return true;
    }

    async sendNormalScreenShot(link, fullPage = true) {
        let browser = null;
        try {
            // 打开一个新的页面
            browser = await puppeteer.browserInit();
            const page = await browser.newPage();
            // 导航到你想要截图的URL
            await page.goto(link);
            logger.info(`开始截图...${link}`);
            // 设置截图的大小和视口尺寸
            // await page.setViewport({ width: 1280, height: 800 });
            // 截图并保存到文件
            await page.screenshot({
                path: './screenshot.png',
                type: 'jpeg',
                fullPage: fullPage,
                omitBackground: false,
                quality: 70
            });
            await this.e.reply(segment.image(fs.readFileSync("./screenshot.png")));
            await browser.close();
        } catch (error) {
            logger.error(`截图失败: ${error}`);
            if (browser) {
                await browser.close();
            }
        }
    }

    async sendScreenShot(link, fullPage = true) {
        let browser = null;
        let tempFile = null;
        try {
            // 检查是否是微信文章
            const isWeixinArticle = link.startsWith('https://mp.weixin.qq.com/s/');
            logger.info(`[截图] ${isWeixinArticle ? '检测到微信文章，将使用特殊处理...' : '普通网页处理'}`);

            // 基础启动参数
            const launchArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote'
            ];
            let needProxy
            // 如果是微信文章，添加特殊参数
            if (isWeixinArticle) {
                launchArgs.push('--enable-features=NetworkService');
                launchArgs.push('--disable-features=NetworkServiceInProcess');
                needProxy = false
            } else {
                // 检查是否需要使用代理
                needProxy = await this.checkNeedProxy(link);
            }

            // 处理URL
            const finalUrl = needProxy && config.proxyApi.enabled
                ? `${config.proxyApi.url}${link}`
                : link;
            logger.info(`[截图] 使用URL: ${finalUrl}`);

            // 使用自定义启动参数初始化浏览器
            browser = await puppeteer.browserInit({
                args: launchArgs,
                ignoreHTTPSErrors: true,
                timeout: 60000
            });

            // 创建新页面
            let page = await browser.newPage();

            // 设置页面超时（微信文章使用更长的超时时间）
            await page.setDefaultNavigationTimeout(isWeixinArticle ? 60000 : 30000);
            await page.setDefaultTimeout(isWeixinArticle ? 60000 : 30000);

            // 访问页面
            logger.info(`[截图] 正在加载页面: ${link}`);
            const response = await page.goto(link, {
                waitUntil: ['load', 'networkidle0'],
                timeout: isWeixinArticle ? 60000 : 30000
            });

            // 如果是微信文章，等待更长时间确保图片加载
            if (isWeixinArticle) {
                logger.info('[截图] 微信文章等待图片加载中...');
                await this.delay(10000); // 先等待10秒

                // 滚动触发图片加载
                await page.evaluate(async () => {
                    return new Promise((resolve) => {
                        let scrollCount = 0;
                        const maxScrolls = 20; // 增加滚动次数

                        const scrollInterval = setInterval(() => {
                            window.scrollTo(0, document.body.scrollHeight);
                            setTimeout(() => window.scrollTo(0, 0), 800);

                            document.querySelectorAll('img').forEach(img => {
                                if (img.dataset.src && !img.src) {
                                    img.src = img.dataset.src;
                                }
                                img.classList.remove('img_loading');
                            });

                            scrollCount++;
                            if (scrollCount >= maxScrolls) {
                                clearInterval(scrollInterval);
                                window.scrollTo(0, 0);
                                resolve();
                            }
                        }, 1500); // 增加滚动间隔

                        setTimeout(() => {
                            clearInterval(scrollInterval);
                            window.scrollTo(0, 0);
                            resolve();
                        }, 30000);
                    });
                });
            }

            logger.info('[截图] 页面主体加载完成，正在处理图片...');
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    const checkReady = () => {
                        if (document.readyState === 'complete') {
                            resolve();
                        } else {
                            setTimeout(checkReady, 100); // 每 100ms 检查一次
                        }
                    };

                    // 移除已有监听，避免重复
                    window.removeEventListener('load', resolve);
                    window.addEventListener('load', resolve);

                    // 设置超时（60 秒）
                    const timeout = setTimeout(resolve, 30000);

                    // 检查 readyState
                    checkReady();

                    // 超时后清理
                    return () => {
                        clearTimeout(timeout);
                        window.removeEventListener('load', resolve);
                    };
                });
            });

            // 如果是长截图模式，添加滚动进度提示
            if (fullPage) {
                logger.info('[截图] 开始处理长图...');

                await page.evaluate(async () => {
                    return new Promise((resolve) => {
                        let lastHeight = 0;
                        let progress = 0;
                        const checkHeight = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            if (lastHeight === scrollHeight) {
                                clearInterval(checkHeight);
                                resolve();
                                return;
                            }

                            // 只在日志中显示滚动进度
                            const currentScroll = window.pageYOffset;
                            const newProgress = Math.floor((currentScroll / scrollHeight) * 100);
                            if (newProgress > progress + 20) {
                                progress = newProgress;
                                console.info(`[截图] 滚动进度: ${progress}%`);
                            }

                            lastHeight = scrollHeight;
                            window.scrollTo(0, scrollHeight);
                        }, 100);

                        setTimeout(() => {
                            clearInterval(checkHeight);
                            resolve();
                        }, 30000);
                    });
                });
            }

            // await this.e.reply("内容加载完成，正在生成截图...");

            // 访问页面后获取实际内容宽度
            const pageWidth = await page.evaluate(() => {
                // 获取页面内容宽度
                const contentWidth = Math.max(
                    document.documentElement.scrollWidth,
                    document.body.scrollWidth,
                    document.documentElement.offsetWidth,
                    document.body.offsetWidth
                );

                // 获取实际内容区域的宽度，排除空白区域
                const mainContent = document.querySelector('main, #main, .main, article, .content, #content');

                // 设置宽度限制
                const MIN_WIDTH = 800;   // 最小宽度
                const MAX_WIDTH = 1920;  // 最大宽度
                const PADDING = 80;      // 左右留白总和

                let finalWidth;
                if (mainContent) {
                    // 使用主要内容区域的宽度
                    const mainWidth = mainContent.offsetWidth;
                    if (mainWidth < 100 || mainWidth > 3000) {  // 检测异常宽度
                        // 如果主内容区域宽度异常，使用视口宽度
                        finalWidth = Math.min(window.innerWidth, MAX_WIDTH);
                    } else {
                        finalWidth = mainWidth;
                    }
                } else {
                    // 如果没有找到主要内容区，使用页面宽度
                    finalWidth = Math.min(contentWidth, MAX_WIDTH);
                }

                // 确保宽度在合理范围内
                finalWidth = Math.max(MIN_WIDTH, Math.min(finalWidth + PADDING, MAX_WIDTH));

                return finalWidth;
            });

            // 输出宽度信息用于调试
            logger.info(`[截图] 页面宽度: ${pageWidth}px`);

            // 调整视口宽度以适应内容
            await page.setViewport({
                width: pageWidth,
                height: 800,
                deviceScaleFactor: 1
            });

            // 根据模式选择不同的处理方式
            if (fullPage) {
                // 长图模式：滚动加载
                await Promise.race([
                    page.evaluate(async () => {
                        // 滚动触发懒加载
                        await new Promise((resolve) => {
                            let totalHeight = 0;
                            const distance = 200;
                            const timer = setInterval(() => {
                                const scrollHeight = document.body.scrollHeight;
                                window.scrollBy(0, distance);
                                totalHeight += distance;

                                if (totalHeight >= scrollHeight) {
                                    clearInterval(timer);
                                    window.scrollTo(0, 0);
                                    resolve();
                                }
                            }, 50);
                        });
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 10000))
                ]).catch(error => {
                    logger.warn(`[截图] 页面加载未完全完成: ${error}`);
                });
            } else {
                // 普通模式：等待可视区域内容加载
                await Promise.race([
                    page.evaluate(async () => {
                        // 只等待视口内的图片加载
                        const images = Array.from(document.images)
                            .filter(img => {
                                const rect = img.getBoundingClientRect();
                                return rect.top < window.innerHeight;
                            });

                        await Promise.all(
                            images
                                .filter(img => !img.complete)
                                .map(img => new Promise(resolve => {
                                    img.onload = img.onerror = resolve;
                                }))
                        );
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 5000))
                ]).catch(error => {
                    logger.warn(`[截图] 首屏加载未完成: ${error}`);
                });
            }

            // 短暂等待以确保渲染
            await this.delay(1000);

            // 生成临时文件名
            tempFile = `./temp/screenshot_${Date.now()}.png`;

            // 截图
            await page.screenshot({
                path: tempFile,
                type: "png",
                fullPage: fullPage,
                omitBackground: false
            });
            logger.info(`[截图] 截图已保存: ${tempFile}`);

            // 发送图片
            await this.e.reply(segment.image(fs.readFileSync(tempFile)));
            return true;

        } catch (error) {
            logger.error(`[截图] 错误详情: ${error.stack || error}`);

            if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                await this.e.reply("代理服务器连接失败，请检查代理服务器是否正常运行");
            } else if (error.message.includes('net::ERR_TUNNEL_CONNECTION_FAILED')) {
                await this.e.reply("代理隧道连接失败，请检查代理服务器配置");
            } else if (error.message.includes('net::ERR_CONNECTION_RESET')) {
                await this.e.reply("连接被重置，可能是代理服务器拒绝了连接，请检查代理设置");
            } else if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT')) {
                await this.e.reply("连接超时，请检查代理服务器响应时间");
            } else {
                await this.e.reply(`截图失败: ${error.message}`);
            }
            return false;
        } finally {
            if (browser) await browser.close();
            if (tempFile && fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    }

    // 修改代理相关命令也使用配置文件
    async toggleProxy(e) {
        if (!e.isMaster) {
            e.reply("只有主人才能控制截图代理设置");
            return true;
        }

        const isEnable = e.msg.includes("开启");
        config.proxyApi.enabled = true;
        this.saveConfig();
        e.reply(`已${isEnable ? '开启' : '关闭'}截图代理`);
        return true;
    }

    async setProxy(e) {
        if (!e.isMaster) {
            e.reply("只有主人才能设置代理API");
            return true;
        }

        // 修改正则以匹配代理API URL
        const match = e.msg.match(/^#截图代理设置\s*(https?:\/\/[^\s]+)\s*$/i);
        if (match) {
            const [, proxyUrl] = match;

            // 确保URL以/结尾
            config.proxyApi.url = proxyUrl.endsWith('/') ? proxyUrl : `${proxyUrl}/`;
            config.proxyApi.enabled = true;

            this.saveConfig();
            e.reply(`代理API已更新：${config.proxyApi.url}`);

            // 输出详细日志
            logger.info(`[截图] 代理API已更新 - URL:${config.proxyApi.url}`);
        } else {
            e.reply("格式错误！正确格式：#截图代理设置 https://proxyapi.example.com/");
        }
        return true;
    }

    // 添加检查是否需要代理的方法
    async checkNeedProxy(url) {
        // 需要代理的网站列表
        const proxyDomains = [
            'github.com',
            'raw.githubusercontent.com',
            'gist.githubusercontent.com',
            'youtube.com',
            'google.com',
            'twitter.com',
            'facebook.com',
            't.co',
            'twimg.com',
            'pornhub.com',
            'xvideos.com',
            'xhamster.com',
            'onlyfans.com',
            'chaturbate.com',
            'redtube.com'
        ];

        try {
            const urlObj = new URL(url);
            // 检查是否在需要代理的域名列表中
            const needForceProxy = proxyDomains.some(domain =>
                urlObj.hostname.includes(domain)
            );

            // 如果在列表中或代理已开启，则使用代理
            return needForceProxy;
        } catch (error) {
            logger.error(`[截图] URL解析失败: ${error}`);
            return false;
        }
    }
}

function screenRender(screenshotBase64, url, pageWidth) {
    // 获取图片尺寸
    const img = new Buffer.from(screenshotBase64, 'base64');
    let dimensions;
    try {
        dimensions = sizeOf(img);
    } catch (e) {
        dimensions = { width: pageWidth || 1200, height: 800 };
    }

    // 使用页面实际宽度计算容器宽度，确保有适当留白
    const containerWidth = Math.min(pageWidth || dimensions.width, 1920);

    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>网页截图</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                padding: 0.5rem;
                margin: 0;
            }

            .container {
                width: ${containerWidth}px;
                max-width: 98vw;
                margin: 0 auto;
                padding: 0 10px;
            }

            .screenshot-container {
                position: relative;
                line-height: 0;
                width: 100%;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
                border-radius: 8px;
                overflow: hidden;
            }

            .screenshot {
                width: 100%;
                height: auto;
                display: block;
            }

            @media screen and (min-height: 2000px) {
                body {
                    align-items: flex-start;
                    padding-top: 1rem;
                }
            }

            @media (prefers-color-scheme: dark) {
                body {
                    background: linear-gradient(135deg, #2d3436 0%, #1a1a1a 100%);
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="screenshot-container">
                <img class="screenshot" src="data:image/png;base64,${screenshotBase64}" alt="Screenshot">
            </div>
        </div>
    </body>
    </html>`;
}