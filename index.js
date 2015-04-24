'use strict';
var pjson = require('./package.json');

exports.VERSION = pjson.version;
exports.JID = require('node-xmpp-core').JID;
exports.Component = require('./lib/component');


exports.createComponent = function (opts) {
    var component = new exports.Component(opts);
    component.use(require('./lib/plugins'));

    return component;
};

module.exports = exports.createComponent
