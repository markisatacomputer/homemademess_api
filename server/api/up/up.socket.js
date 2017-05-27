/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Upload = require('./up.model');
var Queue  = require('./up.queue');
var image = require('../image/image.model');
var _      = require('lodash');

exports.register = function(socket) {

  var onS3Progress = function (id, progress) {
    socket.emit(id+':progress', progress, this.total);
  }

  var onStackEnd = function(id, img) {
    //  save and then emit
    image.update({_id: id}, {temporary: 0}, function (err, i) {
      if(err) {
        console.log (err);
      } else {
        socket.emit('image:upload:complete', img);
      }
    });

    Queue.bubble(id).then(function(current){
      //  emit when queue is empty
      if (current === 666) {
        socket.emit('image:upload:allcomplete');
      }
    });
  }
  //  Remove listeners
  Upload.removeAllListeners('S3Progress');
  Upload.removeAllListeners('StackEnd');
  //  Attach listeners
  Upload.on('S3Progress', onS3Progress);
  Upload.on('StackEnd', onStackEnd);

}
