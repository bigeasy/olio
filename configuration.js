exports.properties = {
    namespace: '/var/this/that/the/other'
}

exports.configure = function () {
    return function (properties, callback) {
        var namespace = fs.readFileSync(properties.namespace, 'utf8')
        var kubernetes = process.env.KUBERNETES_SERVICE_HOST + ':' + process.env.KUBERNETES_SERVICE_PORT
        callback(null, {
            socket: './tmp/socket',
            children: {
                mingle: {
                    module: 'mingle.kubernetes/olio',
                    properties: {
                        format: 'http://%s:%d/',
                        kubernetes: properties.kubernetes,
                        namespace: namespace,
                        pod: 'addendum',
                        container: 'compassion'
                    }
                },
                compassion: {
                    module: 'compassion.colleague/olio',
                    node: { argv: { 'this-switch': '200m' } },
                    properties: {
                        bind: { port: 8486 },
                        discovery: { method: 'olio', name: 'mingle' }
                    }
                },
                diffuser: {
                    module: 'compassion.diffuser/olio',
                    properties: {
                        bind: { port: 8888 },
                        buckets: 1024,
                        id: process.env.HOSTNAME,
                        island: 'addendum',
                        compassion: { method: 'olio', name: 'compassion' }
                    }
                }
            }
        })
    }
}
