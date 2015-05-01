'use strict';

var NS = 'http://www.vidyo.com/ns/LmiXmppFileLink.xsd';
var TB_NS = 'http://www.vidyo.com/ns/LmiXmppThumbnail.xsd';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/filelink'));

    component.disco.addFeature(NS);
    component.disco.addFeature(TB_NS);

    component.sendFilelink = function (jid, filelink, cb) {
        return this.sendIq({
            to: jid,
            type: 'set',
            filelink: filelink
        }, cb);
    };
};
