/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');

exports.register = function(socket) {
  Upload.on('S3Progress', function(id, progress){
    socket.emit(id+':progress', progress, this.total);
  });
  Upload.on('S3UploadEnd', function(id, complete) {
    socket.emit(id+':complete', complete);
  });
}
