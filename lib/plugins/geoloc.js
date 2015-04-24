'use strict';



module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/geoloc'));

    component.disco.addFeature('http://jabber.org/protocol/geoloc');
    component.disco.addFeature('http://jabber.org/protocol/geoloc+notify');

    component.on('pubsub:event', function (msg) {
        if (!msg.event.updated) {
            return;
        }
        if (msg.event.updated.node !== 'http://jabber.org/protocol/geoloc') {
            return;
        }

        component.emit('geoloc', {
            jid: msg.from,
            geoloc: msg.event.updated.published[0].geoloc
        });
    });

    component.publishGeoLoc = function (data, cb) {
        return this.publish('', 'http://jabber.org/protocol/geoloc', {
            geoloc: data
        }, cb);
    };
};
