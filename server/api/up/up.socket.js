/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');
var Queue = require('./up.queue');

exports.register = function(socket) {
  var onS3Progress = function (id, progress) {
    socket.emit(id+':progress', progress, this.total);
  }
  var onStackEnd = function(id) {
    //  debug
    console.log(id+':complete');
    socket.emit(id+':complete');
    var current = Queue.bubble(id);
    //  if the queue stack is empty, broadcast it
    if (current === 666) {
      socket.emit('all:complete');
    }
  }
  //  Remove listeners
  Upload.removeAllListeners('S3Progress');
  Upload.removeAllListeners('StackEnd');
  //  Attach listeners
  Upload.on('S3Progress', onS3Progress); 
  Upload.on('StackEnd', onStackEnd);
}
