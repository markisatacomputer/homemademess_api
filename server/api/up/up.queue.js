/*
 *    Manage all S3 uploads in a synchonous manner
 *       1.  when an item is added to the queue, pipe to local temp file and cloud storage object
 *       2.  track document and make changes on upload and exif extract events - pass updates to socket
 *       3.  track upload progress and pass event data to socket
 *       4.  when an upload is created, listen for it's end.  on end, delete that item and look to see if there's more items in the queue.  if so, start upload on first item in the queue.
 *       5.  on image:remove, check to see if present upload is being removed.  if so, abort and delete.
 *       6.  emit events:
 *             - image:upload:init
 *             - image:upload:original:progress
 *             - image:upload:original
 *             - image:upload:exif
 *             - image:upload:derivatives:progress
 *             - image:upload:derivatives
 *             - image:upload:complete
 *             - image:upload:error
 *             - image:upload:abort
 *
 */

'use strict';

var Q             = require('q');
var util          = require("util");
var fs            = require('fs');
var path          = require('path');
var events = require('../../components/events');

var Queue = function() {
  this.stack = {};
  this.ready = [];
  this.current = 666;
  this.up = require('./up.model');
}


Queue.prototype.constructor = Queue;

//  add original to queue
Queue.prototype.add = function (stream, img) {
  var self = this, deferred = Q.defer(), file, saveTo;

  //  INIT
  events.emitter.emit('image.upload.init', img);

  //  store stream and doc
  file = {
    stream: stream,
    image: img
  };

  //  pipe to temp file
  saveTo = path.join(process.env.UPLOAD_PATH, path.basename(img.filename));
  stream.pipe(fs.createWriteStream(saveTo));
  file.path = saveTo;

  //  put in the stack
  this.stack[img.id] = file;

  //  pipe to cloud storage
  this.up.sendOriginal(stream, img.id).then(
    function (data) {
      self.onOriginal(img.id, data);
      deferred.resolve(data);
    },
    function (err) {
      events.emitter.emit('image.upload.error', img.id, err);
      deferred.reject(err);
    }
  );

  return deferred.promise;
}

//  Initialize upload of current original
Queue.prototype.processCurrent = function () {
  var self = this, file = this.current;

  if (file !== 666){
    //  Configure up object to current file if not already
    if (this.up.IMG.id !== file.image.id) {
      this.up.params = {}
      this.up.file = file.path;
      this.up.IMG = file.image;
      this.up.id = file.image.id;
    } else {
      //  are we trying this again?
      if (typeof self.current.retry == 'undefined') {
        self.current.retry = 0;
      } else if (self.current.retry < 3) {
        self.current.retry++;
      } else {
        self.bubble();
      }
    }
    //  Try to process up to 3 times
    if (typeof self.current.retry == 'undefined' || self.current.retry < 3) {
      this.up.sendDerivatives().then(
        //  on success - save file and emit
        function (img) {
          img.temporary = 0;
          img.save(function(err){
            if (err) { events.emitter.emit('image.upload.error', file.image.id, err); }
            img.exif = [];  //  let's skip the exif
            events.emitter.emit('image.upload.complete', img);
            self.bubble();
          });
        },
        function (err) {
          events.emitter.emit('image.upload.error', file.image.id, err);
          self.processCurrent();
        }
      );
    }
  }
}

//  Move Queue item to ready for processing
Queue.prototype.onOriginal = function (id, data) {
  var file;

  events.emitter.emit('image.upload.original', id, data);
  if (this.stack[id]) {
    file = this.stack[id];
    delete this.stack[id];
    if (this.current === 666) {
      this.current = file;
      this.processCurrent();
    } else {
      this.ready.push(file);
    }
  }
}

//  Clean finished upload and move to next original
Queue.prototype.bubble = function () {
  //  if there are queue items ready, send the first one
  if (this.ready.length > 0) {
    this.current = this.ready.shift();
    this.processCurrent();
  //  if not, reset current indicator
  } else  {
    this.current = 666;
  }
}

Queue.prototype.onProgress = function (key, bucket, total) {
  var self = this;
  switch(bucket){
    case process.env.AWS_ORIGINAL_BUCKET:
      events.emitter.emit('image.upload.original.progress', key, total);
      break;
    case process.env.AWS_THUMB_BUCKET:
      events.emitter.emit('image.upload.derivatives.progress', key, total);
      break;
  }
}

//  If there is a current upload, and it's record id matches, abort it
Queue.prototype.abort = function (id) {
  var self = this;

  //  abort current and move on
  if (this.current !== 666) {
    if (this.current.image.id == id) {
      this.up.abort();
      events.emitter.emit('image.upload.abort', id);
      this.bubble(this.current.image.id, {});
    }
  } else {
  //  remove from ready queue items
    this.ready.forEach( function(r, i){
      if (r.image.id == id) {
        delete self.ready[i];
        events.emitter.emit('image.upload.cancel', id);
        return true;
      }
    });
    //  remove from uploading stack
    if (typeof this.stack[id] !== 'undefined') {
      delete this.stack[id];
      events.emitter.emit('image.upload.cancel', id);
      return true;
    }
  }
}

Queue.prototype.abortAll = function () {
  this.up.abort();
  this.current = 666;
  this.ready = [];
  this.stack = {};
}

var ex = new Queue();

module.exports = ex;
