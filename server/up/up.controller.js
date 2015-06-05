'use strict';

var _ = require('lodash');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var dreamObjects = new aws.S3();
var Image = require('../api/image/image.model');
var Exif = require('../api/exif/exif.model');
var ExifImage = require('exif').ExifImage;
var Q = require('q');

// Get EXIF metadata
function getExif(image) {
  var deferred = Q.defer();
  try {
    new ExifImage({ image : image}, function (error, exifData) {
      if (error)
        console.log('Error: '+ error.message);
        // node-exif doesn't work outside of jpg so let's try something else if this fails...
      else
        deferred.resolve(exifData);
    });
  } catch (error) {
    console.log('Error: ' + error.message);
    deferred.reject(error);
  }
  return deferred.promise;
}
// Save individual exif tag
function saveExifTag(newexif,exifvalue){
  var deferred = Q.defer();
  // does this exif exist?
  var query  = Exif.where(newexif);
  query.findOne( function (err, found) {
    if (found !== null) {
      //  YES - resolve promise now
      deferred.resolve({ name: found._id, value: exifvalue });
    } else {
      // NO - create new exif and then resolve promise
      var tosave = new Exif(newexif);
      tosave.save(function(err,saved){
        deferred.resolve({ name: saved._id, value: exifvalue });
      });
    }
  });
  
  return deferred.promise;
}

// Process and Save EXIF metadata
function saveExifTags(exif) {
  var deferred = Q.defer();
  try {
    var exifref = [];
    var exifsSaved = [];
    _(exif).forEach(function(bucket, bucketname){
      _(bucket).forEach(function(exifvalue, exifname){
        // process the metatag and add it to our set
        exifsSaved.push(saveExifTag({ name: exifname, bucket: bucketname }, exifvalue));
      });
    });
    // Wait for it... 
    Q.all(exifsSaved).then(function(newexifs){
      deferred.resolve(exifref.concat(newexifs));
    });
  } catch (error) {
    console.log('Error: ' + error.message);
    deferred.reject(error);
  }
  return deferred.promise;
}

/*      Process upload
 *
 *    1. Get exif
 *    2. Write to DB *tmp
 *    3. Push Original to bucket, update db w uri
 *    4. Pipe to derivatives, push to cdn bucket, update db w uri
 *    5. Return Image record for app api use
 */
exports.index = function(req, res) {
  var file = req.files.file;
  getExif(file.path).then(function (exif){
    saveExifTags(exif).then(function (exifrefs){
      var i = new Image();
      i.exif = exifrefs;
      i.temporary = Date.now();
      i.save(function (err) {
        if (err) {
          console.log(err);
          return res.json(200, err);
        }
        return res.json(200, i);
      });
    });
  });
};