'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/jidprep'));

    component.prepJID = function (jid, cb) {
        return component.sendIq({
            to: component.jid.domain,
            type: 'get',
            jidPrep: jid
        }, cb);
    };
};
