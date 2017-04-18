/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');
var Queue  = require('./up.queue');
var _      = require('lodash');

exports.register = function(socket) {
  var onS3Progress = function (id, progress) {
    socket.emit(id+':progress', progress, this.total);
  }
  var onStackEnd = function(id, img) {
    //  debug
    console.log(id+':complete');
    socket.emit(id+':complete', img);
    socket.emit('image:complete', img);
    Queue.bubble(id).then(function(current){
      console.log('current',current);
      //  if the queue stack is empty, broadcast it
      if (current === 666) {
        socket.emit('all:complete');
      }
    });
  }
  //  Remove listeners
  Upload.removeAllListeners('S3Progress');
  Upload.removeAllListeners('StackEnd');
  //  Attach listeners
  Upload.on('S3Progress', onS3Progress);
  Upload.on('StackEnd', onStackEnd);

  //  Remove from queue and abort on remove from upload preview in client
  socket.on('image:remove', function(id){
    destroy(id, Queue);
  });
}

// Deletes an image from the Queue.
function destroy (id, que) {
  que.abort(id);
}
