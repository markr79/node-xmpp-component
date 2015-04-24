'use strict';


module.exports = function (component) {
    component.disco.addFeature('urn:xmpp:attention:0');


    component.getAttention = function (jid, opts) {
        opts = opts || {};
        opts.to = jid;
        opts.type = 'headline';
        opts.attention = true;
        component.sendMessage(opts);
    };

    component.on('message', function (msg) {
        if (msg.attention) {
            component.emit('attention', msg);
        }
    });
};
