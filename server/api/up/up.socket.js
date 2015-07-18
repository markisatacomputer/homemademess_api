/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');
var Queue = require('./up.queue');

exports.register = function(socket) {
  Upload.on('S3Progress', function(id, progress){
    socket.emit(id+':progress', progress, this.total);
  });
  Upload.on('StackEnd', function(id) {
    socket.emit(id+':complete');
    var current = Queue.bubble(id);
    //  if the queue stack is empty, broadcast it
    if (current === 666) {
      socket.emit('all:complete');
    }
  });
}
