const transformFastRest = require('./transform-fast-rest')

const merge = require('lodash.merge')
const { createBabelInputPluginFactory } = require('@rollup/plugin-babel')

// ‘.js,.jsx,.es6,.es,.mjs’
const { DEFAULT_EXTENSIONS } = require('@babel/core')

const utils = require('../../shared/utils')

const ES_MODULES_TARGET = {
    esmodules: true,
}

const mergeConfigItems = (babel, type, ...configItemsToMerge) => {
    const mergedItems = []

    configItemsToMerge.forEach((configItemToMerge) => {
        configItemToMerge.forEach((item) => {
            const itemToMergeWithIndex = mergedItems.findIndex(
                (mergedItem) => (mergedItem.name || mergedItem.file.resolved) === (item.name || item.file.resolved)
            )

            if (itemToMergeWithIndex === -1) {
                mergedItems.push(item)
                return
            }

            mergedItems[itemToMergeWithIndex] = babel.createConfigItem(
                [
                    mergedItems[itemToMergeWithIndex].file.resolved,
                    merge(mergedItems[itemToMergeWithIndex].options, item.options),
                ],
                {
                    type,
                }
            )
        })
    })

    return mergedItems
}

const createConfigItems = (babel, type, items) => {
    return items.map((item) => {
        let { name, value, ...options } = item
        value = value || [require.resolve(name), options]

        // babel.createConfigItem([path, opts, name], { type: "preset" | "plugin" })
        return babel.createConfigItem(value, { type })
    })
}

const environmentPreset = '@babel/preset-env'

// capture both @babel/env & @babel/preset-env (https://babeljs.io/docs/en/presets#preset-shorthand)
const presetEnvRegex = new RegExp(/@babel\/(preset-)?env/)

// using their own babelrc / babel config files.
// 拦截babel配置
module.exports = () => {
    return createBabelInputPluginFactory((babelCore) => {
        return {
            // Passed the plugin options.
            options({ custom: customOptions, ...pluginOptions }) {
                const babelRuntimeHelpers = /runtime/.test(customOptions.babelHelpers)

                return {
                    // Pull out any custom options that the plugin might have.
                    customOptions: {
                        ...customOptions,
                        babelRuntimeHelpers,
                    },

                    // Pass the options back with the two custom options removed.
                    pluginOptions: {
                        ...pluginOptions,
                        // TODO: 支持bundled
                        // runtime 或者 bundled
                        babelHelpers: babelRuntimeHelpers ? 'runtime' : 'bundled',

                        // cover options
                        // configFile: false,
                        // babelrc: false,

                        // 必须排除，否则runtime模式下会造成core-js的循环引用
                        exclude: [/core-js/, /@babel\/runtime/],

                        // 不压缩
                        compact: false,
                        extensions: ['.ts', '.tsx', ...DEFAULT_EXTENSIONS],
                    },
                }
            },

            config(config, { customOptions }) {
                const { node, modern, compress, babelHelpers, babelRuntimeHelpers } = customOptions

                // node版本
                const targets = node ? { node: '8' } : modern ? ES_MODULES_TARGET : undefined

                const runtimeOpts =
                    babelHelpers === 'global-runtime'
                        ? {
                              // 全局注入polyfill的情况
                              corejs: false,
                              helpers: false,
                              // 设置为false，全局注入regeneratorRuntime polyfill对象即可
                              regenerator: false,
                          }
                        : babelRuntimeHelpers
                        ? {
                              // proposals - 支持提案中的API，如Set等
                              corejs: { version: 3, proposals: true },
                              helpers: true,
                              regenerator: true,
                              // 使用 es modules helpers, 减少 commonJS 语法代码
                              // useESModules: true,
                          }
                        : null

                const defaultPlugins = createConfigItems(
                    babelCore,
                    'plugin',
                    [
                        {
                            name: '@babel/plugin-syntax-import-meta',
                        },
                        // !customOptions.typescript && {
                        //     name: '@babel/plugin-transform-flow-strip-types',
                        // },
                        !modern &&
                            !node && {
                                value: [
                                    transformFastRest,
                                    {
                                        // Use inline [].slice.call(arguments)
                                        helper: false,
                                        literal: true,
                                    },
                                    'transform-fast-rest',
                                ],
                            },
                        {
                            name: '@babel/plugin-proposal-class-properties',
                            loose: true,
                        },
                        {
                            name: '@babel/plugin-proposal-decorators',
                            legacy: true,
                        },
                        runtimeOpts && {
                            // 按需加载导入局部polyFill
                            name: '@babel/plugin-transform-runtime',
                            ...runtimeOpts,
                        },
                        {
                            name: 'babel-plugin-macros',
                        },
                    ].filter(Boolean)
                )

                // babel配置
                const babelOptions = config.options || {}

                const envIdx = (babelOptions.presets || []).findIndex((preset) =>
                    presetEnvRegex.test(preset.file.request)
                )

                const babelEnvExclude = modern || node ? ['transform-async-to-generator', 'transform-regenerator'] : []

                const defaultBabelEnvOpts = {
                    loose: true,
                    targets,
                    // 对ES6的模块文件不做转化，以便使用tree shaking、sideEffects等
                    modules: false,
                    // 不使用全局的polyfill
                    useBuiltIns: false,
                    // boolean
                    bugfixes: modern,
                }

                if (envIdx !== -1) {
                    const preset = babelOptions.presets[envIdx]

                    babelOptions.presets[envIdx] = babelCore.createConfigItem(
                        [
                            require.resolve(environmentPreset),
                            Object.assign(defaultBabelEnvOpts, preset.options, {
                                exclude: utils.mergeArrNoRepeat(
                                    babelEnvExclude,
                                    (preset.options && preset.options.exclude) || []
                                ),
                            }),
                        ],
                        {
                            type: `preset`,
                        }
                    )
                } else {
                    babelOptions.presets = createConfigItems(babelCore, 'preset', [
                        {
                            name: environmentPreset,
                            ...defaultBabelEnvOpts,
                            exclude: babelEnvExclude,
                        },
                    ])
                }

                // Merge babelrc & our plugins together
                babelOptions.plugins = mergeConfigItems(babelCore, 'plugin', defaultPlugins, babelOptions.plugins || [])
                babelOptions.presets = mergeConfigItems(
                    babelCore,
                    'preset',
                    createConfigItems(babelCore, 'preset', [
                        {
                            name: '@babel/preset-react',
                            // runtime: 'automatic',
                            // importSource: customOptions.jsxImportSource,
                            // pragma : "React.createElement",
                            // pragmaFrag : "React.Fragment",
                        },
                    ]),
                    babelOptions.presets || []
                )

                if (compress) {
                    babelOptions.generatorOpts = {
                        minified: true,
                        compact: true,
                        shouldPrintComment: (comment) => /[@#]__PURE__/.test(comment),
                    }
                }

                return babelOptions
            },
        }
    })
}
