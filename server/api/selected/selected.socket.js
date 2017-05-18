/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Selected = require('./selected.controller');

exports.register = function(socket) {
  var register = ['image.select.on', 'image.select.off', 'image.select.all', 'image.select.none'];

  register.forEach( function(name, i, arr){
    if (Selected.emitter.listenerCount(name) === 0) {
      Selected.emitter.on(name, function () {
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
    }
  });

}
