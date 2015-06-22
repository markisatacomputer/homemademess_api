/**
 *   Wrap AWS JS SDK
 */

'use strict';

var fs              = require('fs');
var aws             = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var EventEmitter    = require('events').EventEmitter;
var util            = require("util");
var managed         = require('./up.managed');
var gm              = require('gm');
var Q               = require('q');
var _               = require('lodash');

var Upload = function(file, IMG, params) {
  EventEmitter.call(this);
  this.file = file;
  this.IMG = IMG;
  this.id = IMG.id;
  this.params = {};
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
  var S3 = this.S3();
  //  send
  S3.send(function(err, data) {
    //  pass on event to server for socket
    self.emit('S3UploadEnd', self.id, data);
    logObjectUpload(err, data);
    if (callback) {
      callback(err, data);
    }
    //  no more need for the managed copy
    if (managed[self.id]) {
      delete managed[self.id];
    }
    // upload the derivatives then delete the tmp files
    self.upDerivatives(self.file, self.IMG).then( function() {
      fs.unlink(self.file, function (err) {
        if (err) { console.log(err); }
        console.log('successfully deleted '+self.file);
      });
      fs.unlink(self.file+'-oriented', function (err) {
        if (err) { console.log(err); }
        console.log('successfully deleted '+self.file+'-oriented');
      });
    });
  });
  //  add to managedUpload object for easy access
  managed[self.id] = S3;
}
// Send Derivatives to Bucket - private
var upDerivatives = function (file, IMG) {
  var all = [];
  //  all size w, h
  var sizes = {
    sm:[300,600],
    md:[600,1200],
    lg:[800,1600]
  };
  // pipe each thumb size to object
  _.forEach(sizes, function(thumbSize, sizeKey) {
    //  promise each derivative
    var deferred = Q.defer();
    all.push(deferred.promise);
    //  orient image
    imageOrient(file).then( function(size, err) {
      // save orientation fixed dimensions to file
      IMG.width = size.width;
      IMG.height = size.height;
      // use orientation fixed file to determine size
      var img = gm(file+'-oriented');
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
        //  set thumb bucket
        var hmmtestthumb = new aws.S3({params: {Bucket: process.env.AWS_THUMB_BUCKET, Key: IMG.id+'/'+sizeKey+'.jpg', ACL: "public-read" }});
        //  stream to object
        hmmtestthumb.upload({Body: stdout}, function(err, data) {
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
    });
  });

  return Q.all(all);
}

var imageOrient = function (file) {
  var size = 0;
  var deferred = Q.defer();
  var path = file+'-oriented';
  // write oriented image
  gm(file).autoOrient().write(path, function(err, stdout, stderr, command){
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
  })
  
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


module.exports = Upload;