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

var _               = require('lodash');

var Queue = function() {
  this.stack = [];
  this.files = {};
  this.current = false;
  this.up = require('./up.model');
  this.up.on('StackEnd', this.bubble);
}
Queue.prototype.constructor = Queue;
Queue.prototype.add = function (path, id) {
  // if nothing is being processed start upload
  if (this.current === false && this.files[id] === undefined) {
    //  get uploads started
    this.current = id;
    this.files[id] = path;
    this.sendCurrent();
  //  otherwise add item to the stack
  } else if (this.files[id] === undefined) {
    this.stack.push(id);
    this.files[id] = path;
  }
  console.log('stack', this.stack.length);
}
Queue.prototype.getCurrentPath = function () {
  //  if there is a current return path from this.files, otherwise false
  if (this.current && this.files[this.current]) {
    return this.files[this.current];
  } else {
    return false;
  }
}
//  Start an Upload
Queue.prototype.sendCurrent = function () {
  if (this.current) {
    var self = this;
    var Image = require('../image/image.model');
    //var i = new Image();
    Image.findById(self.current, function(err, IMG) {
      if (err) {
        console.log('DB Error - findById: ', err);
      } else {
        self.up.file = self.getCurrentPath();
        self.up.IMG = IMG;
        self.up.id = IMG.id;
        self.up.send();
      }
    });
  }
}
//  Move to next upload
Queue.prototype.bubble = function (path) {
  console.log('StackEnd', path);
  //  make sure nothing funny is going on
  if (this.current) {
    //  first clean files obj
    delete this.files[this.current];
    //  if stack contains items, send the first one
    if (this.stack.length > 0) {
      this.current = this.stack.shift();
      this.sendCurrent();
    } else  {
      this.current = false;
      console.log('stack empty');
    }
  } else {
    console.log('Something is wrong... Stack End passed path '+path+' this.current[path] is '+_.keys(this.current));
  }
}
//  If there is a current upload, and it's record id matches, abort it
Queue.prototype.abort = function (id) {
  var p = this.getCurrentPath();
  if (p !== false) {
    var img = this.current[p];
    var i = img.id ? img.id : img._id ? img._id : false;
    if (id === i) {
      this.up.abort();
    }
  }
}

module.exports = new Queue();