/**
 * 是否是同一个路径
 * @param {*} a
 * @param {*} b
 */
function isEqualPath(a, b) {
    return path.relative(a, b) === ''
}

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
    return !path.isAbsolute(path)
}

/**
 * 是否合法的路径
 * @param {string} path
 */
// function isValidPath(path) {
//     return /[^.]/
// }
