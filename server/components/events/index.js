/**
 *   Shared events emitter
 */

'use strict';

var EventEmitter = require('events');
var emitter = new EventEmitter();

exports.emitter = emitter;