'use strict';

var _ = require('lodash');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var Image = require('../api/image/image.model');
var Exif = require('../api/exif/exif.model');
var ExifImage = require('exif').ExifImage;
var Q = require('q');
var gm = require('gm');

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
        if (exifname !== 'error' && exifname !== 'makernote') {
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

// Log object upload result
function logObjectUpload(err, data) {
  if (err) { 
    console.log('Error: ', err); 
  } else {
    console.log('Upload successful: ', data);
  }
}

// Upload Original to Bucket
function upOriginal(file, id) {
  // set original bucket
  var hmmtesting = new aws.S3({params: {Bucket: process.env.AWS_ORIGINAL_BUCKET, Key: id }});
  var fs = require('fs');
  var body = fs.createReadStream(file);
  hmmtesting.upload({Body: body}, logObjectUpload(err, data) );
}

// Upload Derivatives to Bucket
function upDerivatives(file, IMG) {
  var deferred = Q.defer();
  //  all size w, h
  var sizes = {
    sm:[400,600],
    md:[800,1200],
    lg:[1200,1600]
  };
  // pipe each thumb size to object
  _.forEach(sizes, function(thumbSize, sizeKey) {
    exports.imageOrient(file).then( function(size, err) {
      var img = gm(file+'-oriented');
      // image is vertical we use height
      if (size.width < size.height) {
        img.resize(null,thumbSize[1]);
      // image is horizontal or square we use width
      } else {
        img.resize(thumbSize[0]);
      }
      img.compress('JPEG').quality(60).stream(function (err, stdout, stderr) {
        //  set thumb bucket
        var hmmtestthumb = new aws.S3({params: {Bucket: process.env.AWS_THUMB_BUCKET, Key: IMG.id+'/'+sizeKey+'.jpg' }});
        hmmtestthumb.upload({Body: stdout}, function(err, data) {
          // write to db
          // log
          logObjectUpload(err, data);
          // cleanup - needs to happen in the promise.then down below
        });
      });
    });
  });

  return deferred.promise;
}

exports.imageOrient = function(file) {
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
        // get uploads started
        upOriginal(file.path, i.id);
        upDerivatives(file.path, i);
        // pass back our image
        return res.json(200, i);
      });
    });
  });
};