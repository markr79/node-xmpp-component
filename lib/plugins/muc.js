// jshint maxstatements:30, maxparams:10

'use strict';

var each = require('lodash.foreach');
var JID = require('node-xmpp-core').JID;


module.exports = function (component, stanzas) {
    stanzas.use(require('../stanza/muc'));
    stanzas.use(require('../stanza/hats'));

    component.disco.addFeature('http://jabber.org/protocol/muc');
    component.disco.addFeature('jabber:x:conference');
    component.disco.addFeature('urn:xmpp:hats:0');

    component.joinedRooms = {};

    function rejoinRooms() {
        each(component.joinedRooms, function (nick, room) {
            component.joinedRooms[room] = false;
            component.joinRoom(room, nick);
        });
    }
    component.on('session:started', rejoinRooms);
    component.on('stream:management:resumed', rejoinRooms);

    component.on('message', function (msg) {
        if (msg.muc) {
            if (msg.muc.invite) {
                component.emit('muc:invite', {
                    from: msg.muc.invite.from,
                    room: msg.from,
                    reason: msg.muc.invite.reason,
                    password: msg.muc.password,
                    thread: msg.muc.invite.thread,
                    type: 'mediated'
                });
            }
            if (msg.muc.destroyed) {
                component.emit('muc:destroyed', {
                    room: msg.from,
                    newRoom: msg.muc.destroyed.jid,
                    reason: msg.muc.destroyed.reason,
                    password: msg.muc.destroyed.password
                });
            }
            if (msg.muc.decline) {
                component.emit('muc:declined', {
                    room: msg.from,
                    from: msg.muc.decline.from,
                    reason: msg.muc.decline.reason
                });
            }
        } else if (msg.mucInvite) {
            component.emit('muc:invite', {
                from: msg.from,
                room: msg.mucInvite.jid,
                reason: msg.mucInvite.reason,
                password: msg.mucInvite.password,
                thread: msg.mucInvite.thread,
                type: 'direct'
            });
        }

        if (msg.type === 'groupchat' && msg.subject) {
            component.emit('muc:subject', msg);
        }
    });

    component.on('presence', function (pres) {
        if (pres.joinMuc && pres.type === 'error') {
            component.emit('muc:error', pres);
        } else if (pres.muc) {
            var isSelf = pres.muc.codes && pres.muc.codes.indexOf('110') >= 0;
            if (pres.type === 'error') {
                component.emit('muc:error', pres);
            } else if (pres.type === 'unavailable') {
                component.emit('muc:unavailable', pres);
                if (isSelf) {
                    component.emit('muc:leave', pres);
                    delete component.joinedRooms[pres.from.bare];
                }
            } else {
                component.emit('muc:available', pres);
                if (isSelf && !component.joinedRooms[pres.from.bare]) {
                    component.emit('muc:join', pres);
                    component.joinedRooms[pres.from.bare] = pres.from.resource;
                }
            }
        }
    });

    component.joinRoom = function (room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.caps = this.disco.caps;
        opts.joinMuc = opts.joinMuc || {};

        this.sendPresence(opts);
    };

    component.leaveRoom = function (room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.type = 'unavailable';
        this.sendPresence(opts);
    };

    component.ban = function (room, jid, reason, cb) {
        component.setRoomAffiliation(room, jid, 'outcast', reason, cb);
    };

    component.kick = function (room, nick, reason, cb) {
        component.setRoomRole(room, nick, 'none', reason, cb);
    };

    component.invite = function (room, opts) {
        component.sendMessage({
            to: room,
            muc: {
                invites: opts
            }
        });
    };

    component.directInvite = function (room, opts) {
        opts.jid = room;
        component.sendMessage({
            to: opts.to,
            mucInvite: opts
        });
    };

    component.declineInvite = function (room, sender, reason) {
        component.sendMessage({
            to: room,
            muc: {
                decline: {
                    to: sender,
                    reason: reason
                }
            }
        });
    };

    component.changeNick = function (room, nick) {
        component.sendPresence({
            to: (new JID(room)).bare + '/' + nick
        });
    };

    component.setSubject = function (room, subject) {
        component.sendMessage({
            to: room,
            type: 'groupchat',
            subject: subject
        });
    };

    component.discoverReservedNick = function (room, cb) {
        component.getDiscoInfo(room, 'x-roomuser-item', function (err, res) {
            if (err) {
                return cb(err);
            }
            var ident = res.discoInfo.identities[0] || {};
            cb(null, ident.name);
        });
    };

    component.requestRoomVoice = function (room) {
        component.sendMessage({
            to: room,
            form: {
                fields: [
                    {
                        name: 'FORM_TYPE',
                        value: 'http://jabber.org/protocol/muc#request'
                    },
                    {
                        name: 'muc#role',
                        type: 'text-single',
                        value: 'participant'
                    }
                ]
            }
        });
    };

    component.setRoomAffiliation = function (room, jid, affiliation, reason, cb) {
        return this.sendIq({
            type: 'set',
            to: room,
            mucAdmin: {
                jid: jid,
                affiliation: affiliation,
                reason: reason
            }
        }, cb);
    };

    component.setRoomRole = function (room, nick, role, reason, cb) {
        return this.sendIq({
            type: 'set',
            to: room,
            mucAdmin: {
                nick: nick,
                role: role,
                reason: reason
            }
        }, cb);
    };

    component.getRoomMembers = function (room, opts, cb) {
        return this.sendIq({
            type: 'get',
            to: room,
            mucAdmin: opts
        }, cb);
    };

    component.getRoomConfig = function (jid, cb) {
        return this.sendIq({
            to: jid,
            type: 'get',
            mucOwner: true
        }, cb);
    };

    component.configureRoom = function (jid, form, cb) {
        if (!form.type) {
            form.type = 'submit';
        }
        return this.sendIq({
            to: jid,
            type: 'set',
            mucOwner: {
                form: form
            }
        }, cb);
    };

    component.destroyRoom = function (jid, opts, cb) {
        return this.sendIq({
            to: jid,
            type: 'set',
            mucOwner: {
                destroy: opts
            }
        }, cb);
    };

    component.getUniqueRoomName = function (jid, cb) {
        return this.sendIq({
            type: 'get',
            to: jid,
            mucUnique: true
        }, cb);
    };
};
