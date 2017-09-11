/**
 *   Wrap AWS JS SDK
 */

'use strict';

var aws             = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var util            = require('util');
var emitter         = require('events').EventEmitter;
var gm              = require('gm');
var Q               = require('q');
var _               = require('lodash');
var exif            = require('./up.exif');
var events          = require('../../components/events');
var stream          = require('stream');

var Upload = function(file, image) {
  var self = this;

  this.file = file;
  this.IMG = image;
  this.derivativeSizes = [
    {name: 'sm', size: [300,600]},
    {name: 'md', size: [600,1200]},
    {name: 'lg', size: [800,1600]},
  ];
  this.S3 = [];
  this.progress = {};
  this.attempts = 0;
  this.errors = [];

  //  on create, send
  this.send();
  events.emitter.emit('upload.init', self.IMG._id);
}

//  Extend Prototype
Upload.prototype.constructor = Upload;

//  Inherit event emitter
util.inherits(Upload, emitter);

//  Error handler
Upload.prototype.handleErr = function (err, deferred) {
  var self = this;

  //  store error
  this.errors.push(err);
  //  reject promise
  if (deferred && typeof deferred.reject == 'function') {
    deferred.reject(this.errors);
  }
  //  emit
  events.emitter.emit('upload.error', self.IMG._id);
  //  retry
  if (this.attempts < 3) {
    this.send();
  }
}

//  Send Original File
Upload.prototype.send = function() {
  var self = this,
      deferred = Q.defer(),
      sending;

  //  make sure we've got something to send
  if (this.file && this.IMG._id) {

    self.attempts = self.attempts++;

    //  write stream to file
    sending = self.file
    //  send to S3
    .pipe(self.sendOriginal())
    //  send Derivatives
    .pipe(self.sendDerivatives())
    //  get exif data
    .pipe(self.getExif());

    sending.on('error', self.handleErr);

  }

  return deferred.promise;
}

//  S3 wrapper
Upload.prototype.sendToS3 = function(params, callback) {
  var self = this,
      pass = new stream.PassThrough(),
      defaultParams,
      S3;

  //  init params
  defaultParams = {
    Bucket: process.env.AWS_ORIGINAL_BUCKET,
    Key: this.IMG.id,
    Body: pass
  }
  if (params && typeof params == 'object') {
    Object.assign(defaultParams, params);
    params = defaultParams;
  } else {
    params = defaultParams;
  }

  //  create S3 connection
  S3 = new aws.S3.ManagedUpload({params: params});

  //  listen for progress
  //S3.on('httpUploadProgress', function (progress){ self.updateProgress(progress, this); });

  //  add to object store
  this.S3.push(S3);

  //  send
  S3.send( function(err, data) {
    if (err) {
      self.handleErr(err);
    }
    if (typeof callback == 'function') {
      callback(err, data);
    }
  });

  return pass;
}

//  send original to S3
Upload.prototype.sendOriginal = function() {
  var self = this;

  return this.sendToS3({
    Key: self.IMG.id
  }, function (err, data) {
    //
    self.original = true;
  });
}

//  Send Derivative File
Upload.prototype.sendDerivative = function(i) {
  var self = this,
      key;

  //  set key for this derivative
  key = self.IMG.id + '/' + self.derivativeSizes[i].name + '.jpg';

  //  send
  return this.sendToS3({
    Bucket: process.env.AWS_THUMB_BUCKET,
    Key: key,
    ACL: 'public-read'
  }, function (err, data) {
    if (err) { self.handleErr(err); }

    //  store location
    self.derivativeSizes[i].uri = data.Location;
    //  init IMG derivative storage
    if (!self.IMG.derivative) {
      self.IMG.derivative = [];
    }
    //  store derivative metadata
    self.IMG.derivative.push(self.derivativeSizes[i]);
    //  remove derivative template from self
    delete self.derivativeSizes[i];
    //  save record
    self.saveIMG();
  });

  return false;
}

Upload.prototype.sendDerivatives = function() {
  var self = this,
      pass = new stream.PassThrough(),
      resize;

  this.derivativeSizes.forEach( function(d, i) {
    gm(pass).size({bufferStream: true}, function (err, size) {
      //  determine resize dimension
      if (size.width < size.height) {
        self.derivativeSizes[i].height = d.size[1];
        var ratio = self.derivativeSizes[i].height/d.size[1];
        self.derivativeSizes[i].width = ratio*size.width;
      } else {
        self.derivativeSizes[i].width = d.size[0];
        var ratio = self.derivativeSizes[i].width/d.size[0];
        self.derivativeSizes[i].height = ratio*size.height;
      }
      //  process & send to S3
      this
      .resize(self.derivativeSizes[i].width, self.derivativeSizes[i].height)
      .compress('JPEG')
      .quality(60)
      .stream()
      .pipe(self.sendDerivative(i));
    });
  });

  return pass;
}

Upload.prototype.getExif = function () {
  var self = this;

  return exif.extractPipe(
    function (image) {
      Object.assign(self.IMG, image);
      self.saveIMG();
    }
  );
}

Upload.prototype.saveIMG = function() {
  var self = this;

  this.IMG.save( function(err, doc) {
    if (err) { self.handleErr(err); }
    if (doc) { self.IMG = doc; }

    //  check if we're done
    //  if so remove temporary stamp and save, then emit
    if (self.derivativeSizes.length == 0  && self.IMG.exif.length > 0 && self.original) {
      self.IMG.temporary = 0;
      self.saveIMG();
      events.emitter.emit('upload.complete', self.IMG._id);
      self.emit('complete');
    }
  });

}

Upload.prototype.abort = function () {
  _.forEach(this.S3, function(S){
    S.abort();
  });
  this.S3 = [];
  events.emitter.emit('upload.cancel', self.IMG._id);
}

module.exports = Upload;
