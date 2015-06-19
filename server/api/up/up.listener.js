/**
 *   Pass all S3Upload events to socket.io
 *
 *     This way we use TWO listeners on ONE event emitter 
 *     to pass events on to the socket from countless event 
 *     listeners that each Upload object place on their individual 
 *     S3 Managed Upload instance.
 */

'use strict';

var EventEmitter    = require('events').EventEmitter;
var emitter = new EventEmitter();

module.exports = emitter;