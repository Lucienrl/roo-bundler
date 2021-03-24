const builtinModules = require('builtin-modules')
const camelCase = require('camelcase')

const { parseMappingArgument } = require('../../shared/utils')

module.exports = ({ pkg, node, external, globals, define, externalBabelRuntime }) => {
    // react -> React
    // camelCase('xx', { pascalCase: true })

    /** @type {(string|RegExp)[]} */
    // let external = ['dns', 'fs', 'path', 'url'].concat(options.entries.filter((e) => e !== entry))
    let bundleEx = ['dns', 'fs', 'path', 'url']

    if (node) {
        bundleEx = bundleEx.concat(builtinModules)
    }

    if (externalBabelRuntime) {
        bundleEx.push.apply(bundleEx, [/runtime-corejs3|core-js/, /@babel\/runtime|regenerator-runtime/])
    }

    const peerDeps = Object.keys(pkg.peerDependencies || {})

    const deps = Object.keys(pkg.dependencies || {}).concat(peerDeps)

    if (external === 'none') {
        // bundle everything (external=[])
    } else if (external) {
        bundleEx = bundleEx.concat(deps).concat(
            // CLI --external supports regular expressions:
            external
                .reduce((t, item) => t.concat(item.split(/,|\s+/)), [])
                .filter((item) => !!item.replace(/\s/, ''))
                
                // 正则兼容该模块下的内容(匹配`react`或`react/xxx`的形式)
                // 匹配react和react-native时，可以` --external react.*`
                .map((str) => new RegExp(`^${str}(/.*|$)`))
        )
    } else {
        // 默认匹配正则式，兼容react和react/xx
        bundleEx = bundleEx.concat(deps.map((item)=>new RegExp(`^${item}(/.*|$)`)))
    }

    // umd - No name was provided for external module 'react' in output.globals – guessing 'React'

    // let bundleGlobals = bundleEx.reduce((gbs, name) => {
    //     // Use raw value for CLI-provided RegExp externals:
    //     if (name instanceof RegExp) name = name.source

    //     // valid JS identifiers are usually library globals:
    //     if (name.match(/^[a-z_$][a-z0-9_\-$]*$/)) {
    //         gbs[name] = camelCase(name, { pascalCase: true })
    //     }
    //     return gbs
    // }, {})

    let bundleGlobals = []

    if (globals && globals !== 'none') {
        bundleGlobals = Object.assign(bundleGlobals, parseMappingArgument(globals))
    }

    let defines = {}

    if (define) {
        defines = Object.assign(defines, parseMappingArgument(define, toReplacementExpression))
    }

    // if (.test(request) || .test(request))

    return {
        bundleExternal: (id, parent, isResolved) => {
            return !!~bundleEx.findIndex((ex) => {
                if (ex instanceof RegExp) {
                    return ex.test(id)
                }
                // if (umd) {
                // No name was provided for external module 'react' in output.globals – guessing 'React'
                // }
                // console.log(`external ${name} guessing global name - ${gbs[name]}`)
                return ex === id
            })
        },
        bundleDefines: defines,
        bundleGlobals,
    }
}
