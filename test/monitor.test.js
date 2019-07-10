describe('monitor', () => {
    const assert = require('assert')
    const Monitor = require('../monitor')
    const Interrupt = require('interrupt').create('olio')
    const events = require('events')
    it('can monitor', async () => {
        const child = new events.EventEmitter
        const promise = Monitor(Interrupt, {}, child, { name: 'child', index: 1 })
        child.emit('exit', 0, null)
        await promise
    })
    it('can error', async () => {
        const child = new events.EventEmitter
        const promise = Monitor(Interrupt, {}, child, { name: 'child', index: 1 })
        child.emit('error', new Error)
        await promise
    })
})
