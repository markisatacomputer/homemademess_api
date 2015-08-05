'use strict';

var _ = require('lodash');
var Exif = require('../exif/exif.model');
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
    _.forEach(exif, function(bucket, bucketname){ 
      _.forEach(bucket, function(exifvalue, exifname){
        // no errors please
        if (exifname !== 'error' && exifname !== 'MakerNote') {
          // process the metatag and add it to our set
          exifsSaved.push(saveExifTag({ name: exifname, bucket: bucketname }, exifvalue));
        }
      });
    });
    // Wait for it... 
    Q.all(exifsSaved).then(function(newexifs){
      deferred.resolve(exifref.concat(newexifs));
    });
  } catch (error) {
    console.log('Error: ' + error);
    deferred.reject(error);
  }
  return deferred.promise;
}

// return a valid date
function getValidDate(exif) {
  var acceptedExif = ['exif.DateTimeOriginal','exif.CreateDate','image.DateTimeOriginal','image.CreateDate'];
  // find an exif create tag
  var d = null;
  while (!d && acceptedExif.length > 0) {
    d = _.get(exif,acceptedExif.shift(),'yo');
  }
  //  if we found one let's return it in the right format
  if (d && d != 'yo') {
    d = d.split(/[\s:]/);
    if (Array.isArray(d)) {
      return Date.UTC.apply(null, d);
    }
  }
  //  no?  send a big ol 0
  return 0;
}

exports.extract = function (path, IMG) {
  // get exif metadata
  getExif(path).then(function (exif){
    // set orientation
    IMG.orientation = exif.image.Orientation;
    // set create date if existing
    IMG.createDate = getValidDate(exif);
    // now process the individual exif metadata tags
    saveExifTags(exif).then(function (exifrefs) {
      // attach exif to image record
      IMG.exif = exifrefs;
      // save the image to db
      IMG.save(function (err) {
        if (err) {
          console.log(err);
        }
      });
    });
  });
}