'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/oob'));
    component.disco.addFeature('jabber:x:oob');
};
