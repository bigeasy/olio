require('proof')(3, (okay) => {
    const resolve = require('../resolve')
    okay(resolve({ path: './test/resolved.js' }, require).value, 1, 'resolve path with extension')
    okay(resolve({ path: './test/resolved' }, require).value, 1, 'resolve path no extension')
    okay(resolve({ module: './resolved' }, require).value, 1, 'resolve as module')
})
