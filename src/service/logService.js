const chalk = require('chalk')
const os = require('os')

let streamLog

const log = (() => {
    // const consoleLog = console.log
    const processConsoleLog = console.log

    return (...args) => {
        processConsoleLog(...args)

        if (streamLog) {
            streamLog.log(...args)
        }
    }
})()

const success = (text, prefix = 'SUCCESS: ') => {
    const sucText = `${os.EOL}${prefix}${text}`
    log(chalk.hex('#28a745')(sucText))
}

const error = (text, prefix = 'Uncaught Error: ') => {
    const errText = `${os.EOL}${prefix}${text}`
    console.error(chalk.hex('#f55362')(errText))

    if (streamLog) {
        streamLog.error(errText)
    }
}

const warn = (text, prefix = 'WARNING: ') => {
    const warnText = `${os.EOL}${prefix}${text}`
    console.warn(chalk.hex('#ffc107')(warnText))

    if (streamLog) {
        streamLog.warn(warnText)
    }
}

const registerLogOutput = (logFilePath, errFilePath) => {
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' })

    const errStream = fs.createWriteStream(errFilePath, { flags: 'a' })

    streamLog = new console.Console(logStream, errStream)
}

const registerLogProxy = () => {
    // 重写log
    console.log = consoleLog
}

module.exports = {
    log,
    warn,
    error,
    success,
    registerLogOutput,
    registerLogProxy,
}
