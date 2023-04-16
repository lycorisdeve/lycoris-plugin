import yaml from 'yaml'
import fs from 'node:fs'
import chokidar from 'chokidar'
import { pluginResources, pluginRootPath } from '../components/lib/Path.js'


class Config {
    constructor() {
        this.config = {}

        /** 监听文件 */
        this.watcher = { config: {}, defSet: {} }

        this.initConfig()
    }
    getConfig(name) {
        return this.getYaml('config', name)
    }


    /** 初始化配置 */
    initConfig() {
        let path = `${pluginRootPath}/config/`
        let pathDef = `${pluginResources}/defSet/`
        const files = fs.readdirSync(pathDef).filter(file => file.endsWith('.yaml'))
        for (let file of files) {
            if (!fs.existsSync(`${path}${file}`)) {
                fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
            }
        }
    }

    /**
   * 获取配置yaml
   * @param type 默认跑配置-defSet，用户配置-config
   * @param name 名称
   */
    getYaml(type, name) {
        let file = `${pluginRootPath}/config/${name}.yaml`
        let key = `${type}.${name}`
        if (this.config[key]) return this.config[key]

        this.config[key] = yaml.parse(
            fs.readFileSync(file, 'utf8')
        )

        this.watch(file, name, type)

        return this.config[key]
    }

    /** 监听配置文件 */
    watch(file, name, type = 'default_config') {
        let key = `${type}.${name}`

        if (this.watcher[key]) return

        const watcher = chokidar.watch(file)
        watcher.on('change', path => {
            delete this.config[key]
            if (typeof Bot == 'undefined') return
            logger.mark(`[修改配置文件][${type}][${name}]`)
            if (this[`change_${name}`]) {
                this[`change_${name}`]()
            }
        })

        this.watcher[key] = watcher
    }


}
export default new Config()