'use strict';

var _ = require('lodash');
var Exif = require('../exif/exif.model');
var exiftool = require('node-exiftool');
var ep = new exiftool.ExiftoolProcess();
var Q = require('q');

function logErr (err, deferred) {
  if (err) {
    console.log('Error: ', err);
    if (deferred) {
      deferred.reject(err);
    }
  }
}
function logResolve (data, deferred) {
  if (data) {
    console.log('Resolve: ', data);
    if (deferred) {
      deferred.resolve(data);
    }
  }
}

// Get EXIF metadata
function getExif(image) {
  var deferred = Q.defer();

  ep.open().then( function() {
    ep.readMetadata(image).then(function(obj){
      if (obj.err) {
        logErr(obj.err);
      }
      if (typeof(obj.data[0]) != "undefined") {
        deferred.resolve(obj.data[0]);
      } else {
        deferred.resolve(obj.data);
      }
    });
  })
  .then(() => ep.close());

  return deferred.promise;
}

// Save individual exif tag
function saveExifTag(newexif,exifvalue){
  var deferred = Q.defer(),
  query  = Exif.where('name', newexif.name);  // does this exif tag exist in the db?

  query.findOne( function (err, found) {
    if (err) {
      logErr(err, deferred);
    }
    if (found !== null) {
      //  YES - resolve promise now
      deferred.resolve({ name: found._id, value: exifvalue });
    } else {
      // NO - create new exif and then resolve promise
      var tosave = new Exif(newexif);
      tosave.save(function(err,saved){
        if (err) {
          logErr(err, deferred);
        }
        deferred.resolve({ name: saved._id, value: exifvalue });
      });
    }
  });

  return deferred.promise;
}

// Process and Save EXIF metadata
function saveExifTags(exif) {
  var deferred = Q.defer(),
  exifref = [],
  exifsSaved = [];

  _.forEach(exif, function(exifvalue, exifname){
    // no errors please
    if (exifname !== 'error' && exifname !== 'MakerNote') {
      // process the metatag and add it to our set
      exifsSaved.push(saveExifTag({ name: exifname }, exifvalue));
    }
  });

  // Wait for it...
  Q.all(exifsSaved).then(function(newexifs){
    deferred.resolve(exifref.concat(newexifs));
  },
  function(err) {
    logErr(err, deferred);
  });

  return deferred.promise;
}

function getExifValue(exif,accepted,transform) {
  // find an exif tag
  var t = null;
  while (!t && accepted.length > 0) {
    t = _.get(exif,accepted.shift(),'yo');
  }
  //  if we found one let's return it in the right format
  if (t && t != 'yo') {
    if (transform) {
      t = transform(t);
    }
    return t;
  }
  //  no?  send a big ol 0
  return 0;
}

// return a valid date
function getValidDate(exif) {
  return getExifValue(
    exif,
    ['DateTimeOriginal','CreateDate'],
    function(d) {
      d = d.split(/[\s:]/);
      if (Array.isArray(d)) {
        return Date.UTC.apply(null, d);
      }
    }
  );
}

function getType(exif) {
  return getExifValue( exif, ['FileType'] );
}

function getOrientation(exif) {
  return getExifValue( exif, ['Orientation'], function(o) {
    switch(o) {
      default:
        return 1;
    }
  });
}

exports.extract = function (path, IMG) {
  // get exif metadata
  getExif(path).then(function (exif){
    // set orientation
    IMG.orientation = getOrientation(exif);
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
  }, function(e) { console.log(e); });
}