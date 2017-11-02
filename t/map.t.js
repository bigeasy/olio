require('proof')(4, prove)

function prove (okay) {
    var Map = require('../map')
    var map = new Map
    map.push([ 'app', 'command' ], { count: 1 })
    okay(map.get([ 'app', 'foo' ]), null, 'miss')
    okay(map.get([ 'app', 'command' ]), { count: 1 }, 'get')
    okay(map.get([ 'app', 'command' ]), { count: 1 }, 'get cached')
    okay(map.get([ 'app' ]), null, 'partial path miss')
}
