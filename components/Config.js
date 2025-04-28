
import fs from 'fs'
import YAML from 'yaml'
import chokidar from 'chokidar'
import {
  pluginName,
  pluginRootPath,
} from './lib/Path'
import YamlManager from './YamlManager'

const _cfgPath = `${pluginRootPath}/components/`


let configPath = `${pluginRootPath}/config/`
let defSetPath = `${pluginRootPath}/config/default_config/`

class Config {
  constructor() {
    this.config = {}
    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }
    this.initCfg()
    this.transition()
  }

  /** 初始化配置 */
  initCfg() {
    let path
    if (Version.BotName === 'Karin') path = `${configPath}`
    path = `${configPath}/config/`
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    const pathDef = defSetPath
    const files = fs.readdirSync(pathDef).filter(file => file.endsWith('.yaml'))
    for (const file of files) {
      if (!fs.existsSync(`${path}${file}`)) {
        fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
      } else {
        const config = YAML.parse(fs.readFileSync(`${path}${file}`, 'utf8'))
        const defConfig = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
        const { differences, result } = this.mergeObjectsWithPriority(config, defConfig)
        if (differences) {
          fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
          for (const key in result) {
            this.modify(file.replace('.yaml', ''), key, result[key])
          }
        }
      }
      this.watch(`${path}${file}`, file.replace('.yaml', ''), 'config')
    }
  }

  /** json 转 yaml */
  transition() {
    if (!fs.existsSync(`${pluginRootPath}/config/config.json`, 'utf8')) {
      return
    }
    const oldCfg = JSON.parse(fs.readFileSync(`${pluginRootPath}/config/config.json`, 'utf8'))

    return newCfg
  }

  /** 插件相关配置 */
  get config() {
    return this.getDefOrConfig('config')
  }

  /** warframe相关配置 */
  get warframe() {
    return this.getDefOrConfig('warframe')
  }


  /**
   * 获取截图功能的配置或默认设置
   */
  get screenshot() {
    return this.getDefOrConfig('screenshot')
  }

  All() {
    return {
      config: this.config,
      warframe: this.warframe,
      screenshot: this.screenshot,
    }
  }

  /** 默认配置和用户配置 */
  getDefOrConfig(name) {
    const def = this.getdefSet(name)
    const config = this.getConfig(name)
    return { ...def, ...config }
  }

  /** 默认配置 */
  getdefSet(name) {
    return this.getYaml('default_config', name)
  }

  /** 用户配置 */
  getConfig(name) {
    return this.getYaml('config', name)
  }

  /**
   * 获取配置yaml
   * @param type 默认跑配置-defSet，用户配置-config
   * @param name 名称
   */
  getYaml(type, name) {
    const file = `${pluginRootPath}/config/${type}/${name}.yaml`
    const key = `${type}.${name}`

    if (this.config[key]) return this.config[key]

    this.config[key] = YAML.parse(
      fs.readFileSync(file, 'utf8')
    )

    this.watch(file, name, type)

    return this.config[key]
  }

  /** 监听配置文件 */
  watch(file, name, type = 'default_config') {
    const key = `${type}.${name}`
    if (this.watcher[key]) return

    const watcher = chokidar.watch(file)
    watcher.on('change', async path => {
      delete this.config[key]
      logger.mark(`[${pluginName}][修改配置文件][${type}][${name}]`)
    })

    this.watcher[key] = watcher
  }

  /**
   * 修改设置
   * @param {'config','warframe','screenshot'} name 文件名
   * @param {String} key 修改的key值
   * @param {String|Number} value 修改的value值
   * @param {'config'|'default_config'} type 配置文件或默认
   */
  modify(name, key, value, type = 'config') {
    const path = `${pluginRootPath}/config/${type}/${name}.yaml`
    new YamlManager(path).set(key, value)
    delete this.config[`${type}.${name}`]
  }

  mergeObjectsWithPriority(objA, objB) {
    let differences = false

    function customizer(objValue, srcValue, key, object, source, stack) {
      if (_.isArray(objValue) && _.isArray(srcValue)) {
        return objValue
      } else if (_.isPlainObject(objValue) && _.isPlainObject(srcValue)) {
        if (!_.isEqual(objValue, srcValue)) {
          return _.mergeWith({}, objValue, srcValue, customizer)
        }
      } else if (!_.isEqual(objValue, srcValue)) {
        differences = true
        return objValue !== undefined ? objValue : srcValue
      }
      return objValue !== undefined ? objValue : srcValue
    }

    const result = _.mergeWith({}, objA, objB, customizer)

    return {
      differences,
      result
    }
  }
}
export default new Config()
