var dispatch = require('dispatch')
var Operation = require('operation')

function Router (options) {
    var broadcast = new Operation([ this, 'broadcast' ])
    options.broadcasts.forEach(function (route) {
        var dispatch = {}
        if (route[0] != '/') {
            var split = route.split(/\s+/, 2)
            split[0].split('|').forEach(function (method) {
                dispatch[method + ' ' + split[1]] = broadcast
            })
        } else {
            dispatch[route] = broadcast
        }
    })
    this.reactor = new Reactor(this, function (dispatcher) {
        options.broadcasts.forEach(function (broadcast) {
            dispatcher.dispatch(broadcast, 'broadcast')
        })
    })
}

Router.prototype.broadcast = function (request, response) {
    this._broadcast(request, response, this._rescue([ 'broadcast', this._request++ ]))
}

Router.prototype._broadcast = cadence(function (async, request, response) {
    var gathered = []
    async(function () {
        delta(async()).ee(request).on('data', []).on('end')
    }, function (data) {
        var buffer = Buffer.concat(data)
        if (buffer.length == 0) {
            buffer = null
        }
        for (var i = 0, I = this._olio.count(this._selector); i < I; i++) {
            async(function () {
                this._fetch(request, buffer, i, async())
            }, function (body, response) {
                gathered.push({ body: body, response: response })
            })
        }
    }, function () {
        var statusCode = gathered.filter(function (gather) {
            return ! gather.response.okay
        }).length == 0 ? 200 : 503
        var body = statusCode == 200
                 ? gathered.map(function (gather) { return gather.body })
                 : http.STATUS_CODES[503]
        response.writeHead(statusCode, { 'content-type': 'application/json' })
        response.end(JSON.stringify(body) + '\n')
    })
})

Router.prototype._fetch = restrictor(function (request, buffer, i, callback) {
    this._ua.fetch({
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: buffer,
        http: this._olio.select(this._selector, i)
    }, callback)
})

Router.prototype.select = function (request, response) {
    this._select(request, response, this._rescue([ 'middleware', this._request++ ]))
}

Router.prototype._select = restrictor(cadence(function (async, request, response) {
    this._olio.select(this._selector, String(extractor(request))).middleware(request, response, async())
}))
