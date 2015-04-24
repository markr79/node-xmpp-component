'use strict';


var NS = 'http://jabber.org/protocol/commands';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/command'));

    component.disco.addFeature(NS);
    component.disco.addItem({
        name: 'Ad-Hoc Commands',
        node: NS
    });


    component.getCommands = function (jid, cb) {
        return component.getDiscoItems(jid, NS, cb);
    };
};
