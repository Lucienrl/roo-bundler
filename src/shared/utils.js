const nodePath = require('path')

const crossingArray = (arr, contains, unsafe) => {
    return (Array.isArray(arr) ? arr : []).filter((item) => {
        const suit = ~contains.indexOf(item)
        if (unsafe && !suit) {
            unsafe(item)
        }
        return suit
    })
}

const mergeArrNoRepeat = (...items) => Array.from(new Set(items.flat(1)))

/**
 * require时，是否是相对路径; isRelativePathWithRequire('qux/') => false
 * @param {string} path
 */
function isRelativePathWithRequire(path) {
    return /^\./.test(path)
}

/**
 * 是否是相对路径; isRelativePath('qux/') => true
 * @param {string} path
 */
function isRelativePath(path) {
    return !nodePath.isAbsolute(path)
}

function normalizeRelativeUrl(url) {
    return !isRelativePathWithRequire(url) && isRelativePath(url) ? `./${url}` : url.replace([])
}

/**
 * Parses values of the form "$=jQuery,React=react" into key-value object pairs.
 */
function parseMappingArgument(globalStrings, processValue) {
    const globals = {}
    globalStrings.split(',').forEach((globalString) => {
        let [key, value] = globalString.split('=')
        if (processValue) {
            const r = processValue(value, key)
            if (r !== undefined) {
                if (Array.isArray(r)) {
                    ;[value, key] = r
                } else {
                    value = r
                }
            }
        }
        globals[key] = value
    })
    return globals
}

module.exports = {
    crossingArray,
    mergeArrNoRepeat,
    isRelativePathWithRequire,
    normalizeRelativeUrl,
    parseMappingArgument,
}
