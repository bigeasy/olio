var coalesce = require('extant')

module.exports = function (descendent, pids) {
    return function (message, handle) {
        if (message.to == null) {
            for (var i = 0, pid; (pid = pids[i]) != null; i++) {
                descendent.down([ pid ], 'olio:message', message.body, coalesce(handle))
            }
        } else {
            descendent.down([ pids[message.to.index % pids.length] ], 'olio:message', message, coalesce(handle))
        }
    }
}
