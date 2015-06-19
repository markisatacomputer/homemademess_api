/**
 *   Wrap AWS JS SDK
 */

'use strict';

var fs              = require('fs');
var aws             = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var EventEmitter    = require('events').EventEmitter;
var util            = require("util");

var Upload = function(file, IMG, params) {
  EventEmitter.call(this);
  this.file = file;
  this.IMG = IMG;
  this.id = IMG.id;
  this.params = {};
}
//  inherit EventEmitter
util.inherits(Upload, EventEmitter);
//  Extend Prototype
Upload.prototype.constructor = Upload;
//  Get S3 Connection
Upload.prototype.S3 = function() {
  var self = this;
  //  Set up params
  if (!this.params.Bucket) {
    this.params.Bucket = process.env.AWS_ORIGINAL_BUCKET;
  }
  if (!this.params.Key) {
    this.params.Key = this.IMG.id;
  }
  if (!this.params.Body) {
    this.params.Body = fs.createReadStream(this.file);
  }

  //  create S3 connection
  var S3 = new aws.S3.ManagedUpload({params: this.params});
  var percent = 0;
  S3.on('httpUploadProgress', function(progress){
    // check to make sure progress has changed significantly
    var rightnow = Math.round(progress.loaded/progress.total);
    var acceptableProgress = process.env.ACCEPTABLE_PROGRESS;
    if ((rightnow - percent) > acceptableProgress) {
      //  pass on progress event to server for socket
      self.emit('S3Progress', self.id, rightnow);
      percent = rightnow;
    }
  });
    
  return S3;
}
//  Send Original File
Upload.prototype.send = function(callback) {
  var self = this;
  var S3 = this.S3();
  //  send
  S3.send(function(err, data) {
    //  pass on event to server for socket
    self.emit('S3UploadEnd', self.id, data);
    if (callback) {
      callback(err, data);
    }
  });
}


module.exports = Upload;