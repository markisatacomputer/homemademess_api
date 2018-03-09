'use strict';

var _ = require('lodash');
var Exif = require('../exif/exif.model');
var exiftool = require('node-exiftool');
var ep = new exiftool.ExiftoolProcess();
var Q = require('q');
var moment = require('moment');

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
    t = _.get(exif,accepted.shift(), 0);
    if (t) { break; }
  }

  //  figure out what's wrong with this
  //console.log(t);

  //  transform even if not found
  if (transform && t) {
    t = transform(t);
  }

  //  figure out what's wrong with this
  //console.log(t);
  return t;
}

// return a valid date
function getValidDate(exif) {
  return getExifValue(
    exif,
    ['createdate','datecreated',  'datetimeoriginal', 'datetimecreated', 'modifydate', 'filemodifydate', 'date'],
    function (d) {
      var dateFormats, newd;
      dateFormats = ['YYYY:MM:DD hh:mm:ss', moment.ISO_8601]
      newd = moment(d, dateFormats).valueOf();
      if (newd !== undefined && newd !== null) {
        return newd;
      }
      return d;
    }
  );
}

function getType(exif) {
  return getExifValue( exif, ['filetype'] );
}

function getOrientation(exif) {
  return getExifValue( exif, ['orientation'], function(o) {
    switch(o) {
      default:
        return 1;
    }
  });
}
function getSize(exif) {
  var size = getExifValue( exif, ['imagesize'] );
  if (size) {
    return size.split('x');
  }
  var width = getExifValue( exif, ['imagewidth', 'exifimagewidth', 'imagesourcewidth'] );
  var height = getExifValue( exif, ['imageheight', 'exifimageheight', 'imagesourceheight'] );
  if (width && height) {
    return [width,height];
  }

}

exports.extract = function (path, IMG) {
  var deferred = Q.defer();
  // get exif metadata
  getExif(path).then( function (exif) {
    var exifi = _.mapKeys(exif, function(value, key){
      return key.toLowerCase();
    });
    // set orientation
    IMG.orientation = getOrientation(exifi);
    // set create date if existing
    IMG.createDate = getValidDate(exifi);
    // set fileType
    IMG.fileType = getType(exifi);

    // set dimensions
    var size = getSize(exifi);
    IMG.width = size[0];
    IMG.height = size[1];

    // now process the individual exif metadata tags
    saveExifTags(exif).then(function (exifrefs) {

      // attach exif to image record
      IMG.exif = exifrefs;

      // save the image to db and resolve
      IMG.save(function (err, doc) {
        if (err) {
          deferred.reject(err);
        }
        deferred.resolve(doc);
      });
    });
  }, function(e) { logErr(e, deferred); });

  return deferred.promise;
}