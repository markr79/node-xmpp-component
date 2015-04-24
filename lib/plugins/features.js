'use strict';

var async = require('async');


module.exports = function (component/*, stanzas*/) {
    // stanzas.use(require('../stanza/streamFeatures'));

    component.features = {
        negotiated: {},
        order: [],
        handlers: {}
    };

    component.registerFeature = function (name, priority, handler) {
        this.features.order.push({
            priority: priority,
            name: name
        });
        this.features.order.sort(function (a, b) {
            if (a.priority < b.priority) {
                return -1;
            }
            if (a.priority > b.priority) {
                return 1;
            }
            return 0;
        });
        this.features.handlers[name] = handler.bind(component);
    };

    component.on('streamFeatures', function (features) {
        var series = [];
        var negotiated = component.features.negotiated;
        var handlers = component.features.handlers;

        component.features.order.forEach(function (feature) {
            var name = feature.name;
            if (features[name] && handlers[name] && !negotiated[name]) {
                series.push(function (cb) {
                    if (!negotiated[name]) {
                        handlers[name](features, cb);
                    } else {
                        cb();
                    }
                });
            }
        });

        async.series(series, function (cmd, msg) {
            if (cmd === 'restart') {
                component.transport.restart();
            } else if (cmd === 'disconnect') {
                component.emit('stream:error', {
                    condition: 'policy-violation',
                    text: 'Failed to negotiate stream features: ' + msg
                });
                component.disconnect();
            }
        });
    });
};
