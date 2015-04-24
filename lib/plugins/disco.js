// jshint maxstatements:28

'use strict';

var each = require('lodash.foreach');
var unique = require('lodash.uniq');

var JID = require('node-xmpp-core').JID;
var hashes = require('iana-hashes');


function generateVerString(info, hash) {
  var S = '',
    features = info.features.sort(),
    identities = [],
    formTypes = {},
    formOrder = [];

  each(info.identities, function(identity) {
    identities.push([
      identity.category || '',
      identity.type || '',
      identity.lang || '',
      identity.name || ''
    ].join('/'));
  });

  identities.sort();

  var idLen = identities.length;
  var featureLen = features.length;

  identities = unique(identities, true);
  features = unique(features, true);

  if (featureLen !== features.length || idLen !== identities.length) {
    return false;
  }


  S += identities.join('<') + '<';
  S += features.join('<') + '<';


  var illFormed = false;
  each(info.extensions, function(ext) {
    var fields = ext.fields;
    for (var i = 0, len = fields.length; i < len; i++) {
      if (fields[i].name === 'FORM_TYPE' && fields[i].type === 'hidden') {
        var name = fields[i].value;
        if (formTypes[name]) {
          illFormed = true;
          return;
        }
        formTypes[name] = ext;
        formOrder.push(name);
        return;
      }
    }
  });
  if (illFormed) {
    return false;
  }

  formOrder.sort();

  each(formOrder, function(name) {
    var ext = formTypes[name];
    var fields = {};
    var fieldOrder = [];

    S += '<' + name;

    each(ext.fields, function(field) {
      var fieldName = field.name;
      if (fieldName !== 'FORM_TYPE') {
        var values = field.value || '';
        if (typeof values !== 'object') {
          values = values.split('\n');
        }
        fields[fieldName] = values.sort();
        fieldOrder.push(fieldName);
      }
    });

    fieldOrder.sort();

    each(fieldOrder, function(fieldName) {
      S += '<' + fieldName;
      each(fields[fieldName], function(val) {
        S += '<' + val;
      });
    });
  });

  var ver = hashes.createHash(hash).update(new Buffer(S, 'utf8')).digest('base64');
  var padding = 4 - ver.length % 4;
  if (padding === 4) {
    padding = 0;
  }

  for (var i = 0; i < padding; i++) {
    ver += '=';
  }
  return ver;
}

function verifyVerString(info, hash, check) {
  var computed = generateVerString(info, hash);
  return computed && computed === check;
}


function Disco() {
  this.features = {};
  this.identities = {};
  this.extensions = {};
  this.items = {};
  this.caps = {};
}

Disco.prototype = {
  constructor: {
    value: Disco
  },
  addFeature: function(feature, node) {
    node = node || '';
    if (!this.features[node]) {
      this.features[node] = [];
    }
    this.features[node].push(feature);
  },
  addIdentity: function(identity, node) {
    node = node || '';
    if (!this.identities[node]) {
      this.identities[node] = [];
    }
    this.identities[node].push(identity);
  },
  addItem: function(item, node) {
    node = node || '';
    if (!this.items[node]) {
      this.items[node] = [];
    }
    this.items[node].push(item);
  },
  addExtension: function(form, node) {
    node = node || '';
    if (!this.extensions[node]) {
      this.extensions[node] = [];
    }
    this.extensions[node].push(form);
  }
};

module.exports = function(component, stanzas) {
  stanzas.use(require('../stanza/disco'));
  stanzas.use(require('../stanza/caps'));
  stanzas.use(require('../stanza/rsm'));


  component.disco = new Disco(component);

  component.disco.addFeature('http://jabber.org/protocol/disco#info');
  component.disco.addFeature('http://jabber.org/protocol/disco#items');
  component.disco.addIdentity({
    category: 'component',
    type: 'web'
  });

  component.registerFeature('caps', 100, function(features, cb) {
    this.emit('disco:caps', {
      from: new JID(this.jid.domain),
      caps: features.caps
    });
    this.features.negotiated.caps = true;
    cb();
  });

  component.getDiscoInfo = function(jid, node, cb) {
    return this.sendIq({
      to: jid,
      type: 'get',
      discoInfo: {
        node: node
      }
    }, cb);
  };

  component.getDiscoItems = function(jid, node, cb) {
    return this.sendIq({
      to: jid,
      type: 'get',
      discoItems: {
        node: node
      }
    }, cb);
  };

  component.updateCaps = function() {
    var node = this.config.capsNode || 'https://file.vidyo.io';
    var data = JSON.parse(JSON.stringify({
      identities: this.disco.identities[''],
      features: this.disco.features[''],
      extensions: this.disco.extensions['']
    }));

    var ver = generateVerString(data, 'sha-1');

    this.disco.caps = {
      node: node,
      hash: 'sha-1',
      ver: ver
    };

    node = node + '#' + ver;
    this.disco.features[node] = data.features;
    this.disco.identities[node] = data.identities;
    this.disco.extensions[node] = data.extensions;

    return component.getCurrentCaps();
  };

  component.getCurrentCaps = function() {
    var caps = component.disco.caps;
    if (!caps.ver) {
      return {
        ver: null,
        discoInfo: null
      };
    }

    var node = caps.node + '#' + caps.ver;
    return {
      ver: caps.ver,
      discoInfo: {
        identities: component.disco.identities[node],
        features: component.disco.features[node],
        extensions: component.disco.extensions[node]
      }
    };
  };

  component.on('presence', function(pres) {
    if (pres.caps) {
      component.emit('disco:caps', pres);
    }
  });

  component.on('iq:get:discoInfo', function(iq) {
    var node = iq.discoInfo.node || '';
    var reportedNode = iq.discoInfo.node || '';

    if (node === component.disco.caps.node + '#' + component.disco.caps.ver) {
      reportedNode = node;
      node = '';
    }

    component.sendIq(iq.resultReply({
      discoInfo: {
        node: reportedNode,
        identities: component.disco.identities[node] || [],
        features: component.disco.features[node] || [],
        extensions: component.disco.extensions[node] || []
      }
    }));
  });

  component.on('iq:get:discoItems', function(iq) {
    var node = iq.discoItems.node;
    component.sendIq(iq.resultReply({
      discoItems: {
        node: node,
        items: component.disco.items[node] || []
      }
    }));
  });

  component.verifyVerString = verifyVerString;
  component.generateVerString = generateVerString;

  // Ensure we always have some caps data
  component.updateCaps();
};
