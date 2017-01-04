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
  var allTags, countP, resultP, resolveC,
  projection = { //  don't include exif - please it's just too much
    exif: 0
  },
  conditions = {
    temporary: 0 //  turn off for debug
  },
  filter = {
    pagination: {
      page: 0,
      per: 60
    },
    tag: {
      tags: [],
      tagtext: [],
      operator: 'or'
    },
    date: {
      from: 0,
      to: 0
    }
  };
  //  we must resolve conditions in order to provide a text tag query param
  resolveC = Q.defer();
  //  if there is a query, let's parse it
  if (req.query) {
    //  tag params

    //  pagination params
    if (req.query.hasOwnProperty('page')) {
      filter.pagination.page = Number(req.query.page);
    }
    if (req.query.hasOwnProperty('per')) {
      filter.pagination.per = Number(req.query.per);
    }
    //  tag id param
    if (req.query.hasOwnProperty('tags')) {
      if (!Array.isArray(req.query.tags)) {
        req.query.tags = [req.query.tags];
      }
      filter.tag.tags = req.query.tags;
      conditions.tags = { $in: req.query.tags };
    }
    //  tag Text param
    if (req.query.hasOwnProperty('tagtext')) {
      var tags = req.query.tagtext.replace(/_/g, ' ').split('~~'),
      tagConditions = { text: { $in: tags } };
      filter.tag.tagtext = tags;
      Tag.find(tagConditions, function (err, tags) {
        if(err) {
          console.log(err);
          resolveC.reject(err);
        }
        var tagIds = [];
        _.each(tags, function(t){
          tagIds.push(t._id);
        });
        conditions.tags = { $in: tagIds };
        resolveC.resolve(conditions);
      });
    } else {
      resolveC.resolve(conditions);
    }
  }

  //  we have all our conditions - put together the query
  resolveC.promise.then(
    function(cond) {
      //  count
      countP = Q.defer();
      Image.find(cond, projection).count(function(err, count){
        if(err) {  countP.reject(err); }
        countP.resolve(count);
      });
      //  image query
      resultP = Q.defer();
      Image.find(cond, projection).sort({createDate: 'desc'})
      .populate('tags', 'text')
      .lean()
      .limit(filter.pagination.per)
      .skip(filter.pagination.per*filter.pagination.page)
      .exec( function (err, images) {
        if(err) {  resultP.reject(err); }
        // transform tags
        allTags = [];
        _.each(images, function(image, i){
          // collect all tags in one array
          allTags = _.union(allTags, image.tags);
          // transform tags to simple array
          images[i].tags = _.map(image.tags, function(tag){
            return tag.text.replace(' ', '_');
          });
          images[i].n = i;
        });
        resultP.resolve({images: images, tags: allTags });
      });
      Q.all([countP.promise, resultP.promise]).then(function(both){
        var merged;
        merged = both[1];                          // image and tags
        merged.filter = filter;                    // filter
        merged.filter.pagination.count = both[0];
        return res.json(200, merged);
      },
      function(err){
        return res.json(500, err);
      });
    },
    function(err) {
      return res.json(500, err);
    }
  );

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
