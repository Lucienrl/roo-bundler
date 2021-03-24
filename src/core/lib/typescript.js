const typescript = require('rollup-plugin-typescript2')

const { dirname, resolve } = require('path')

function getDeclarationDir(options) {
    const { cwd, outputDir, pkg } = options

    const types = pkg.types || pkg.typings

    return types ? dirname(resolve(cwd, types)) : resolve(outputDir, './types')
}

let formatDup

// function tsDeclarationGeneration(params) {
//     const { spawn } = require('child_process')
//     const cwd = process.cwd()
//     require.resolve('typescript')
//     spawn(
//         'tsc',
//         [
//             options.entry,
//             '--emitDeclarationOnly',
//             '--declaration',
//             '--experimentalDecorators',
//             '--allowJs',
//             '--outDir',
//             getDeclarationDir(options),
//         ],
//         {
//             cwd,
//             env: {
//                 // 使用node_modules下的命令
//                 PATH: `${process.env.PATH}:${dirname(require.resolve('typescript/bin/tsc'))}`,
//                 stdio: ['inherit', 'inherit', 'inherit'],
//             },
//         }
//     )
// }

module.exports = (options) => {
    const { tscheck, format } = options
    // prevent for generating repeatedly
    const declaration = !(formatDup && formatDup !== format)

    const compilerOptions = declaration
        ? {
              declaration,
              declarationDir: getDeclarationDir(options),
          }
        : {
              declaration,
          }

    formatDup = format

    return typescript({
        // note：项目中依赖的typescript版本 会覆盖`roo-bundler`中dependencies的ts版本(^4.0.3)
        typescript: require('typescript'),

        // cacheRoot: `./node_modules/.cache/.rts2_cache_${format}`,

        useTsconfigDeclarationDir: true,
        // verbosity: 4,
        include: ['*.ts+(|x)', '**/*.ts+(|x)', '*.js'],
        exclude: ['*.d.ts', '**/*.d.ts'],
        // default true
        check: tscheck,
        tsconfigDefaults: {
            compilerOptions: {
                ...compilerOptions,
                // sourceMap: options.sourcemap,
                jsx: 'preserve',
                allowJs: true,
                // jsxFactory:
                //     // TypeScript fails to resolve Fragments when jsxFactory
                //     // is set, even when it's the same as the default value.
                //     options.jsx === 'React.createElement' ? undefined : options.jsx || 'h',
            },
            files: [options.entry],
        },
        // tsconfig: path.resolve(__dirname, './ts.json'),
        tsconfigOverride: {
            compilerOptions: {
                module: 'ESNext',
                target: 'esnext',
            },
        },
    })
}

// const typescript = require('@rollup/plugin-typescript')

// return typescript({
//     // ignore options by rollup
//     // 1. noEmitHelpers, importHelpers: The tslib helper module always must be used.

//     // 2. noEmit, emitDeclarationOnly: Typescript needs to emit code for the plugin to work with.

//     // 3. noResolve: Preventing Typescript from resolving code may break compilation

//     // 禁止tsconfig文件，or file path
//     // tsconfig: true,

//     // react , preserve
//     // 转换jsx; 这里设置preserve，则需引入acorn-jsx
//     jsx: 'preserve',

//     // allowJs: true,

//     // sourceMap:options.sourcemap,
//     // 将生成d.ts文件
//     declaration: true,

//     rootDir: path.resolve(process.cwd(), 'dist/types'),
//     // declarationDir: getDeclarationDir({ options, pkg }),
//     declarationDir: path.resolve(process.cwd(), 'dist/types'),

//     // 运行装饰器
//     experimentalDecorators: true,
//     outDir: './dist/',
//     rootDir: './',
//     // 直接覆盖compilerOptions选项
//     module: 'ESNext',
//     target: 'esnext',
//     // exclude: ['node_modules', 'babel.config.js', 'metro.config.js', 'jest.config.js'],
//     // files: [path.resolve(process.cwd(), './src/source/HandwrittenSignature.ts')],
//     // 不输出文件
//     // noEmit: false,
//     // 仅仅输出d.ts文件
//     // emitDeclarationOnly: false,
//     // 输出目录
//     // outDir: path.resolve(process.cwd(), 'dist'),
//     // force, use tslib
//     //  importHelpers: true,
// })
