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
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;

// Get list of all images
exports.index = function(req, res) {
  var projection, conditions, allTags;
  //  don't include exif - please it's just too much
  projection = {
    exif: 0
  }
  conditions = {
    temporary: 0 //  turn off for debug
  }
  //  if there is a query, let's parse it
  if (req.query) {
    //  construct tags query condition
    if (req.query.hasOwnProperty('tags')) {
      //  make sure we're working with an array
      if (!Array.isArray(req.query.tags)) {
        req.query.tags = [req.query.tags];
      }
      conditions.tags = { $in: req.query.tags };
    }
  }
  Image.find(conditions, projection).sort({createDate: 'desc'}).populate('tags', 'text').lean().exec( function (err, images) {
    if(err) { return handleError(res, err); }
    // transform tags
    allTags = [];
    _.each(images, function(image, i){
      // collect all tags in one array
      allTags = _.union(allTags, image.tags);
      // transform tags to simple array
      images[i].tags = _.map(image.tags, function(tag){
        return tag.text.replace(' ', '_');
      });
    });
    return res.json(200, {images: images, tags: allTags });
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
