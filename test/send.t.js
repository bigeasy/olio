require('proof')(1, (okay) => {
    const sendIf = require('../send')
    sendIf({}, 'do not send if send not present')
    okay('did not send')
})
