'use strict';

var _ = require('lodash');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var dreamObjects = new aws.S3();
var Image = require('../api/image/image.model');
var ExifImage = require('exif').ExifImage;
var Q = require('q');


function getExif(image) {
  var deferred = Q.defer();
  try {
    new ExifImage({ image : image}, function (error, exifData) {
      if (error)
        console.log('Error: '+ error.message);
      else
        deferred.resolve(exifData);
    });
  } catch (error) {
    console.log('Error: ' + error.message);
    deferred.reject(error);
  }
  return deferred.promise;
}


// Process upload
exports.index = function(req, res) {
  var file = req.files.file;
  console.log(file);
  getExif(file.path).then(function (exif){
    return res.json(200, exif);
  });
};