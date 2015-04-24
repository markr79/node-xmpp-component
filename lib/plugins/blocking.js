'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/blocking'));

    component.disco.addFeature('urn:xmpp:blocking');

    component.block = function (jid, cb) {
        return component.sendIq({
            type: 'set',
            block: {
                jids: [jid]
            }
        }, cb);
    };

    component.unblock = function (jid, cb) {
        return component.sendIq({
            type: 'set',
            unblock: {
                jids: [jid]
            }
        }, cb);
    };

    component.getBlocked = function (cb) {
        return component.sendIq({
            type: 'get',
            blockList: true
        }, cb);
    };

    component.on('iq:set:block', function (iq) {
        component.emit('block', {
            jids: iq.block.jids || []
        });
        component.sendIq(iq.resultReply());
    });

    component.on('iq:set:unblock', function (iq) {
        component.emit('unblock', {
            jids: iq.unblock.jids || []
        });
        component.sendIq(iq.resultReply());
    });
};
