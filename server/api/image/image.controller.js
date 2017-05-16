/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /images              ->  index
 * POST    /images              ->  create
 * GET     /images/:id          ->  show
 * PUT     /images/:id          ->  update
 * DELETE  /images/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var Image = require('./image.model');
var Tag = require('../tag/tag.model');
var aws = require('aws-sdk');
var Q = require('q');
aws.config.endpoint = process.env.AWS_ENDPOINT;

// Get list of all images
exports.index = function(req, res) {
  var filter, conditions, projection;

  filter = req.filter;
  conditions = req.conditions;
  projection = { //  don't include exif - please it's just too much
    exif: 0
  };

  Image.find(conditions, projection).sort({createDate: 'desc'})
  .populate('tags', 'text')
  .lean()
  .limit(filter.pagination.per)
  .skip(filter.pagination.per*filter.pagination.page)
  .exec( function (err, images) {

    if(err) { res.json(500, err); }

    // transform images as needed
    _.each(images, function(image, i){
      var selected;

      //  only include selected for admin users
      selected = false;
      if (typeof image.selected !== 'undefined') {
        if (_.find(image.selected, req.user._id)) {
          selected = true
        }
      }
      images[i].selected = selected
    });

    return res.json(200, {
      images: images,
      filter: filter
    });

  });

};

// Get a single image
exports.show = function(req, res) {
  Image.findById(req.params.id, function (err, image) {
    if(err) { return handleError(res, err); }
    if(!image) { return res.send(404); }
    return res.json(image);
  });
};

// Creates a new image in the DB.
exports.create = function(req, res) {
  Image.create(req.body, function(err, image) {
    if(err) { return handleError(res, err); }
    return res.json(201, image);
  });
};

// Updates an existing image in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Image.findById(req.params.id, function (err, image) {
    if (err) { return handleError(res, err); }
    if(!image) { return res.send(404); }
    var updated = _.merge(image, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, image);
    });
  });
};

// Deletes a image from the DB.
exports.destroy = function(req, res) {
  Image.findById(req.params.id, function (err, image) {
    if(err) { return handleError(res, err); }
    if(!image) { return res.send(404); }
    image.remove(function(err) {
      if(err) { return handleError(res, err); }
      //  remove from s3 bucket
      var params = {
        Bucket: process.env.AWS_ORIGINAL_BUCKET,
        Key: image.id,

      }
      var s3 = new aws.S3();
      s3.deleteObject(params, function(err, data){
        if(err) { return handleError(res, err); }
        return res.send(204, data);
      });
      //return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
