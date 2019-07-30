module.exports = function (messenger, message) {
    if (messenger.send) {
        messenger.send(message)
    }
}
