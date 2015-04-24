'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/json'));
    component.disco.addFeature('urn:xmpp:json:0');
};
