'use strict';

var _ = require('lodash');
var Upload = require('./up.model');
var UpListener = require('./up.listener');
var Image = require('../image/image.model');
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
  if (d) {
    d = d.split(/[\s:]/);
    if (Array.isArray(d)) {
      return Date.UTC.apply(null, d);
    }
  } else {
    return 0; // Date.now();
  }
}

/*      Process upload
 *
 *    1. CHECK Get exif
 *    2. Write to DB *tmp
 *    3. Push Original to bucket, update db w uri
 *    4. Pipe to derivatives, push to cdn bucket, update db w uri
 *    5. Return Image record for app api use
 */
exports.index = function(req, res) {
  var file = req.files.file;
  // create new image
  var i = new Image();
  // save original filename
  i.filename = file.originalname;
  // temporary - let's make it an hour limit
  i.temporary = Date.now() + 3600000;
  // get exif metadata
  getExif(file.path).then(function (exif){
    // save orientation
    i.orientation = exif.image.Orientation;
    // save create date if existing
    i.createDate = getValidDate(exif);
    // now process the individual exif metadata tags
    saveExifTags(exif).then(function (exifrefs){
      // attach exif to image record
      i.exif = exifrefs;
      // save the image to db
      i.save(function (err) {
        if (err) {
          console.log(err);
          return res.json(200, err);
        }
        //  get uploads started
        var up = new Upload(file.path, i);
        //  attach listener
        up.on('S3Progress', function (id, progress) {
          UpListener.emit('S3Progress', id, progress);
        }).on('S3UploadEnd', function (id, end) {
          UpListener.emit('S3UploadEnd', id, end);
        });
        up.send();
        // pass back our image
        return res.json(200, i);
      });
    });
  });
};
