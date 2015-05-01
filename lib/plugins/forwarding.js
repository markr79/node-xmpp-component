'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/forwarded'));

    component.disco.addFeature('urn:xmpp:forward:0');
};
