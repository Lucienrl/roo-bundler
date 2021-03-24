const fs = require('fs')
/**
 * e.g carryTuple(fs.mkdirSync,...args)
 * @param {function} action
 * @param {...any} args
 */
function carryTuple(action, ...args) {
    try {
        return [action(...args) || true, null]
    } catch (error) {
        //  console.log(`Error:删除文件夹失败(${filePath})`);
        return [null, error]
    }
}

/**
 * e.g  carryPromise(fs.mkdirSync,...args)
 * @param {Function} action
 * @param  {...any} args
 * @returns {Promise}
 */
function carryPromise(action, ...args) {
    return new Promise((resolve, reject) => {
        action(...args, (err, value) => {
            // mkdirSync
            if (err) {
                reject(err)
            }
            resolve(value)
        })
    })
}

module.exports = { carryTuple, carryPromise }
