import Config from './Config.js'
import Render from './lib/Render.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default {
  Render,
  config: Config.All,
  sleep
}
