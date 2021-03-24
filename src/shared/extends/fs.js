const beauty = require('./beauty')
const fs = require('fs')
const nodePath = require('path')

/**
 * 递归创建文件夹
 * @param {*} dir
 * @param {*} root
 */

function createDirRecursively(dir, root) {
    if (!dir || !root) {
        return
    }

    const paths = dir.split('/')
    let isExist = true

    const endTick = paths.length - 1

    paths.reduce((t, c, i) => {
        const p = nodePath.join(t, c)
        if (c === '.' || c === '..') {
            return p
        }

        const [response] = beauty.carryTuple(fs.statSync, p)

        if (!response) {
            // 不存在
            isExist = false
        }

        if (i === endTick && /\./.test(c)) {
            // 文件不做处理(这里也可以创建一个文件)
            return p
        }

        //如果该路径不存在且不是文件
        if (!response || !response.isDirectory()) {
            fs.mkdirSync(p)
        }
        return p
        //
    }, root)
    return isExist
}

/**
 * statSync
 * @param {string} path
 */
function statSync(path) {
    return beauty.carryTuple(fs.statSync, path)
}

module.exports = {
    createDirRecursively,
    statSync,
}
