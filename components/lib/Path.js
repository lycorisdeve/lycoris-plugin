
import path from 'path'

const botPath = process.cwd().replace(/\\/g, '/')


import fs from 'fs'

// 插件名
const pluginName = path.basename(path.join(import.meta.url, '../../../'))
// 插件根目录
let pluginRootPath = path.join(botPath, 'plugins', pluginName)

if (!fs.existsSync(pluginRootPath) && fs.existsSync(path.join(botPath, 'package.json')) && JSON.parse(fs.readFileSync(path.join(botPath, 'package.json'))).name === pluginName) {
    pluginRootPath = botPath
}

// 插件资源目录
const pluginResources = path.join(pluginRootPath, 'resources')

export {
    path,
    botPath,
    pluginName,
    pluginRootPath,
    pluginResources,
}