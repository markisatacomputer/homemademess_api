/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var events = require('../../components/events');

exports.register = function(socket) {
  var register = [ 'image.upload.init', 'image.upload.original.progress', 'image.upload.original', 'image.upload.exif', 'image.upload.derivatives.progress', 'image.upload.complete', 'image.upload.error', 'image.upload.abort', 'image.upload.cancel'];

  register.forEach( function(name, i, arr){
    events.emitter.removeAllListeners(name);
    events.emitter.on(name, function () {
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
