module.exports = function (extractor) {
    var extract = extractor == null
        ? function ($) {
            return $.forwarded[0] || $.remoteAddress
        }
        : new Function('$', options.key)

    return function () {
        var structure = {
            forwarded: [],
            headers: request.headers,
            url: request.url,
            method: request.method,
            remoteAddress: request.socket.remoteAddress,
            remotePort: request.socket.remotePort,
            path: request.url.split('/').slice(1)
        }
        if (request.headers['x-forwarded-for']) {
            structure.forwarded = request.headers['x-forwarded-for'].split(/\s*,\s*/)
        }
        return extract(structure)
    }
}
