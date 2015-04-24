'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/ping'));

    component.disco.addFeature('urn:xmpp:ping');

    component.on('iq:get:ping', function (iq) {
        component.sendIq(iq.resultReply());
    });

    component.ping = function (jid, cb) {
        return this.sendIq({
            to: jid,
            type: 'get',
            ping: true
        }, cb);
    };
};
