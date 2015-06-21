/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');
var UpListener = require('./up.listener');

exports.register = function(socket) {
  UpListener.on('S3Progress', function(id, progress){
    socket.emit(id+':progress', progress);
  });
  UpListener.on('S3UploadEnd', function(id, complete) {
    socket.emit(id+':complete', complete);
  });
}
