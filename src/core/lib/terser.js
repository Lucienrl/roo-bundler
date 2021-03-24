const { terser } = require('rollup-plugin-terser')

module.exports = ({ format, modern }, { compress, mangle } = {}) => {
    const os = require('os')

    const cpuNum = os.cpus().length

    return terser({
        compress: Object.assign(
            {
                keep_infinity: true,
                pure_getters: true,
                // Ideally we'd just get Terser to respect existing Arrow functions...
                // unsafe_arrows: true,
                passes: 10,
                // 去除debugger (default: true)
                drop_debugger: true,
                // 去除console (default: false)
                drop_console: true,
            },
            compress || {}
        ),
        output: {
            // By default, Terser wraps function arguments in extra parens to trigger eager parsing.
            // Whether this is a good idea is way too specific to guess, so we optimize for size by default:
            wrap_func_args: false,
            comments: false,
        },
        warnings: true,

        // Specify ECMAScript release: 5, 2015, 2016, etc.
        ecma: modern ? 9 : 5,

        // 删除未使用的变量或函数
        toplevel: modern || format === 'cjs' || format === 'es',

        mangle: mangle || {},
        numWorkers: cpuNum, //多线程压缩

        // include: [/^.+\.js$/],
        // exclude: ['node_modules/**'],
    })
}
