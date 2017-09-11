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

var Q      = require('q');
var Upload = require('./up.model');

var Queue = function() {
  this.stack = [];
  this.current = 666;
}


Queue.prototype.constructor = Queue;

//  add original to queue
Queue.prototype.add = function (stream, IMG) {
  var self     = this,
      deferred = Q.defer(),
      ready;

  //  put this upload in the stack
  ready = {
    file: stream,
    image: IMG
  }
  this.stack.unshift(ready);

  //  bubble
  this.bubble();
}

//  Clean finished upload and move to next original
Queue.prototype.bubble = function () {
  var self = this,
      ready;

  if (this.current === 666 && this.stack.length > 0) {
    //  Upload first in stack
    ready = this.stack.pop();
    this.current = new Upload(ready.file, ready.image);
    //  Listen for completion
    this.current.on('complete', function(){
      //  delete upload object
      delete self.current;
      //  reset
      self.current = 666;
      //  next
      self.bubble();
    });
  }
}

//  If there is a current upload, and it's record id matches, abort it
Queue.prototype.abort = function (id) {
  var self = this;

  //  abort current and move on
  if (this.current !== 666 && this.current.image.id == id) {
    this.current.abort();
    this.bubble();
  } else {
  //  remove from stack
    this.stack.forEach( function(r, i){
      if (r.image.id == id) {
        delete self.stack[i];
        return true;
      }
    });
  }
}

Queue.prototype.abortAll = function () {
  this.current.abort();
  this.current = 666;
  this.stack = [];
}

module.exports = new Queue();
