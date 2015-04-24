'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/logging'));

    component.disco.addFeature('', 'urn:xmpp:eventlog');

    component.sendLog = function (jid, logData) {
        component.sendMessage({
            to: jid,
            type: 'normal',
            log: logData
        });
    };
};
