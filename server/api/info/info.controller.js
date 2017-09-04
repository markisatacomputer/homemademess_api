
'use strict';

var _ = require('lodash');
var Image = require('../image/image.model');
var Q = require('q');

/**
 *   return lower and upper limits for image dates
 *   @return {Object}
 */
var getDateConstraints = function() {
  var resolveDates = Q.defer(),
  dates = {};

  Image.findOne().sort('createDate').exec(function(err, from) {
    if (err) { resolveDates.reject(err); }
    dates.from = from.createDate;
    Image.findOne().sort('-createDate').exec(function(err, to) {
      if (err) { resolveDates.reject(err); }
      dates.to = to.createDate;
      resolveDates.resolve(dates);
    });
  });

  return resolveDates.promise;
}
/**
 *   return unique dates of upload with a granularity of one calendar day
 *   @return {Array}
 */
var getUploadDates = function() {
  var resolveDates = Q.defer(),
  dates = {};

  Image.aggregate([
    //  -  reduce uploadDate to day
    { $project: {
      uploadDate: 1,
      upload: {
        $floor: {
          $multiply: [
            86400000,
            {
              $ceil: {
                $divide: ['$uploadDate', 86400000]
              }
            }
          ]
        }
      }
    }},
    //  -  only show unique day values
    { $group: {
      _id: '$upload'
      }
    },
    //  -  do not return 0.  do we need this?
    //{ $match : { upload : { $ne: 0 } } },
    //  -  sort!
    {
      $sort: {
        _id: -1
      }
    }

  ]).exec(function(err, dates) {
    if (err) { resolveDates.reject(err); }
    resolveDates.resolve(dates);
  });

  return resolveDates.promise;
}

// Get a single image
exports.show = function(req, res) {
  switch (req.params.id) {
    case 'dates':
      getDateConstraints().then(function(dates){
        return res.json(200, dates);
      },
      function(err){
        return res.json(500, err);
      });
      break;
    case 'up':
      getUploadDates().then(function(dates){
        return res.json(200, dates);
      },
      function(err){
        return res.json(500, err);
      });
      break;
  }
}