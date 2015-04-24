'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/bob'));

    component.disco.addFeature('urn:xmpp:bob');

    component.getBits = function (jid, cid, cb) {
        return component.sendIq({
            to: jid,
            type: 'get',
            bob: {
                cid: cid
            }
        }, cb);
    };
};
