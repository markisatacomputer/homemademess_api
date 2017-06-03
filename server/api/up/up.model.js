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

// Log object upload result
var logAndResolve = function (err, data, deferred) {
  if (err) {
    console.log('Error: ', err);
    deferred.reject(err);
  } else {
    console.log(data);
    deferred.resolve(data);
  }
}

var Upload = function(file, IMG, params) {
  EventEmitter.call(this);
  this.original = this.file = typeof file!== 'undefined' ? file : 0;
  this.IMG = typeof IMG !== 'undefined' ?  IMG : {id: 0};
  this.derivative = {};
  this.derivatives = [];
  this.derivativeSizes = [
    {name: 'sm', size: [300,600]},
    {name: 'md', size: [600,1200]},
    {name: 'lg', size: [800,1600]},
  ];
  this.S3 = [];
  this.progress = {
    loaded: {},
    total: {}
  };
},
logErr = function (err) {
  console.log(err);
}
//  inherit EventEmitter
util.inherits(Upload, EventEmitter);
//  Extend Prototype
Upload.prototype.constructor = Upload;

Upload.prototype.send = function() {
  var self = this;
  self.convertOriginal().then(function(){
    self.imageOrient().then(function(){
      self.createThumbs().then(function(){
        var originalPromise = self.upOriginal();
        var derivativesPromise = self.upAllDerivatives();
        Q.all([originalPromise, derivativesPromise]).then( function(done) {
          //  cleanup
          var cleanPromise = [];
          cleanPromise.push(self.cleanup(self.file+'-oriented'));
          cleanPromise.push(self.cleanup(self.file));
          if (self.original != self.file) {
            cleanPromise.push(self.cleanup(self.original));
          }
          Q.all(cleanPromise).then(function(yes){
            //  empty S3 store
            self.S3 = [];
            self.progress.loaded = {};
            self.progress.total = {};
            //  emit
            self.emit('StackEnd', self.IMG.id, self.IMG);
          },
          function(err){
            self.emit('StackBroken', err);
          });
        }, logErr);
      }, logErr);
    }, logErr);
  }, logErr);
}

//  Get S3 Connection
Upload.prototype.getS3 = function(params) {
  var self = this;
  //  init params
  if (typeof(params) === 'undefined') {
    var params = {
      Bucket: process.env.AWS_ORIGINAL_BUCKET,
      Key: this.IMG.id,
      Body: fs.createReadStream(this.file)
    }
  }

  //  create S3 connection
  var S3 = new aws.S3.ManagedUpload({params: params});
  var percent = 0;
  S3.on('httpUploadProgress', function(progress){
    //  Use all concurrent uploads to calculate progress
    var loaded = self.updateProgress('loaded', progress.loaded ,this.body.path);
    var total = self.updateProgress('total', progress.total ,this.body.path);
    // check to make sure progress has changed significantly
    var rightnow = Math.round((loaded/total)*100);
    var acceptableProgress = Number(process.env.ACCEPTABLE_PROGRESS);
    if ((rightnow - percent) > acceptableProgress) {
      //  pass on progress event to server for socket
      self.emit('S3Progress', self.IMG.id, rightnow);
      percent = rightnow;
    }
  });

  //  add to object store
  this.S3.push(S3);

  return S3;
}

//  Caluclate progress values of all concurrent uploads updated
Upload.prototype.updateProgress = function (name, value, path) {
  var self = this;
  var r = 0;

  self.progress[name][path] = value;
  _.forEach(self.progress[name], function (v, key) {
    r += Number(v);
  });
  return r;
}

//  Send Original File
Upload.prototype.upOriginal = function() {
  var self = this;
  var deferred = Q.defer();
  //  make sure we've got something to send
  if (self.file && self.IMG.id) {
    var S3 = self.getS3();
    //  send
    S3.send(function(err, data) {
      //  pass on event to server for socket
      self.emit('S3UploadEnd', self.IMG.id, data);
      //  log and end our promise
      logAndResolve(err, data, deferred);
    });
  } else {
    console.error('Upload.upOriginal called without setting file or IMG.');
  }

  return deferred.promise;
}

Upload.prototype.upAllDerivatives = function(def) {
  var self = this;
  var deferred;
  // init promise
  if (typeof(def) === 'undefined') {
    deferred = Q.defer();
  } else {
    deferred = def;
  }

  //  init derivatives
  if (self.derivatives.length > 0) {
    self.derivative = self.derivatives.shift();
    // process the size  - thumb, upload, cleanup - then continue or resolve
    self.upDerivative().then( function(){
      self.cleanup(self.derivative.file).then( function(cleaned){
        //  save derivative to db
        self.IMG.derivative.push({
          height: self.derivative.height,
          width: self.derivative.width,
          name: self.derivative.name,
          uri: self.derivative.uri
        });
        self.IMG.save(function(err){
          if (err) {
            console.log('DB error', err);
          }
        });
        if (cleaned) {
          //  more?  then continue
          if (self.derivatives.length > 0) {
            self.upAllDerivatives(deferred);
          } else {
            self.derivative = {};
            deferred.resolve(true);
          }
        }
      }, function (e){
        deferred.reject(e);
      });
    });
  }

  return deferred.promise;
}

//  Send Original File
Upload.prototype.upDerivative = function() {
  var self = this;
  var params;
  var deferred = Q.defer();
  //  make sure we've got something to send
  if (self.derivative.file && self.IMG.id) {
    //  set params
    self.derivative.key = self.IMG.id + '/' + self.derivative.name + '.jpg';
    params = {
      Bucket: process.env.AWS_THUMB_BUCKET,
      Key: self.derivative.key,
      Body: fs.createReadStream(self.derivative.file),
      ACL: 'public-read'
    }
    var S3 = self.getS3(params);
    //  send
    S3.send( function(err, data) {
      if (data) {
        //  store uri in derivative
        self.derivative.uri =  data.Location;
        //  pass on event to server for socket
        self.emit('S3ThumbUploadEnd', self.IMG.id, data);
      }
      //  log and end our promise
      logAndResolve(err, data, deferred);
    });
  } else {
    console.error('Upload.upDerivative called without setting file or IMG.');
  }

  return deferred.promise;
}

//  Create all thumbs and store them in the object
Upload.prototype.createThumbs = function(derivs, def) {
  var self = this;
  var deferred, derivatives, derivative;
  //  init promise
  if (typeof(def) === 'undefined') {
    deferred = Q.defer();
  } else {
    deferred = def;
  }

  //  init derivatives
  if (typeof(derivs) === 'undefined') {
    //  make sure the object store is empty
    self.derivatives = [];
    //  clone template
    derivatives = _.clone(self.derivativeSizes, true);
    self.createThumbs(derivatives, deferred);
  } else {
    derivatives = derivs;
    //  create thumb and add result to object store
    self.derivative = derivatives.shift();
    self.createThumb(derivative, deferred.reject).then( function() {
      self.derivatives.push(self.derivative);
      //  are we done or do we keep going?
      if (derivatives.length > 0) {
        self.createThumbs(derivatives, deferred);
      } else {
        deferred.resolve(true);
      }
    });
  }

  return deferred.promise;
}

Upload.prototype.createThumb = function (derivative) {
  var self = this;
  var deferred = Q.defer();
  // use orientation fixed file to determine size
  var img = gm(self.file+ '-oriented');
  var thumbSize = self.derivative.size;
  var file = process.env.UPLOAD_PATH + self.IMG.id + '-' + self.derivative.name;

  // image is vertical we use height
  if (self.IMG.width < self.IMG.height) {
    // resize
    img.resize(null,thumbSize[1]);
    // store measurements for db
    self.derivative.height = thumbSize[1];
    self.derivative.width = Math.round((thumbSize[1]/self.IMG.height)*self.IMG.width);
  // image is horizontal or square we use width
  } else {
    // resize
    img.resize(null, thumbSize[0]);
    // store measurements for db
    self.derivative.height = thumbSize[0];
    self.derivative.width = Math.round((thumbSize[0]/self.IMG.height)*self.IMG.width);
  }

  img.compress('JPEG').quality(60).write(file, function (err, stdout, stderr) {
    self.derivative.file = file;
    if (err) {
      deferred.reject(err);
    }
    deferred.resolve(file);
  });

  return deferred.promise;
}

Upload.prototype.convertOriginal = function () {
  var self = this,
  deferred = Q.defer();

  //  make sure this is stored...
  self.original = self.file;

  if (typeof self.IMG.fileType != 'undefined' && self.IMG.fileType == 'JPEG') {
    //  if it's a JPEG, we're done
    deferred.resolve(self.original);
  } else {
    //  convert the file to JPEG
    self.file = self.file.split('.')[1] + '.jpg';
    gm(self.original).write(self.file, function(err) {
      if (err) { deferred.reject(err); }
      deferred.resolve(self.file);
    });
  }

  return deferred.promise;
}

Upload.prototype.imageOrient = function () {
  var self = this;
  var deferred = Q.defer();
  var path = self.file+'-oriented';

  // write oriented image
  gm(self.file).autoOrient().write(path, function(err) {
    // log errors
    if (err) { deferred.reject(err); }
    // return size of autoOriented image
    gm(path).size(function(err, value) {
      if (value) {
        // save orientation fixed dimensions to db
        self.IMG.width = value.width;
        self.IMG.height = value.height;
        self.IMG.save(function (err) {
          if (err) {
            console.log('Error writing derivative to db: ', err);
            deferred.reject(err);
          }
          deferred.resolve(value);
        });
        deferred.resolve(value);
      } else {
        deferred.reject(err);
      }
    });
  });

  return deferred.promise;
}


//  Remove a tmp file
Upload.prototype.cleanup = function(file) {
  var deferred = Q.defer();

  fs.unlink(file, function (err) {
    if (err) {
      deferred.reject(err);
    }
    deferred.resolve(true);
  });

  return deferred.promise;
}

Upload.prototype.abort = function () {
  _.forEach(this.S3, function(S){
    S.abort();
  });
}

var up = new Upload();

module.exports = up;
