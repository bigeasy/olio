describe('dispatcher', () => {
    const assert = require('assert')
    it('can reject after destroy', () => {
        const Destructible = require('destructible')
        const destructible = new Destructible('dispatcher')
        const Dispatcher = require('../dispatcher')
        const dispatcher = new Dispatcher(destructible, null)
        destructible.destroy()
        dispatcher.fromParent({})
        dispatcher.fromParent({}, { destroy: () => {} })
    })
})
