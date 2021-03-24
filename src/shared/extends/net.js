const os = require('os')
const net = require('net')

/**
 * 根据接受到的请求，获取客户端的ip
 * @param {*} req
 */
function getClientNetIP(req) {
    let ip =
        req.headers['x-forwarded-for'] ||
        req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress ||
        ''
    if (ip.split(',').length > 0) {
        ip = ip.split(',')[0]
    }
    ip = ip.substr(ip.lastIndexOf(':') + 1, ip.length)
    // console.log('ip:' + ip)
    return ip
}

/**
 * 获取本机ip地址
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces()
    let result
    Object.keys(interfaces).find((key) => {
        let interface = interfaces[key]
        return !!interface.find((alias) => {
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                result = alias.address
                return true
            }
            return false
        })
    })
    return result
}

/**
 * 检查端口是否被占用
 * @param {*} port
 * @param {*} cb
 */
function isPortOccupied(port, cb = (err, port) => {}) {
    const server = net.createServer().listen(port)

    server.on('listening', () => {
        console.log(`the server is running on port ${port}`)
        server.close()
        cb(null, port)
        // console.log('port', port)
    })

    server.on('error', (err) => {
        cb(err)
        // if (err.code === 'EADDRINUSE') {
        //     portIsOccupied(port + 1, cb)
        //     console.log(`this port ${port} is occupied.try another.`)
        // } else {
        //     cb(err)
        // }
    })
}

module.exports = { getClientNetIP, getLocalIP, isPortOccupied }
