
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
import cfg from '../../../lib/config/config.js'


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
        // 检查是否有新字段需要合并(但不覆盖现有配置)
        const config = YAML.parse(fs.readFileSync(`${path}${file}`, 'utf8'))
        const defConfig = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
        const { differences, result } = this.mergeObjectsWithPriority(config, defConfig)
        if (differences) {
          // 使用 parseDocument 保留注释
          const userDoc = YAML.parseDocument(fs.readFileSync(`${path}${file}`, 'utf8'))

          // 递归添加缺失的字段
          const addMissingFields = (doc, defConfig, userConfig, prefix = '') => {
            for (const [key, value] of Object.entries(defConfig)) {
              const currentValue = userConfig[key]

              if (currentValue === undefined) {
                // 用户配置中不存在,添加默认值
                const fullKey = prefix ? `${prefix}.${key}` : key
                doc.setIn(fullKey.split('.'), value)
              } else if (_.isPlainObject(value) && _.isPlainObject(currentValue)) {
                // 递归处理嵌套对象
                const newPrefix = prefix ? `${prefix}.${key}` : key
                addMissingFields(doc, value, currentValue, newPrefix)
              }
            }
          }

          addMissingFields(userDoc, defConfig, config)
          fs.writeFileSync(`${path}${file}`, userDoc.toString({ lineWidth: -1, noCompatMode: true, simpleKeys: true }), 'utf8')
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
      logger.error(`[${pluginName}] 配置文件转换失败:${error.message}`)
      return {}
    }
  }

  /** 插件相关配置 */
  get userConfig() {
    return this.getDefOrConfig('config')
  }



  /** 主人QQ */
  get masterQQ() {
    return cfg.masterQQ || []
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
   * @param type 默认跑配置-defSet,用户配置-config
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
      return // 值未变化,不修改
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

  /**
   * 更新 YAML 配置(保留注释)
   * @param {string} filePath YAML 文件路径
   * @param {object} updates 要更新的配置对象
   */
  updateYamlConfig(filePath, updates) {
    const content = fs.readFileSync(filePath, 'utf8')
    const document = YAML.parseDocument(content)

    // 递归设置所有配置值
    const setValues = (doc, obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (_.isPlainObject(value) && !_.isArray(value)) {
          setValues(doc, value, fullKey)
        } else {
          doc.setIn(fullKey.split('.'), value)
        }
      }
    }

    setValues(document, updates)
    fs.writeFileSync(filePath, document.toString({
      lineWidth: -1,
      noCompatMode: true,
      simpleKeys: true
    }), 'utf8')
  }

  /** 设置配置(保留注释) */
  setConfig(config) {
    const path = `${pluginRootPath}/config/config/config.yaml`
    this.updateYamlConfig(path, config)
    delete this.config['config.config']
  }
}
export default new Config()
