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

const c1 = chalk.bold.hex('#FF0055');
const c2 = chalk.bold.hex('#FF5500');
const c3 = chalk.bold.hex('#FFCC00');
const c4 = chalk.bold.hex('#33FF00');
const c5 = chalk.bold.hex('#00DDFF');

logger.info(c1('  ◢██████◣  ') + c2('◢██████◣  ') + c3('◢██████◣  ') + c4('◢██████◣  ') + c5('◢██████◣'))
logger.info(c1('  █        █  ') + c2('█        █  ') + c3('█        █  ') + c4('█        █  ') + c5('█        █'))
logger.info(chalk.bold.magenta(`   🌸  Lycoris-Plugin  v${Version.version}  -  彼 岸 花  🌸  `))
logger.info(chalk.bold.cyan('   ✨  [ 系统正在同步时空频率... ]  ✨           '))
logger.info(chalk.bold.yellow('   🚀  [ 核心模块载入中... Done! ]  🚀           '))
logger.info(c5('  █        █  ') + c4('█        █  ') + c3('█        █  ') + c2('█        █  ') + c1('█        █'))
logger.info(c5('  ◥██████◤  ') + c4('◥██████◤  ') + c3('◥██████◤  ') + c2('◥██████◤  ') + c1('◥██████◤'))

if (!global.segment) {
    try {
        global.segment = (await import('oicq')).segment
    } catch (err) {
        global.segment = (await import('@icqqjs/icqq')).segment
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
        logger.error(`载入插件错误:${logger.red(name)}`)
        logger.error(ret[i].reason)
        continue
    }
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

import { supportGuoba } from './guoba.support.js'

export { apps, supportGuoba }
