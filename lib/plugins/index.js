// jshint maxstatements:30

'use strict';

module.exports = function (component) {
    // We always need this one first
    component.use(require('./disco'));

    component.use(require('./attention'));
    component.use(require('./blocking'));
    component.use(require('./bob'));
    component.use(require('./chatstates'));
    component.use(require('./command'));
    component.use(require('./correction'));
    component.use(require('./dataforms'));
    component.use(require('./delayed'));
    component.use(require('./escaping'));
    component.use(require('./extdisco'));
    component.use(require('./filelink'));
    component.use(require('./geoloc'));
    component.use(require('./hashes'));
    component.use(require('./idle'));
    component.use(require('./jidprep'));
    component.use(require('./jingle'));
    component.use(require('./json'));
    component.use(require('./logging'));
    component.use(require('./muc'));
    component.use(require('./oob'));
    component.use(require('./ping'));
    component.use(require('./private'));
    component.use(require('./time'));
    component.use(require('./version'));
};
