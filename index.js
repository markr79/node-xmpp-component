'use strict';
var pjson = require('./package.json');
var Component = require('./lib/component');

exports.VERSION = pjson.version;
exports.JID = require('node-xmpp-core').JID;

module.exports = function(opts) {
  var component = new Component(opts);
  component.use(require('./lib/plugins'));
  return component;
};
