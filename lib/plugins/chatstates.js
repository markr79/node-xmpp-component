'use strict';


module.exports = function (component) {
    component.disco.addFeature('http://jabber.org/protocol/chatstates');

    component.on('message', function (msg) {
        if (msg.chatState) {
            component.emit('chat:state', {
                to: msg.to,
                from: msg.from,
                chatState: msg.chatState
            });
            component.emit('chatState', {
                to: msg.to,
                from: msg.from,
                chatState: msg.chatState
            });
        }
    });
};
