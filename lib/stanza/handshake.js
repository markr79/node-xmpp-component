'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Handshake = stanza.define({
        name: 'handshake',
        namespace: 'jabber:component:accept',
        element: 'handshake',
        topLevel: true,
        fields: {
           digest: types.text()
        }
    });

    var toJSON = Handshake.prototype.toJSON;

    Handshake.prototype.toJSON = function () {
        var result = toJSON.call(this);
        return result;
    };
};
