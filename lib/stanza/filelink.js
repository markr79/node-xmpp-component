'use strict';

var NS = 'http://www.vidyo.com/ns/LmiXmppFileLink.xsd';
var TB_NS = 'http://www.vidyo.com/ns/LmiXmppThumbnail.xsd';


module.exports = function (stanza) {
    var types = stanza.utils;

    var FileLink = stanza.define({
        name: 'filelink',
        namespace: NS,
        element: 'filelink',
        fields: {
            name: types.textSub(NS, 'name'),
            desc: types.textSub(NS, 'desc'),
            size: types.numberSub(NS, 'size'),
            date: types.dateSub(NS, 'date'),
            sender: types.jidAttribute('sender'),
            ref: types.textSub(NS, 'ref')
        }
    });


    var Thumbnail = stanza.define({
        name: 'thumbnail',
        namespace: TB_NS,
        element: 'thumbnail',
        fields: {
            mimeType: types.attribute('mime-type'),
            width: types.numberAttribute('width'),
            height: types.numberAttribute('height'),
            data: types.text()
        }
    });

    stanza.withDefinition('hash', 'urn:xmpp:hashes:1', function (Hash) {
        stanza.extend(FileLink, Hash, 'hashes');
    });
    stanza.extend(FileLink, Thumbnail);


    stanza.withIq(function (Iq) {
        stanza.extend(Iq, FileLink);
    });
    stanza.withMessage(function (Message) {
        stanza.extend(Message, FileLink);
    });
};
