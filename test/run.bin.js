module.exports = function (destructible, olio) {
    olio.on('application:request', message => {
        olio.broadcast('serve', 'application:response', message)
    })
    destructible.destruct(() => {
        // This is an example of a test that I know is working only through
        // coverage. I'd have to add instrumentation to know it worked, also
        // maybe print my TAP test `ok` directly to standard out here.
        setImmediate(function () {
            olio.broadcast('serve', 'application:dropped', {})
            olio.send('serve', 0, 'application:dropped', {})
            olio.send('serve', 0, 'application:dropped', {}, {
                destroy: () => {}
            })
        })
    })
    olio.connect((header, inbox, outbox) => {
        return 1
    })
}
