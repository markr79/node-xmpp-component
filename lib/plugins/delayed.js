'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/delayed'));
    component.disco.addFeature('urn:xmpp:delay');
};
