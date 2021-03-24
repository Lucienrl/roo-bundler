const program = require('commander')
const chalk = require('chalk')
const os = require('os')
const logService = require('./service/logService')

const portal = require('./core/portal')

function run(entryPath, prog) {
    if (!entryPath) {
        // 校验路径合法性
        logService.error('no command given!')
        process.exit(1)
    }

    const opts = prog.opts()

    portal({ ...opts, entryPath })
}

let version

try {
    version = require('../package.json').version
} catch (err) {}

program
    .version(version || 'unknown')
    .arguments('<entryPath>')
    // .description('test command', {
    //     entryPath: 'user to login',
    //     password: 'password for user, if required'
    //   })
    // deprecated
    // .option('-k, --keep', 'deprecated~')
    // .option('-p, --polyfill', 'deprecated~')

    // --tsconfig - Specify the path to a custom tsconfig.json

    // .option('--output-dir <value>', 'output dir~', 'dist')
    .option('-f, --formats  <formats...>', 'support "cjs" ,"es" ,"umd", "modern"')

    // .option('--globalTransformHelper', 'output umd bundle')

    // --sourcemap，暂不支持
    .option('-s, --sourcemap', 'Not currently supported~', false)

    // --define API_KEY=1234 - Replace constants with hard-coded values, 暂不支持
    .option('-d, --define [values...]', 'Not currently supported~')

    // --globals react=React jquery=$ - Specify globals dependencies, or 'none'
    .option('-g, --globals [globals...]', 'Not currently supported~')

    // --external /\.jpg$/i angular
    .option(
        '-ex, --external [values...]',
        "Specify external dependencies, or 'none' (default peerDependencies and dependencies in package.json)"
    )

    // --external-glob **/*.(jpg|png)
    .option('--external-glob [values...]', 'Glob mode such as --external')

    .option('--no-compress', 'Disable output compressing, Compress output using Terser.')
    .option('--no-tscheck', 'avoid doing any diagnostic checks on the code')
    .option(
        '--babel-helpers <babelHelpers>',
        'an informed decision is taken on how those babel helpers are inserted into the code. one of the follow: "runtime", "bundled", "global-runtime" or "external-runtime"',
        'runtime'
    )

    // --target - Specify your target environment (node or web), 暂只支持web
    .option('-t, --target [value]', 'Specify your target environment (node or web)', 'web')

    .action(run)

program.on('--help', () => {
    console.log(os.EOL, chalk.green('welcome your coming！'), os.EOL)
})

program.parse(process.argv)

function beforeExit(code) {
    console.log('Process beforeExit event with code: ', code)
}

process.on('beforeExit', beforeExit)
