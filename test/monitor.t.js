require('proof')(2, async (okay) => {
    const assert = require('assert')
    const Monitor = require('../monitor')
    const Interrupt = require('interrupt').create('olio')
    const events = require('events')
    {
        const child = new events.EventEmitter
        const promise = Monitor(Interrupt, {}, child, { name: 'child', index: 1 })
        child.emit('exit', 0, null)
        await promise
        okay('monitored')
    }
    {
        const child = new events.EventEmitter
        const promise = Monitor(Interrupt, {}, child, { name: 'child', index: 1 })
        child.emit('error', new Error)
        await promise
        okay('errored')
    }
})
