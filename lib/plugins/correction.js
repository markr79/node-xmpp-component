'use strict';


module.exports = function (component) {
    component.disco.addFeature('urn:xmpp:message-correct:0');

    component.on('message', function (msg) {
        if (msg.replace) {
            component.emit('replace', msg);
            component.emit('replace:' + msg.id, msg);
        }
    });
};
