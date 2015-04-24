'use strict';


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/private'));

    component.getPrivateData = function (opts, cb) {
        return this.sendIq({
            type: 'get',
            privateStorage: opts
        }, cb);
    };

    component.setPrivateData = function (opts, cb) {
        return this.sendIq({
            type: 'set',
            privateStorage: opts
        }, cb);
    };
};
