'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/version'));

    component.disco.addFeature('jabber:iq:version');

    component.on('iq:get:version', function (iq) {
        component.sendIq(iq.resultReply({
            version: component.config.softwareVersion || {
                name: component.versionName || require('root-require')('package.json').name,
                version: component.versionNumber || require('root-require')('package.json').version
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
