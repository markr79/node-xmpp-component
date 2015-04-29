// jshint maxstatements:30, maxparams:10

'use strict';

var each = require('lodash.foreach');
var extend = require('lodash.assign');
// var isArray = require('lodash.isarray');

var jxt = require('jxt');
var WildEmitter = require('wildemitter');
var util = require('util');
var BPromise = require('bluebird');
var uuid = require('uuid');
var JID = require('xmpp-jid').JID;
var SRV = require('node-xmpp-core').SRV;
var Connection = require('node-xmpp-core').Connection
var crypto = require('crypto')
var async = require('async')
var debug = require('debug')('xmpp:component')

function Component(opts) {
  var self = this;
  WildEmitter.call(this);

  opts = opts || {};
  this.isConnected = false;

  this._initConfig(opts);
  this.versionName = this.config.name;
  this.versionNumber = this.config.version;

  this.stanzas = jxt.getGlobalJXT();
  this.jid = this.config.jid;

  this.sendQueue = async.queue(function(data, cb) {
    if (self.transport) {
      debug('sendQueue:1');
      if (typeof data !== 'string') {
        data = data.toString();
      }
      data = new Buffer(data, 'utf8').toString();

      self.emit('raw:outgoing', data);
      if (self.isConnected) {
        self.transport.send(data);
      }
    }
    cb();
  }, 1);

  this.stanzas = jxt.createRegistry();
  this.stanzas.use(require('jxt-xmpp-types'));
  this.stanzas.use(require('./stanza/message'));
  this.stanzas.use(require('./stanza/presence'));
  this.stanzas.use(require('./stanza/iq'));
  this.stanzas.use(require('./stanza/error'));
  this.stanzas.use(require('./stanza/handshake'));
  this.stanzas.use(require('./stanza/stream'));
  this.stanzas.use(require('./stanza/streamError'));
  this.use(require('./plugins/features'));

  this._setupComponentListeners();
  if (this.config.autoConnect) {
    this.connect(opts);
  }
}



util.inherits(Component, WildEmitter);

Component.prototype.NS_COMPONENT = 'jabber:component:accept'
Component.prototype.NS_STREAM = 'http://etherx.jabber.org/streams'

Object.defineProperty(Component.prototype, 'stream', {
  get: function() {
    return this.transport ? this.transport.stream : undefined;
  }
});

Component.prototype._setupConnectionListeners = function(con) {
  con = con || this.connection
  con
    .on('streamStart', this.emit.bind(this, 'streamStart'))
    .on('drain', this.emit.bind(this, 'drain'))
    .on('data', this.emit.bind(this, 'raw:incoming'))
    .on('stanza', this.onStanza.bind(this))
    .on('end', this.emit.bind(this, 'end'))
    .on('close', this.emit.bind(this, 'close'))
    .on('error', this.emit.bind(this, 'error'))
    .on('connect', this.emit.bind(this, 'connect'))
    .on('reconnect', this.emit.bind(this, 'reconnect'))
    .on('disconnect', this.emit.bind(this, 'disconnect'))
    .on('disconnect', this.emit.bind(this, 'offline'))
  if (con.startStream) {
    con.on('connect', function() {
      // Components start <stream:stream>, servers reply
      con.startStream()
    })
  }
}

Component.prototype._setupComponentListeners = function() {
  var self = this;
  self
    .on('stream:data', function(data) {
      var json = data.toJSON();
      var topLevelStanzas = ['handshake', 'message', 'presence', 'iq'];
      // if (self.config.vverbose) {
      //   debug('stanza', data._name, json);
      // } else if (self.config.verbose) {
      //   debug('stanza', data._name);
      // }

      if (data._name === 'handshake') {
        debug('stanza:3:emit:online')
        self.emit('online')
      } else if (data._name === 'iq') {
        json._xmlChildCount = 0;
        each(data.xml.childNodes, function(child) {
          if (child.nodeType === 1) {
            json._xmlChildCount += 1;
          }
        });
      }

      self.emit(data._eventname || data._name, json);

      if (topLevelStanzas.indexOf(data._name) !== -1) {
        self.emit('stanza', data);
      }

      if (json.id) {
        self.emit('id:' + json.id, json);
        self.emit(data._name + ':id:' + json.id, json);
      }

    })
    .on('streamStart', function(streamAttrs) {
      var digest = self._sha1Hex(streamAttrs.id + self.config.credentials.password)
      self.sendHandshake(digest)
    })
    .on('connect', function() {
      self.isConnected = true;
    })
    .on('disconnect', function() {
      self.isConnected = false;
      self.emit('offline');
    })
    .on('iq', function(iq) {
      var iqType = iq.type;
      var xmlChildCount = iq._xmlChildCount;
      delete iq._xmlChildCount;

      var exts = Object.keys(iq);

      if (iq.type === 'get' || iq.type === 'set') {
        // Invalid request
        if (xmlChildCount !== 1) {
          return self.sendIq(iq.errorReply({
            error: {
              type: 'modify',
              condition: 'bad-request'
            }
          }));
        }

        // Valid request, but we don't have support for the
        // payload data.
        if (!exts.length) {
          debug('Valid request, but we don\'t have support for the payload data.')
          return self.sendIq(iq.errorReply({
            error: {
              type: 'cancel',
              condition: 'feature-not-implemented'
            }
          }));
        }

        var iqEvent = 'iq:' + iqType + ':' + exts[0];
        if (self.callbacks[iqEvent]) {
          self.emit(iqEvent, iq);
        } else {
          // We support the payload data, but there's
          // nothing registered to handle it.
          debug('Valid request, but nothing registered to handle it.')
          self.sendIq(iq.errorReply({
            error: {
              type: 'cancel',
              condition: 'feature-not-implemented'
            }
          }));
        }
      }
    })
    .on('message', function(msg) {
      if (Object.keys(msg.$body || {}).length) {
        if (msg.type === 'chat' || msg.type === 'normal') {
          self.emit('chat', msg);
        } else if (msg.type === 'groupchat') {
          self.emit('groupchat', msg);
        }
      }
      if (msg.type === 'error') {
        self.emit('message:error', msg);
      }
    })
    .on('presence', function(pres) {
      var presType = pres.type || 'available';
      if (presType === 'error') {
        presType = 'presence:error';
      }
      self.emit(presType, pres);
    })
    .on('jingle:incoming', function(session) {
      debug('jingle:incoming', session.constructor.name);
      if (session.constructor.name === 'FileTransferSession') {
        session.receiver.on('progress', function(received, size) {
          self.emit('jingle:fileTransfer:progress', {
            session: session,
            received: received,
            size: size
          });
        });
        session.receiver.on('receivedFile', function(path, metadata) {
          self.emit('jingle:fileTransfer:done', {
            session: session,
            path: path,
            metadata: metadata
          });
        });
        session.receiver.on('receiveError', function(error) {
          self.emit('jingle:fileTransfer:error', {
            session: session,
            error: error
          });
        });
      }
    })
    .on('*', function(event , data, ext) {
      if (self.config.vverbose) {
         debug('event', event, data, ext);
      } else if (self.config.verbose) {
         debug('event', event);
      }
    });
}

Component.prototype._initConfig = function(opts) {
  var currConfig = this.config || {};

  this.config = extend({
    autoConnect: true,
  }, currConfig, opts);


  this.config.jid = new JID(this.config.jid);

  if (!this.config.server) {
    this.config.server = this.config.host;
  }

  this.config.NS_COMPONENT = this.config.NS_COMPONENT || this.NS_COMPONENT;
  this.config.NS_STREAM = this.config.NS_STREAM || this.NS_STREAM;

  if (this.config.password) {
    this.config.credentials = this.config.credentials || {};
    this.config.credentials.password = this.config.password;
  }
};

Component.prototype.use = function(pluginInit) {
  pluginInit(this, this.stanzas, this.config);
};

Component.prototype.nextId = function() {
  return uuid.v4();
};


Component.prototype.getCredentials = function() {
  var creds = this.config.credentials || {};
  var requestedJID = new JID(this.config.jid);

  var username = creds.username || requestedJID.local;
  var server = creds.server || requestedJID.domain;

  var defaultCreds = {
    username: username,
    password: this.config.password,
    server: server,
    host: server,
    realm: server,
    serviceType: 'xmpp',
    serviceName: server
  };

  var result = extend(defaultCreds, creds);
  return result;
};

Component.prototype.connect = function(opts) {
  var self = this;
  this._initConfig(opts);

  var trans = self.transport = new Connection(this.config);
  this._setupConnectionListeners(trans);
  /* For compatibility */
  self.connection = self.transport;

  if (typeof opts.jid === 'string') {
    this.transport.jid = new JID(opts.jid)
  } else {
    this.transport.jid = opts.jid
  }
  trans.on('*', function(event, data) {
    debug('event', event, data);
    self.emit(event, data);
  });

  this.transport.password = this.config.credentials.password
  this.transport.xmlns[''] = this.config.NS_COMPONENT
  this.transport.xmlns.stream = this.config.NS_STREAM
  this.transport.streamTo = this.connection.jid.domain


  this.transport.listen({
    socket: SRV.connect({
      services: [],
      domain: self.config.host,
      defaultPort: self.config.port,
      socket: self.config.socket
    })
  });
};

Component.prototype.disconnect = function() {
  if (this.transport) {
    this.transport.disconnect();
  } else {
    this.emit('disconnect');
  }
};

Component.prototype.send = function(data) {
  if (this.transport) {
    this.sendQueue.push(data);
    // this.transport.send(data);
  }
};

Component.prototype.sendMessage = function(data) {
  data = data || {};
  if (!data.id) {
    data.id = this.nextId();
  }

  data.from = data.from || this.config.jid;

  var Message = this.stanzas.getComponentMessage();
  var msg = new Message(data);

  this.emit('message:sent', msg.toJSON());
  this.send(msg);

  return data.id;
};

Component.prototype.sendPresence = function(data) {
  data = data || {};
  if (!data.id) {
    data.id = this.nextId();
  }
  data.from = data.from || this.config.jid;

  var Presence = this.stanzas.getComponentPresence();
  this.send(new Presence(data));

  return data.id;
};

Component.prototype.sendHandshake = function(digest) {
  var data = {};
  data.id = this.nextId();
  data.digest = digest;
  var Handshake = this.stanzas.getDefinition('handshake', 'jabber:component:accept');
  var handshake = new Handshake(data);
  /* Don't really need namespace */
  if (handshake.xml.attrs.xmlns) {
    delete handshake.xml.attrs.xmlns;
  }
  this.send(handshake);
};

Component.prototype.sendIq = function(data, cb) {
  var result, respEvent, allowed, dest, self = this;

  data = data || {};
  data.id = data.id || self.nextId();
  data.from = data.from || this.config.jid;


  var Iq = self.stanzas.getComponentIq();
  var iq = (!data.toJSON) ? new Iq(data) : data;

  if (data.type === 'error' || data.type === 'result') {
    self.send(iq);
    return;
  }

  dest = new JID(data.to);
  allowed = {};
  allowed[''] = true;
  allowed[dest.full] = true;
  allowed[dest.bare] = true;
  allowed[dest.domain] = true;
  allowed[self.jid.bare] = true;
  allowed[self.jid.domain] = true;

  respEvent = 'iq:id:' + data.id;
  result = new BPromise(function(resolve, reject) {
    var handler = function(res) {
      // Only process result from the correct responder
      if (!allowed[res.from.full]) {
        return;
      }

      // Only process result or error responses, if the responder
      // happened to send us a request using the same ID value at
      // the same time.
      if (res.type !== 'result' && res.type !== 'error') {
        return;
      }

      self.off(respEvent, handler);
      if (!res.error) {
        resolve(res);
      } else {
        reject(res);
      }
    };
    self.on(respEvent, 'session', handler);
  });

  self.send(iq);

  return result.timeout(self.config.timeout * 1000 || 15000)
    .catch(BPromise.TimeoutError, function() {
      throw {
        id: data.id,
        type: 'error',
        error: {
          condition: 'timeout'
        }
      };
    })
    .nodeify(cb);
}
Component.prototype.addNamespace = function(stanza) {
  if (!stanza.attrs.xmlns) {
    stanza.attrs.xmlns = this.config.NS_COMPONENT;
  }
  return stanza;
}

Component.prototype.onStanza = function(data) {
  var self = this,
    streamData, err;

  /* Add our default namespace */
  data = self.addNamespace(data);

  try {
    streamData = this.stanzas.build(data, true);
  } catch (e) {
    err = {
      message: 'Parsing error',
      code: e
    }
    this.emit('error:parse', err);
    return
  }
  self.emit('stream:data', streamData);
}

Component.prototype._sha1Hex = function(s) {
  var hash = crypto.createHash('sha1')
  hash.update(s)
  return hash.digest('hex').toLowerCase();
}

Component.prototype.end = function() {
    this.transport.end()
}

Component.Component = Component
module.exports = Component;
