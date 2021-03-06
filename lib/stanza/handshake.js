'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'handshake',
        namespace: 'jabber:component:accept',
        element: 'handshake',
        topLevel: true,
        fields: {
           digest: types.text()
        }
    });
};
