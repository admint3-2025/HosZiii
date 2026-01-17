const fs = require('fs')
const path = require('path')
const out = path.join(__dirname, 'fs-readlink-log.txt')
function writeLog(msg) {
  try {
    fs.appendFileSync(out, msg + '\n')
  } catch (e) {}
}

const origReadlink = fs.readlink
const origReadlinkSync = fs.readlinkSync

fs.readlink = function (p, ...args) {
  writeLog('[readlink] ' + String(p))
  writeLog(new Error().stack)
  try {
    return origReadlink.call(this, p, ...args)
  } catch (e) {
    writeLog('[readlink] caught: ' + e.message)
    // Workaround: when readlink fails (EISDIR/EINVAL) return the path string
    try { if (typeof args[0] === 'function') args[0](null, String(p)); } catch (e2) {}
    return String(p)
  }
}

fs.readlinkSync = function (p, ...args) {
  writeLog('[readlinkSync] ' + String(p))
  writeLog(new Error().stack)
  try {
    return origReadlinkSync.call(this, p, ...args)
  } catch (e) {
    writeLog('[readlinkSync] caught: ' + e.message)
    return String(p)
  }
}

writeLog('fswrap loaded at ' + new Date().toISOString())
