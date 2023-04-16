/*
 * @description: 
 * @author: 名字
 * @date: Do not edit
 */
/*
 * @description: lycoris-plugin
 * @author: lycoris
 */
import chalk from 'chalk'
import fs from 'fs'
import { Data, Version } from './components/Index.js'

logger.info(chalk.rgb(253, 235, 255)('-------------------------'))
logger.info(chalk.rgb(134, 142, 204)(`彼岸花插件${Version.version}初始化~`))
logger.info(chalk.rgb(253, 235, 255)('-------------------------'))

if (!global.segment) {
    try {
        global.segment = (await import('oicq')).segment
    } catch (err) {
        global.segment = (await import('icqq')).segment
    }
}

// 检查依赖安装


const appsPath = './plugins/lycoris-plugin/apps'
const jsFiles = fs.readdirSync(appsPath).filter((file) => file.endsWith('.js'))
let ret = []
jsFiles.forEach((file) => {
    ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in jsFiles) {
    let name = jsFiles[i].replace('.js', '')

    if (ret[i].status != 'fulfilled') {
        logger.error(`载入插件错误：${logger.red(name)}`)
        logger.error(ret[i].reason)
        continue
    }
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
