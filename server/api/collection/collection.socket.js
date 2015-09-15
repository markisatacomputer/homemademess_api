/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var collection = require('./collection.model');

exports.register = function(socket) {
  collection.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  collection.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('collection:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('collection:remove', doc);
}
