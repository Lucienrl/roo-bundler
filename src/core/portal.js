const utils = require('../shared/utils')
const steps = require('./steps')
const path = require('path')
const fsExtends = require('../shared/extends/fs')
const logService = require('../service/logService')

const PROCESS_CWD = process.cwd()

const verifyIncludes = (range, value, propertyName) => {
    if (!range.includes(value)) {
        logService.error(`- options.${propertyName} only support ${range.join(', ')} , please figure it out.`)
        process.exit(1)
    }
}

module.exports = function portal(opts) {
    const { entryPath } = opts

    const moduleEntry = path.resolve(PROCESS_CWD, entryPath)

    const [fileStat] = fsExtends.statSync(moduleEntry)

    if (!fileStat) {
        logService.error(`Cannot find module '${moduleEntry}'`)
        process.exit(1)
    }

    const isDirectory = fileStat.isDirectory()

    if (isDirectory) {
        logService.error(`entry can not be dir ,but file explicitly`)
        process.exit(1)
    }

    // todo: 支持指定package.json
    const pkgPath = path.join(PROCESS_CWD, 'package.json')

    const [pkgStat] = fsExtends.statSync(pkgPath)

    const pkg = pkgStat ? require(pkgPath) : {}

    // {
    //     "main": "dist/foo.js",            // CommonJS bundle
    //     "umd:main": "dist/foo.umd.js",    // UMD bundle
    //     "module": "dist/foo.m.js",        // ES Modules bundle
    //     "esmodule": "dist/foo.modern.js", // Modern bundle
    //     "types": "dist/foo.d.ts"          // TypeScript typings directory
    //   }

    const formatOutputMap = {
        cjs: pkg.main,
        es: pkg.module,
        modern: pkg.esmodule,
        umd: pkg['umd:main'],
    }

    const { target, babelHelpers } = opts

    verifyIncludes(['web', 'node'], target, 'target')

    verifyIncludes(['runtime', 'bundled', 'global-runtime', 'external-runtime'], babelHelpers, 'babelHelpers')

    const validFormats = ['cjs', 'es', 'modern', 'umd']

    const formats = utils.crossingArray(opts.formats, validFormats, (format) => {
        logService.error(`illegal format "${format}", require some of the following: ${validFormats.join()}`)
        process.exit(1)
    })

    // TODO: GET browserlist
    const topOptions = {
        ...opts,
        entry: moduleEntry,
        pkg,
        node: target === 'node',
        formats: formats.length ? formats : ['cjs', 'umd', 'es'],
        cwd: PROCESS_CWD,
        formatOutputMap,
        outputDir: path.resolve(PROCESS_CWD, 'dist'),
        useTypescript: ['.ts', '.tsx'].includes(path.extname(moduleEntry)),
    }

    steps(topOptions)
}
