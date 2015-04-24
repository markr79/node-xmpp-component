'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/dataforms'));

    component.disco.addFeature('jabber:x:data');
    component.disco.addFeature('urn:xmpp:media-element');
    component.disco.addFeature('http://jabber.org/protocol/xdata-validate');
    component.disco.addFeature('http://jabber.org/protocol/xdata-layout');

    component.on('message', function (msg) {
        if (msg.form) {
            component.emit('dataform', msg);
        }
    });
};
