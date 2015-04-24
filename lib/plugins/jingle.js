// jshint maxstatements:30, maxcomplexity:12

'use strict';

var Jingle = require('jingle');


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/jingle'));
    stanzas.use(require('../stanza/rtp'));
    stanzas.use(require('../stanza/iceUdp'));
    stanzas.use(require('../stanza/file'));


    var jingle = component.jingle = new Jingle();

    jingle.capabilities.forEach(function (cap) {
        component.disco.addFeature(cap);
    });

    var mappedEvents = [
        'outgoing', 'incoming', 'accepted', 'terminated',
        'ringing', 'mute', 'unmute', 'hold', 'resumed'
    ];
    mappedEvents.forEach(function (event) {
        jingle.on(event, function (session, arg1) {
            component.emit('jingle:' + event, session, arg1);
        });
    });

    jingle.on('createdSession', function (session) {
        component.emit('jingle:created', session);
    });

    jingle.on('peerStreamAdded', function (session, stream) {
        component.emit('jingle:remotestream:added', session, stream);
    });

    jingle.on('peerStreamRemoved', function (session, stream) {
        component.emit('jingle:remotestream:removed', session, stream);
    });

    jingle.on('send', function (data) {
        component.sendIq(data, function (err) {
            if (err) {
                component.emit('jingle:error', err);
            }
        });
    });

    component.on('session:bound', function (jid) {
        jingle.jid = jid;
        jingle.selfID = jid.full;
    });

    component.on('iq:set:jingle', function (data) {
        jingle.process(data);
    });

    component.on('unavailable', function (pres) {
        var peer = pres.from.full;
        jingle.endPeerSessions(peer, true);
    });

    component.discoverICEServers = function (cb) {
        return this.getServices(component.config.server).then(function (res) {
            var services = res.services.services;
            var discovered = [];

            for (var i = 0; i < services.length; i++) {
                var service = services[i];
                var ice = {};
                if (service.type === 'stun' || service.type === 'stuns') {
                    ice.url = service.type + ':' + service.host;
                    if (service.port) {
                        ice.url += ':' + service.port;
                    }
                    discovered.push(ice);
                    component.jingle.addICEServer(ice);
                } else if (service.type === 'turn' || service.type === 'turns') {
                    ice.url = service.type + ':' + service.host;
                    if (service.port) {
                        ice.url += ':' + service.port;
                    }
                    if (service.transport && service.transport !== 'udp') {
                        ice.url += '?transport=' + service.transport;
                    }

                    if (service.username) {
                        ice.username = service.username;
                    }
                    if (service.password) {
                        ice.credential = service.password;
                    }
                    discovered.push(ice);
                    component.jingle.addICEServer(ice);
                }
            }

            return discovered;
        }).nodeify(cb);
    };
};
