'use strict';

var hashes = require('iana-hashes');


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/hash'));

    component.disco.addFeature('urn:xmpp:hashes:1');

    var names = hashes.getHashes();
    names.forEach(function (name) {
        component.disco.addFeature('urn:xmpp:hash-function-text-names:' + name);
    });
};
