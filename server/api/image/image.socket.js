/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var image = require('./image.model');

exports.register = function(socket) {
  image.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  image.schema.post('update', function (doc) {
    onUpdate(socket, doc);
  });
  image.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('image:save', doc);
}
function onUpdate(socket, doc, cb) {
  socket.emit('image:update', doc);
}
function onRemove(socket, doc, cb) {
  socket.emit('image:remove', doc);
}