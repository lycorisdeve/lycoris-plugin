
import path from 'path'

const botPath = process.cwd().replace(/\\/g, '/')


// 插件名
const pluginName = path.basename(path.join(import.meta.url, '../../../'))
// 插件根目录
let pluginRootPath = path.join(botPath, 'plugins', pluginName)
// 插件资源目录
const pluginResources = path.join(pluginRootPath, 'resources')

export {
    path,
    botPath,
    botName,
    pluginName,
    pluginRootPath,
    pluginResources,
}