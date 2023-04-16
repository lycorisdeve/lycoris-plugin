/*
 * @description: 
 * @author: 名字
 * @date: Do not edit
 */
import { Version } from '../Index.js'
import Cfg from '../Cfg.js'
import { pluginResources } from './Path.js'

export default async function (path, params, cfg) {
  let { e } = cfg
  if (!e.runtime) {
    console.log('未找到e.runtime，请升级至最新版Yunzai')
  }
  return e.runtime.render('lycoris-plugin', path, params, {
    retType: cfg.retMsgId ? 'msgId' : 'default',
    beforeRender({ data }) {
      let resPath = data.pluResPath
      const layoutPath = `${pluginResources}/common/layout/`
      return {
        ...data,
        _res_path: resPath,
        _layout_path: layoutPath,
        _tpl_path: `${pluginResources}/common/tpl/`,
        defaultLayout: layoutPath + 'default.html',
        elemLayout: layoutPath + 'elem.html',
        sys: {
          scale: Cfg.scale(cfg.scale || 1),
          copyright: `Created By Yunzai-Bot<span class="version">${Version.yunzai}</span> & Lycoris-Plugin<span class="version">${Version.version}</span>`
        }
      }
    }
  })
}