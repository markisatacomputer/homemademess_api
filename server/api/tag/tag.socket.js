/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var tag = require('./tag.model');

exports.register = function(socket) {
  tag.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  tag.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('tag:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('tag:remove', doc);
}