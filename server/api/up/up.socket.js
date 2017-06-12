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
    socket.emit('image:upload:progress', id, progress, this.total);
  }

  var onStackBegin = function(id, img) {
    console.log('image:upload:begin', img._id);
    socket.emit('image:upload:begin', img);
  }

  var onStackEnd = function(id, img) {
    //  save and then emit
    image.update({_id: id}, {temporary: 0}, function (err, i) {
      if(err) {
        console.log ('image:upload:complete', err);
        socket.emit('image:upload:complete:error', err);
      } else {
        console.log('image:upload:complete', img._id);
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

  var onQueueDone = function() {
    console.log('upload:queue:complete');
    socket.emit('upload:queue:complete');
  }
  //  Remove listeners
  Upload.removeAllListeners('S3Progress');
  Upload.removeAllListeners('StackBegin');
  Upload.removeAllListeners('StackEnd');
  Upload.removeAllListeners('StackBroken');
  Upload.removeAllListeners('QueueDone');
  //  Attach listeners
  Upload.on('S3Progress', onS3Progress);
  Upload.on('StackBegin', onStackBegin);
  Upload.on('StackEnd', onStackEnd);
  Upload.on('StackBroken', function(err){
    socket.emit('image:upload:complete:error', err);
  });
  Upload.on('QueueDone', onQueueDone);

}
