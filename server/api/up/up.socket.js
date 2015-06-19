/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');
var UpListener = require('./up.listener');

exports.register = function(socket) {
  UpListener.on('S3Progress', function(progress, id){
    console.log(progress, id);
    socket.emit(id+':progress', progress);
  });
  UpListener.on('S3UploadEnd', function(end, id) {
    socket.emit(id+':end', end);
  });
}
