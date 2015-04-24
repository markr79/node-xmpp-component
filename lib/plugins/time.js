'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/time'));

    component.disco.addFeature('urn:xmpp:time');

    component.getTime = function (jid, cb) {
        return this.sendIq({
            to: jid,
            type: 'get',
            time: true
        }, cb);
    };

    component.on('iq:get:time', function (iq) {
        var time = new Date();
        component.sendIq(iq.resultReply({
            time: {
                utc: time,
                tzo: time.getTimezoneOffset()
            }
        }));
    });
};
