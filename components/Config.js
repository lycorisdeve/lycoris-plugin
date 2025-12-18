
import fs from 'fs'
import _ from 'lodash'
import YAML from 'yaml'
import chokidar from 'chokidar'
import Version from './Version.js'
import {
  pluginName,
  pluginRootPath,
} from './lib/Path.js'

import YamlManager from './YamlManager.js'


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
        // 检查是否有新字段需要合并（但不覆盖现有配置）
        const config = YAML.parse(fs.readFileSync(`${path}${file}`, 'utf8'))
        const defConfig = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
        const { differences, result } = this.mergeObjectsWithPriority(config, defConfig)
        if (differences) {
          // 合并新字段到用户配置，但不覆盖现有值
          const merged = _.merge({}, defConfig, config) // 优先使用用户配置
          fs.writeFileSync(`${path}${file}`, YAML.stringify(merged), 'utf8')
        }
      }
      this.watch(`${path}${file}`, file.replace('.yaml', ''), 'config')
    }
  }

  /** json 转 yaml */
  transition() {
    const jsonPath = `${pluginRootPath}/config/config.json`
    if (!fs.existsSync(jsonPath)) {
      return
    }

    try {
      // 读取旧的JSON配置
      const oldCfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

      // 转换为YAML格式
      const yamlContent = YAML.stringify(oldCfg)

      // 保存为YAML文件
      const yamlPath = `${pluginRootPath}/config/config/config.yaml`
      fs.writeFileSync(yamlPath, yamlContent, 'utf8')

      // 备份并删除旧的JSON文件
      const backupPath = `${jsonPath}.backup`
      fs.copyFileSync(jsonPath, backupPath)
      fs.unlinkSync(jsonPath)

      logger.mark(`[${pluginName}] 配置文件已从JSON转换为YAML格式`)

      return oldCfg
    } catch (error) {
      logger.error(`[${pluginName}] 配置文件转换失败：${error.message}`)
      return {}
    }
  }

  /** 插件相关配置 */
  get userConfig() {
    return this.getDefOrConfig('config')
  }


  All() {
    return {
      config: this.userConfig,
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
   * @param {'config'} name 文件名
   * @param {String} key 修改的key值
   * @param {String|Number} value 修改的value值
   * @param {'config'|'default_config'} type 配置文件或默认
   */
  modify(name, key, value, type = 'config') {
    const path = `${pluginRootPath}/config/${type}/${name}.yaml`
    const content = fs.readFileSync(path, 'utf8')
    const document = YAML.parseDocument(content)
    if (_.isEqual(document.get(key), value)) {
      return // 值未变化，不修改
    }
    document.set(key, value)
    fs.writeFileSync(path, document.toString({ lineWidth: -1, noCompatMode: true, simpleKeys: true }), 'utf8')
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

  /** 设置配置 */
  setConfig(config) {
    const path = `${pluginRootPath}/config/config/config.yaml`
    fs.writeFileSync(path, YAML.stringify(config, { indent: 2 }), 'utf8')
    delete this.config['config.config']
  }
}
export default new Config()
