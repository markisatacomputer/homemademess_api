/**
 *   Wrap AWS JS SDK
 */

'use strict';

var fs              = require('fs');
var aws             = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var EventEmitter    = require('events').EventEmitter;
var util            = require("util");
var gm              = require('gm');
var Q               = require('q');
var _               = require('lodash');

var Upload = function(file, IMG, params) {
  EventEmitter.call(this);
  this.file = typeof file!== 'undefined' ? file : 0;
  this.IMG = typeof IMG !== 'undefined' ?  IMG : {id: 0};
  this.id = this.IMG.id;
  this.params = typeof params !== 'undefined' ? params : {};
  this.upDerivatives = upDerivatives;
  this.imageOrient = imageOrient;
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
    var rightnow = Math.round((progress.loaded/progress.total)*100);
    var acceptableProgress = Number(process.env.ACCEPTABLE_PROGRESS);
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

  //  make sure we've got something to send
  if (self.file && self.IMG.id) {
    var S3 = this.S3();
    //  send
    S3.send(function(err, data) {
      //  pass on event to server for socket
      self.emit('S3UploadEnd', self.id, data);
      logObjectUpload(err, data);
      if (callback) {
        callback(err, data);
      }
      // upload the derivatives then delete the tmp files
      upDerivatives(self.file, self.IMG).then( function(data) {
        console.log('upDerivatives', data);
        //  delete original
        fs.unlink(self.file, function (err) {
          if (err) { console.log(err); }
          console.log('successfully deleted '+self.file);
          //  delete oriented
          fs.unlink(self.file+'-oriented', function (err) {
            if (err) { console.log(err); }
            console.log('successfully deleted '+self.file+'-oriented');
            //  this is the final final event - all uploads done - all tmp files clean
            self.emit('StackEnd', self.file);
          });
        });
      });
    });
  } else {
    console.error('Upload.send called without setting file or IMG.');
  }
}
Upload.prototype.abort = function () {
  this.S3.abort();
}
// Send Derivatives to Bucket - private
var upDerivatives = function (file, IMG) {
  var deferred = Q.defer();
  // all thumb promises
  var all = [];
  //  all size w, h
  var sizes = {
    sm:[300,600],
    md:[600,1200],
    lg:[800,1600]
  };

  //  orient image before thumb creation
  imageOrient(file).then( function(size) {
    console.log('orientating');
    // save orientation fixed dimensions to db
    IMG.width = size.width;
    IMG.height = size.height;
    // pipe each thumb size to object
    _.forEach(sizes, function(thumbSize, sizeKey) {
      //  promise each derivative
      all.push(createThumb(file+'-oriented', size, thumbSize, sizeKey));
    });
    //  promise the resolution of all thumb creation
    Q.all(all).then(function(success){
      deferred.resolve(success);
    }, function(err){
      deferred.reject(err);
    });
  }, function (err){
    console.log('orient error', err);
    deferred.reject(err);
  });
  
  return deferred.promise;
}

var createThumb = function (file, size, thumbSize, sizeKey) {
  console.log(size);
  var deferred = Q.defer();
  // use orientation fixed file to determine size
  var img = gm(file);
  // image is vertical we use height
  if (size.width < size.height) {
    // resize
    img.resize(null,thumbSize[1]);
    // store measurements for db
    var d = {height: thumbSize[1]};
    d.width = Math.round((thumbSize[1]/size.height)*size.width);
  // image is horizontal or square we use width
  } else {
    // resize
    img.resize(null, thumbSize[0]);
    // store measurements for db
    var d = {height: thumbSize[0]};
    d.width = Math.round((thumbSize[0]/size.height)*size.width);
  }

  img.compress('JPEG').quality(60).stream(function (err, stdout, stderr) {
    console.log("stream\r");
    //  set thumb bucket
    var thumb = new aws.S3({params: {Bucket: process.env.AWS_THUMB_BUCKET, Key: IMG.id+'/'+sizeKey+'.jpg', ACL: "public-read" }});
    thumb.on('httpUploadProgress', function(progress){
      console.log(IMG.id, sizeKey, progress);
    });
    //  stream to object
    thumb.upload({Body: stdout}, function(err, data) {
      console.log(IMG);
      //  write to db
      d.uri = data.Location;
      IMG.derivative.push(d);
      IMG.save(function (err) {
        if (err) {
          console.log('Error writing derivative to db: ', err);
        }
      });
      // resolve promise
      deferred.resolve(data);
      // log
      logObjectUpload(err, data);
    });
  });

  return deferred.promise;
}

var imageOrient = function (file) {
  var deferred = Q.defer();
  var path = file+'-oriented';
  // write oriented image
  gm(file).autoOrient().write(path, function(err, stdout, stderr, command){
    console.log('imageOrient');
    // log errors
    if (err) { deferred.reject(err); }
    if (stderr) { deferred.reject(stderr); }
    // return size of autoOriented image
    gm(path).size(function(err, value) {
      if (value) {
        deferred.resolve(value);
      } else {
        deferred.reject(err);
      }
    });
  });
  
  return deferred.promise;
}

// Log object upload result
var logObjectUpload = function (err, data) {
  if (err) { 
    console.log('Error: ', err); 
  } else {
    console.log('Upload successful: ', data);
  }
}


module.exports = new Upload();