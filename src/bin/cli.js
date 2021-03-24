#!/usr/bin/env node

// Node 8 supports native async functions - no need to use compiled code!
if (parseInt(process.versions.node, 10) < 8) {
    throw Error('node version have to greater or equal to 8!')
}

module.exports = require('../cli.js')
