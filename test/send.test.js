describe('send if', () => {
    const sendIf = require('../send')
    it('can not send if send not present', () => {
        sendIf({}, 'message')
    })
})
