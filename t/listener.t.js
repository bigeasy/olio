require('proof')(1, prove)

function prove (okay) {
    var path = require('path')
    var Listener = require('../listener')
    var listener = new Listener({}, path.join(__dirname, 'socket'))
    okay(listener, 'constructor')
}
