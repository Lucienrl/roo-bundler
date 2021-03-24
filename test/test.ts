#!/usr/bin/env ts-node-script

import * as os from 'os'

function hello(name: string) {
    return 'Hello, ' + name
}
const user = os.userInfo().username
console.log(`Result: ${hello(user)}`)
