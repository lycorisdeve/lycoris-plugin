import Config from './Config.js'
import render from './lib/Render.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default {
  render,
  config: Config.All,
  sleep
}
