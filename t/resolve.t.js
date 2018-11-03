require('proof')(3, prove)

function prove (okay) {
    var resolve = require('../resolve')
    okay(resolve({ path: './t/resolved.js' }, require).value, 1, 'resolve path with extension')
    okay(resolve({ path: './t/resolved' }, require).value, 1, 'resolve path no extension')
    okay(resolve({ module: './resolved' }, require).value, 1, 'resolve as module')
}
