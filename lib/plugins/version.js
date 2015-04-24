'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/version'));

    component.disco.addFeature('jabber:iq:version');

    component.on('iq:get:version', function (iq) {
        component.sendIq(iq.resultReply({
            version: component.config.softwareVersion || {
                name: 'file.video.io',
                version: require('root-require')('package.json').version
            }
        }));
    });

    component.getSoftwareVersion = function (jid, cb) {
        return this.sendIq({
            to: jid,
            type: 'get',
            version: true
        }, cb);
    };
};
