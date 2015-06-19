/**
 *   Pass all S3Upload events to socket.io
 */

'use strict';

var EventEmitter    = require('events').EventEmitter;
var emitter = new EventEmitter();

module.exports = emitter;