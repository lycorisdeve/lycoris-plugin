import fs from 'fs'
import lodash from 'lodash'
import { pluginRootPath } from './lib/Path.js'
import { pluginName } from './lib/Path.js'
import simpleGit from 'simple-git'

const _path = process.cwd()
const _logPath = `${_path}/plugins/lycoris-plugin/CHANGELOG.md`

let logs = {}
let changelogs = []
let currentVersion
let versionCount = 4

let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
let yunzaiPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const getLine = function (line) {
  line = line.replace(/(^\s*\*|\r)/g, '')
  line = line.replace(/\s*`([^`]+`)/g, '<span class="cmd">$1')
  line = line.replace(/`\s*/g, '</span>')
  line = line.replace(/\s*\*\*([^\*]+\*\*)/g, '<span class="strong">$1')
  line = line.replace(/\*\*\s*/g, '</span>')
  line = line.replace(/ⁿᵉʷ/g, '<span class="new"></span>')
  return line
}

try {
  if (fs.existsSync(_logPath)) {
    logs = fs.readFileSync(_logPath, 'utf8') || ''
    logs = logs.split('\n')

    let temp = {};
    let lastLine = {}
    lodash.forEach(logs, (line) => {
      if (versionCount <= -1) {
        return false
      }
      let versionRet = /^#\s*([0-9a-zA-Z\\.~\s]+?)\s*$/.exec(line)
      if (versionRet && versionRet[1]) {
        let v = versionRet[1].trim()
        if (!currentVersion) {
          currentVersion = v
        } else {
          changelogs.push(temp)
          if (/0\s*$/.test(v) && versionCount > 0) {
            versionCount = 0
          } else {
            versionCount--
          }
        }

        temp = {
          version: v,
          logs: []
        }
      } else {
        if (!line.trim()) {
          return
        }
        if (/^\*/.test(line)) {
          lastLine = {
            title: getLine(line),
            logs: []
          }
          temp.logs.push(lastLine)
        } else if (/^\s{2,}\*/.test(line)) {
          lastLine.logs.push(getLine(line))
        }
      }
    })
  }
} catch (e) {
  // do nth
}

const yunzaiVersion = yunzaiPackageJson.version
const isV3 = yunzaiVersion[0] === '3'
const pluginVersion = packageJson.version

/**
 * @type {'Karin'|'Miao-Yunzai'|'Trss-Yunzai'|'yunzai'}
 */
const BotName = (() => {
  if (/^karin/i.test(pluginName)) {
    return 'Karin'
  } else if (packageJson.name === 'yunzai-next') {
    return 'yunzai'
  } else if (Array.isArray(global.Bot?.uin)) {
    return 'TRSS-Yunzai'
  } else if (packageJson.dependencies.sequelize) {
    return 'Miao-Yunzai'
  } else {
    throw new Error('还有人玩Yunzai-Bot??')
  }
})()

async function checkCommitIdAndUpdateStatus() {
  const git = simpleGit({ baseDir: pluginRootPath })
  let result = {
    currentCommitId: null,
    remoteCommitId: null,
    latest: false,
    error: null,
    commitLog: null
  }

  // Timeout Promise
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timed out')), 5000)
  )

  // Main logic wrapped in a promise
  const mainLogic = (async () => {
    try {
      // Attempt to get the current commit ID (short version)
      const stdout = execSync(`git -C "${pluginRootPath}" rev-parse --short=7 HEAD`).toString().trim()
      result.currentCommitId = stdout

      // Perform git fetch
      await git.fetch()

      // Get the remote commit ID (short version)
      const remoteCommitId = (await git.revparse(['HEAD@{u}'])).substring(0, 7)
      result.remoteCommitId = remoteCommitId

      // Compare local and remote commit IDs
      if (result.currentCommitId === result.remoteCommitId) {
        result.latest = true
        const log = await git.log({ from: result.currentCommitId, to: result.currentCommitId })
        if (log && log.all && log.all.length > 0) {
          result.commitLog = log.all[0].message
        }
      }
    } catch (error) {
      console.error(`Failed to check update status: ${error.message}`)
      result.error = 'Failed to check update status'
    }

    return result
  })()

  // Race the main logic against the timeout
  try {
    return await Promise.race([mainLogic, timeoutPromise])
  } catch (error) {
    console.error(error.message)
    result.error = error.message
    return result
  }
}


let Version = {
  isV3,
  get version() {
    return currentVersion
  },
  get pluginVersion() {
    return pluginVersion
  },
  get yunzai() {
    return yunzaiVersion
  },
  get changelogs() {
    return changelogs
  },

  get BotName() {
    return BotName
  }
  ,
  async getUpdateStatus() {
    return await checkCommitIdAndUpdateStatus()
  }

}

export default Version
