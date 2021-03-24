const path = require('path')
const fs = require('fs')
const utils = require('../../shared/utils')

// umd模式下，require('ss/asd.png') -> 字符串
// 其他模式下保持继续以模块形式引入
const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
}

// TODO: 多种模式同时构建时，资源文件会起冲突，生成过得的资源缓存下来，路径解析其引入的路径
const normalizeSource = (source) =>
    source
        .replace(/\?.*$/, '')
        // 经过commonjs和node resolve插件处理后的路径可能会有前缀问题
        .replace('\u{0000}', '')

const matchImageSuffix = (source) => !!~Object.keys(mimeTypes).findIndex((type) => source.endsWith(type))

// resolvePath:{pathName,id}
const assetsInfoMap = {}

// `ASSET{{${id}}}`:id
const AssetsIdMap = {}

// id:url
const AssetsUrlMap = {}
/**
 * @param { boolean } umd
 * @param { "browser" | "auto"} mode
 */
module.exports = ({ umd, mode = 'auto' }) => {
    return {
        name: 'image-assets',
        resolveId(source, importer) {
            // console.log(matchImageSuffix(normalSource(source)))
            const normalSource = normalizeSource(source)

            const normalImporter = importer ? normalizeSource(importer) : ''

            // The importer is the fully resolved id of the importing module. When resolving entry points, importer will be undefined.
            if (matchImageSuffix(normalSource) && normalImporter) {
                const resolvePath = utils.isRelativePathWithRequire(normalSource)
                    ? path.resolve(path.dirname(normalImporter), normalSource)
                    : require.resolve(normalSource)

                // importer => "hell.png?commonjs-external"
                if (importer.endsWith('commonjs-external')) {
                    // Returning false signals that source should be treated as an external module
                    return false
                }

                let pathName

                // 防止重复生成文件
                if (!assetsInfoMap[resolvePath]) {
                    const id = this.emitFile({
                        type: 'asset',
                        // name需要避免冲突，否则报错，路径受`output.assetFileNames`影响
                        // assetFileNames -> default `assets/[name]-[hash][extname]`
                        name: path.basename(resolvePath),
                        // copy过去的文件内容，可以是一个字符串
                        source: fs.readFileSync(resolvePath),
                    })

                    pathName = `ASSET{{${id}}}`

                    assetsInfoMap[resolvePath] = {
                        pathName,
                        id,
                    }

                    AssetsIdMap[pathName] = id
                } else {
                    pathName = assetsInfoMap[resolvePath].pathName
                }

                if (umd) {
                    // 交给当前插件的load钩子处理
                    return pathName
                }

                // commonjs etc
                return {
                    id: pathName,
                    // 作为外部模块
                    external: true,
                }
            }

            // 其他插件解析
            return null
        },
        load(id) {
            // when resolveId return external, 不会进此钩子

            const referenceId = AssetsIdMap[id]

            if (referenceId && umd) {
                // this.emitFile({
                //     type: 'asset',
                //     fileName: 'index.html',
                //     source: `
                //         <!DOCTYPE html>
                //         <html>
                //         <head>
                //         <meta charset="UTF-8">
                //         <title>Title</title>
                //         </head>
                //         <body>
                //         <script src="${this.getFileName(ref1)}" type="module"></script>
                //         <script src="${this.getFileName(ref2)}" type="module"></script>
                //         <script src="${this.getFileName(ref3)}" type="module"></script>
                //         </body>
                //         </html>`,
                // })

                if (mode === 'browser') {
                    return `export default "ASSET{{${referenceId}}}"`
                } else {
                    // rollup.config.js 可以自定义URL的解析方式
                    // resolveFileUrl({fileName}) {
                    //     return `new URL('${fileName}', document.baseURI).href`;
                    //   }
                    // console.log(referenceId)
                    AssetsUrlMap[referenceId] = undefined
                    // await this.getFileName(referenceId)

                    return `export default import.meta.ROLLUP_FILE_URL_${referenceId}`
                }
            }
            // if (id.endsWith('?entry-proxy')) {
            //     const importee = id.slice(0, -'?entry-proxy'.length)
            //     // Note that this will throw if there is no default export
            //     return `export {default} from '${importee}';`
            // }
            // return null
        },
        // generateBundle() {
        //     // const xxxass = this.getFileName(xxxx)
        //     // console.log(xxxass)
        // },

        // (code: string, chunk: ChunkInfo, options: OutputOptions)
        renderChunk(code, chunk, outputOptions) {
            // const { fileName } = chunk
            // const { dir } = outputOptions

            // const chunkPath = path.resolve(dir, fileName)

            // TODO: 根据缓存，计算相对引入资源的路径
            // console.log(chunkPath)

            // const requireUrl = this.getFileName(id)

            if (umd) {
                // 兼容umd模式，获取一次
                Object.keys(AssetsUrlMap).forEach((id) => {
                    if (AssetsUrlMap[id] === undefined) {
                        AssetsUrlMap[id] = this.getFileName(id)
                    }
                })
            }

            // 获取
            return {
                code: code.replace(/ASSET\{\{.+?\}\}/g, (v) => {
                    const id = AssetsIdMap[v]
                    if (id) {
                        const cacheUrl = AssetsUrlMap[id]

                        let url = cacheUrl

                        if (!cacheUrl) {
                            url = this.getFileName(id)
                            AssetsUrlMap[id] = url
                        }

                        return utils.normalizeRelativeUrl(url)
                    }
                    return v
                }),
            }
        },
    }
}
