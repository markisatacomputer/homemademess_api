/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var image = require('./image.model');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;

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
  socket.on('image:remove', function(id){
    destroy(id);
  });
  socket.on('image:edit', function(image){
    edit(image);
  });
  socket.on('image:save', function(id){
    save(id);
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

// Deletes an image from the DB and S3 bucket.
function destroy (id) {
  // find record
  image.findById(id, function (err, image) {
    if(err) { console.log (err); }
    else if (image.remove) {
      // delete record
      image.remove(function(err) {
        if(err) { console.log (err); }
      });
    }
  });
}
// Updates an image in the DB.
function edit (im) {
  var id = im.id;
  delete im.id;
  // find record
  image.findByIdAndUpdate(id, im, function (err, i) {
    if(err) { console.log (err); }
  });
}
// Saves an image in the DB by removing temporary.
function save (id) {
  console.log('save - id', id);
  // find record
  image.findByIdAndUpdate(id, {$unset: {temporary: ""}}, function (err, i) {
    if(err) { console.log (err); }
    console.log(i);
  });
}