/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Queue  = require('./up.queue');
var Up     = require('./up.model');

exports.register = function(socket) {
  var register = [ 'image.upload.init', 'image.upload.original', 'image.upload.exif', 'image.upload.complete', 'image.upload.error', 'image.upload.abort', 'image.upload.cancel'];

  register.forEach( function(name, i, arr){
    Queue.removeAllListeners(name);
    Queue.on(name, function () {
      var args;
      //  get all arguments
      args = Array.apply(null, arguments);
      //  use colons for socket msg names
      name = name.replace(/\./g, ':');
      //  add name to args array
      args.unshift(name);
      //  send
      socket.emit.apply(socket, args);
      console.log.apply(this, args);
    });
  });

  register = [ 'image.upload.original.progress', 'image.upload.derivatives.progress' ]

  register.forEach( function(name, i, arr){
    Up.removeAllListeners(name);
    Up.on(name, function () {
      var args;
      //  get all arguments
      args = Array.apply(null, arguments);
      //  use colons for socket msg names
      name = name.replace(/\./g, ':');
      //  add name to args array
      args.unshift(name);
      //  send
      socket.emit.apply(socket, args);
      console.log.apply(this, args);
    });
  });

}
