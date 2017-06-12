/*
 *    Manage all S3 uploads in a synchonous manner
 *       1.  when an item is added to the queue, check to see if there is an upload in progress.  If not, start one with the first item in the queue.
 *       2.  when an upload is created, listen for it's end.  on end, delete that item and look to see if there's more items in the queue.  if so, start upload on first item in the queue.
 *       3.  on image:remove, check to see if present upload is being removed.  if so, abort and delete.
 *
 *
 *
 *
 *                Combine this and Upload class?
 *                    - refactor .send() to use http://documentup.com/kriskowal/q/#sequences
 */

'use strict';

var _   = require('lodash');
var Q   = require('q');

var Queue = function() {
  this.stack = [];
  this.files = {};
  this.current = 666;
  this.up = require('./up.model');
}
Queue.prototype.constructor = Queue;
//  add original to queue
Queue.prototype.add = function (path, id) {
  // if nothing is being processed start upload
  if (this.current === 666 && this.files[id] === undefined) {
    //  get uploads started
    this.current = id;
    this.files[id] = path;
    this.sendCurrent();
  //  otherwise add item to the stack
  } else {
    this.stack.push(id);
    this.files[id] = path;
  }
}
//  get temp path of current original being processed
Queue.prototype.getCurrentPath = function () {
  //  if there is a current return path from this.files, otherwise false
  if (this.current && this.files[this.current]) {
    return this.files[this.current];
  } else {
    return false;
  }
}
//  Initialize upload of current original
Queue.prototype.sendCurrent = function () {
  if (this.current) {
    var self = this;
    //  get db record
    var Image = require('../image/image.model');
    Image.findById(self.current, function(err, IMG) {
      if (err) {
        console.log('DB Error - findById: ', err);
      } else {
        //  Send this image
        self.up.file = self.getCurrentPath();
        self.up.IMG = IMG;
        self.up.id = IMG.id;
        self.up.send();
      }
    });
  }
}
//  Clean finished upload and move to next original
Queue.prototype.bubble = function (id) {
  var self = this;
  var deferred = Q.defer();

  //  make sure nothing funny is going on
  if (self.current === id) {
    //  first clean files obj
    delete self.files[self.current];
    //  if stack contains items, send the first one
    if (self.stack.length > 0) {
      self.current = self.stack.shift();

      //  clear params so they will be reset
      self.up.params = {};
      self.sendCurrent();
    //  if stack is empty, reset current indicator
    } else  {
      self.current = 666;
      self.up.emit('QueueDone');
    }
    deferred.resolve(self.current);
  } else {
    console.log('Something is wrong... Stack End passed id '+id+' this.current is '+self.current);
  }

  return deferred.promise;
}
//  If there is a current upload, and it's record id matches, abort it
Queue.prototype.abort = function (id) {
  var p = this.getCurrentPath();
  if (p !== false) {
    var i = this.current[p];
    //  if current queue, abort and move on
    if (id === i) {
      this.up.abort();
      //  move on to the next if it exists
      this.bubble(id);
    //  if not, remove from queue
    } else {
      delete this.files[id];
      _.pull(this.stack, id);
    }
  }
}

var ex = new Queue();

module.exports = ex;
