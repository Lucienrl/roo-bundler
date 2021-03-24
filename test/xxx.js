const crypto = require('crypto')
const hash = crypto.createHash('md5:8')

hash.on('readable', () => {
    // 哈希流只会生成一个元素。
    const data = hash.read()

    if (data) {
        // 16进制显示
        console.log(data.toString('hex'))
    }
})

hash.write('/xx/xxx/xxxxx/xxxxxx/x.d.ts')

hash.end()


// hash.update('/sada/asddsad/dasd/asd/dsd.d.ts')
// hash.digest('hex')