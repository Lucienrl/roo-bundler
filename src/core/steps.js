const commonjs = require('@rollup/plugin-commonjs')
const { nodeResolve } = require('@rollup/plugin-node-resolve')

const typescript = require('./lib//typescript')
const babelFactory = require('./lib/babel-factory')
const bundler = require('./lib/bundler')
const os = require('os')

const camelCase = require('camelcase')
const imagePlugin = require('./lib/image-plugin')
const logService = require('../service/logService')
const externalResolver = require('./lib/external-resolver')

const terser = require('./lib/terser')
const jsx = require('acorn-jsx')

const path = require('path')

const { resolve } = path

// context -outputDir -output -format

const createConfig = (options) => {
    const {
        entry,
        compress,
        modern,
        node,
        format,
        useTypescript,
        name,
        // get filePath by package.json
        outputFileName,
        outputDir,
        babelHelpers,
    } = options

    const { bundleExternal, bundleGlobals, bundleDefines } = externalResolver({
        ...options,
        externalBabelRuntime: babelHelpers === 'external-runtime',
    })

    const config = {
        inputOptions: {
            acornInjectPlugins: [jsx()],
            // disable Rollup's cache for the modern build to prevent re-use of legacy transpiled modules:
            // cache,
            input: entry,
            external: bundleExternal,

            onwarn(warning, warn) {
                // const ignoredCircular = ['react-virtualized', 'core-js']

                // if (
                //     warning.code === 'CIRCULAR_DEPENDENCY' &&
                //     ignoredCircular.some((d) => warning.importer.includes(d))
                // ) {
                //     return
                // }

                // https://github.com/rollup/rollup/blob/0fa9758cb7b1976537ae0875d085669e3a21e918/src/utils/error.ts#L324
                if (warning.code === 'UNRESOLVED_IMPORT') {
                    console.log(
                        `Failed to resolve the module ${warning.source} imported by ${warning.importer}` +
                            `\nIs the module installed? Note:` +
                            `\n ↳ to inline a module into your bundle, install it to "devDependencies".` +
                            `\n ↳ to depend on a module via import/require, install it to "dependencies".`
                    )
                    return
                }

                warn(warning)
            },

            treeshake: {
                // 未使用的属性是否tree shake
                propertyReadSideEffects: false,
            },

            plugins: [
                // 需放于commonjs之前
                imagePlugin({ umd: format === 'umd' }),

                // 需放于commonjs之前
                useTypescript && typescript(options),

                // 解析依赖的模块路径
                nodeResolve({
                    // Specifies the properties to scan within a package.json
                    mainFields: ['module', 'jsnext:main', 'main'],
                    browser: !node,

                    // defaults + .jsx
                    extensions: ['.mjs', '.js', '.jsx', '.json', '.node', '.png'],

                    // If true, the plugin will prefer built-in modules (e.g. fs, path)
                    preferBuiltins: node,
                }),

                // rollup不识别commonjs规范，需要将commonjs转为es6
                commonjs({
                    // 当es模块中存在require语法混用时，需要开启
                    transformMixedEsModules: true,
                    // the ".ts" extension is required
                    extensions: ['.js', '.ts', '.jsx', '.tsx'],
                }),

                babelFactory()({
                    custom: { node, modern, compress, babelHelpers },
                }),

                compress && terser({ format, modern }),
                // {
                //     writeBundle(bundle) {
                //         config._sizeInfo = Promise.all(
                //             Object.values(bundle).map(({ code, fileName }) => {
                //                 if (code) {
                //                     return getSizeInfo(code, fileName, options.raw)
                //                 }
                //             })
                //         ).then((results) => results.filter(Boolean).join('\n'))
                //     },
                // },
            ].filter(Boolean),
        },
        outputOptions: {
            // 指定导出的模式 (auto, default, named, none)
            exports: 'auto',

            // Default: "assets/[name]-[hash][extname]"
            assetFileNames: 'assets/[name]-[hash][extname]',

            // external的paths aliases映射, 可以用于umd
            // paths: {
            //     d3: 'https://d3js.org/d3.v4.min'
            //  },

            globals: bundleGlobals,
            strict: false, // /options.strict === true,
            freeze: false,
            esModule: false,

            // sourcemap: options.sourcemap,

            // get banner() {
            //     return shebang[options.name]
            // },

            // name: options.name && options.name.replace(/^global\./, ''),
            // Necessary for iife/umd bundles that exports values in which case it is the global variable name representing your bundle.
            name,

            format: modern ? 'es' : format,

            // extend: /^global\./.test(options.name),
            dir: outputDir,

            entryFileNames: outputFileName || (modern ? '[name].esm.js' : '[name].[format].js'),
        },
    }
    return config
}

module.exports = async (opts) => {
    const { formats, cwd, formatOutputMap, pkg, entry, outputDir: defaultOutputDir } = opts

    let len = formats.length

    const umdIndex = formats.indexOf('umd')

    // 配合image-plugin插件，将umd放置最前,否则出错
    if (~umdIndex) {
        formats.splice(umdIndex, 1)

        formats.push('umd')
    }

    while (len--) {
        const format = formats[len]

        const filePath = formatOutputMap[formats]

        // Name for UMD export
        let guessName

        // require ora. 记录log，延后输出
        console.log(`* bundling '${format}' for production...`)

        if (opts.name) {
            guessName = camelCase(opts.name)
        } else {
            guessName = camelCase(pkg.name || path.basename(entry), { pascalCase: true })
            console.log(`Guessing opts.name for UMD export - ${guessName}`)
        }

        let outputDir = defaultOutputDir
        let outputFileName

        if (typeof filePath === 'string') {
            const absoluteFilePath = resolve(cwd, filePath)

            const { base, dir } = path.parse(absoluteFilePath)

            outputDir = dir

            outputFileName = /\.js$/.test(base) ? base : `${base.replace(/\.+$/g, '')}.js`
        }

        await bundler(
            createConfig({
                ...opts,
                outputDir,
                name: guessName,
                outputFileName,
                format,
                modern: format === 'modern',
            })
        )

        console.log(`------------ end   ------------ ${format}${os.EOL}`)
    }

    logService.success('build complete!')
}
