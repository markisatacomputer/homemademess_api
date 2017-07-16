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
var exif            = require('./up.exif');

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
  this.progress = {};
},
logErr = function (err) {
  console.log(err);
}

//  inherit EventEmitter
util.inherits(Upload, EventEmitter);

//  Extend Prototype
Upload.prototype.constructor = Upload;



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
  //  listen for progress
  S3.on('httpUploadProgress', function (progress){ self.updateProgress(progress, this); });

  //  add to object store
  this.S3.push(S3);

  return S3;
}

//  Caluclate progress values of all concurrent uploads updated
Upload.prototype.updateProgress = function (progress, S3) {
  var key, bucket, previous, rightnow, acceptableProgress;

  key = progress.key;
  bucket = S3.service.config.params.Bucket;

  //  previous progress
  if (this.progress[key]) {
    previous = Math.round((this.progress[key].loaded/this.progress[key].total)*100);
  } else {
    previous = 0;
  }

  //  current progress
  this.progress[key] = progress;
  rightnow = Math.round((progress.loaded/progress.total)*100);

  //  send if enough progress has happened
  acceptableProgress = Number(process.env.ACCEPTABLE_PROGRESS);
  if ((rightnow - previous) > acceptableProgress) {
    switch(bucket){
      case process.env.AWS_ORIGINAL_BUCKET:
        this.emit('image.upload.original.progress', key, total);
        break;
      case process.env.AWS_THUMB_BUCKET:
        this.emit('image.upload.derivatives.progress', key, total);
        break;
    }
  }

  //  clean up
  if (rightnow == 100) {
    delete this.progress[key];
  }
}

//  Send Original File
Upload.prototype.sendOriginal = function(file, id) {
  var self = this;
  var deferred = Q.defer();
  //  make sure we've got something to send
  if (file && id) {
    var S3 = self.getS3({
      Bucket: process.env.AWS_ORIGINAL_BUCKET,
      Key: id,
      Body: file
    });
    //  send
    S3.send(function(err, data) {
      //  log and end our promise
      logAndResolve(err, data, deferred);
    });
  } else {
    console.error('Upload.upOriginal called without setting file or IMG.');
  }

  return deferred.promise;
}

Upload.prototype.sendDerivatives = function() {
  var self, deferred;

  self = this;
  deferred = Q.defer();

  self.convertOriginal().then(function(){
    self.imageOrient().then(function(){
      self.createThumbs().then(function(){
        var exifPromise = exif.extract(self.file, self.IMG);
        var derivativesPromise = self.upAllDerivatives();
        Q.all([exifPromise, derivativesPromise]).then( function(done) {
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
            deferred.resolve(self.IMG);
          },
          function(err){
            deferred.reject(err);
          });
        }, logErr);
      }, logErr);
    }, logErr);
  }, logErr);

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
  this.S3 = [];
}

var up = new Upload();

module.exports = up;
