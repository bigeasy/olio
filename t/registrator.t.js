require('proof')(18, prove)

function prove (okay) {
    var sent = [function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 0 ],
            message:  {
                method: 'initialize',
                socket: './socket',
                name: 'one',
                index: 0,
                properties: {},
                address: [ 'one', 0 ],
                count: 2,
                children: {}
            }
        }, 'register one 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 0 ],
            message:  {
                method: 'registered',
                name: 'one',
                index: 0,
                address: [ 'one', 0 ],
                count: 2
            }
        }, 'registered one 0 learns one 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 1 ],
            message:  {
                method: 'initialize',
                socket: './socket',
                name: 'one',
                index: 1,
                properties: {},
                address: [ 'one', 1 ],
                count: 2,
                children: {}
            }
        }, 'register one 1')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 0 ],
            message:  {
                method: 'registered',
                name: 'one',
                index: 1,
                address: [ 'one', 1 ],
                count: 2
            }
        }, 'registered one 0 learns one 1')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 1 ],
            message:  {
                method: 'registered',
                name: 'one',
                index: 0,
                address: [ 'one', 0 ],
                count: 2
            }
        }, 'registered one 1 learns one 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 1 ],
            message:  {
                method: 'registered',
                name: 'one',
                index: 1,
                address: [ 'one', 1 ],
                count: 2
            }
        }, 'registered one 1 learns one 1')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 0 ],
            message:  {
                method: 'created',
                name: 'one',
                addresses: [[ 'one', 0 ], [ 'one', 1 ]],
                count: 2
            }
        }, 'ready one to one 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 1 ],
            message:  {
                method: 'created',
                name: 'one',
                addresses: [[ 'one', 0 ], [ 'one', 1 ]],
                count: 2
            }
        }, 'ready one to one 1')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'two', 0 ],
            message:  {
                method: 'initialize',
                socket: './socket',
                name: 'two',
                index: 0,
                properties: {},
                address: [ 'two', 0 ],
                count: 1,
                children: {}
            }
        }, 'register two 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 0 ],
            message:  {
                method: 'registered',
                name: 'two',
                index: 0,
                address: [ 'two', 0 ],
                count: 1
            }
        }, 'registered one 0 learns two 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'two', 0 ],
            message:  {
                method: 'registered',
                name: 'one',
                index: 0,
                address: [ 'one', 0 ],
                count: 2
            }
        }, 'registered two 0 learns one 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 1 ],
            message:  {
                method: 'registered',
                name: 'two',
                index: 0,
                address: [ 'two', 0 ],
                count: 1
            }
        }, 'registered one 1 learns two 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'two', 0 ],
            message:  {
                method: 'registered',
                name: 'one',
                index: 1,
                address: [ 'one', 1 ],
                count: 2
            }
        }, 'registered two 0 learns one 1')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'two', 0 ],
            message:  {
                method: 'created',
                name: 'one',
                addresses: [[ 'one', 0 ], [ 'one', 1 ]],
                count: 2
            }
        }, 'ready one to two 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'two', 0 ],
            message:  {
                method: 'registered',
                name: 'two',
                index: 0,
                address: [ 'two', 0 ],
                count: 1
            }
        }, 'registered two 0 learns two 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 0 ],
            message:  {
                method: 'created',
                name: 'two',
                addresses: [[ 'two', 0 ]],
                count: 1
            }
        }, 'ready one to one 0')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'one', 1 ],
            message:  {
                method: 'created',
                name: 'two',
                addresses: [[ 'two', 0 ]],
                count: 1
            }
        }, 'ready two to one 1')
    }, function (address, message) {
        okay({
            address: address,
            message: message
        }, {
            address: [ 'two', 0 ],
            message:  {
                method: 'created',
                name: 'two',
                addresses: [[ 'two', 0 ]],
                count: 1
            }
        }, 'ready two to two 0')
    }]
    var Registrator = require('../registrator')
    var registrator = new Registrator({
        send: function () {
            sent.shift().apply(null, Array.prototype.slice.call(arguments))
        }
    }, {
        socket: './socket',
        children: {
            one: { workers: 2, properties: {} },
            two: { workers: 1, properties: {} }
        }
    })
    registrator.register('one', 0, [ 'one', 0 ])
    registrator.register('one', 1, [ 'one', 1 ])
    registrator.ready('one')
    registrator.ready('one')
    registrator.register('two', 0, [ 'two', 0 ])
    registrator.ready('two')
}
