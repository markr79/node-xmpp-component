'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/extdisco'));

    component.disco.addFeature('urn:xmpp:extdisco:1');

    component.getServices = function (jid, type, cb) {
        return this.sendIq({
            type: 'get',
            to: jid,
            services: {
                type: type
            }
        }, cb);
    };

    component.getServiceCredentials = function (jid, host, cb) {
        return this.sendIq({
            type: 'get',
            to: jid,
            credentials: {
                service: {
                    host: host
                }
            }
        }, cb);
    };
};
