/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /tags              ->  index
 * POST    /tags              ->  create
 * GET     /tags/:id          ->  show
 * PUT     /tags/:id          ->  update
 * DELETE  /tags/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var Tag = require('./tag.model');

// Get list of tags
exports.index = function(req, res) {
  var conditions, tags;

  if (req.query) {
    //  construct tags query condition
    if (req.query.hasOwnProperty('text')) {

      //  make sure we're working with an array
      tags = req.query.text.replace(/_/g, ' ').split('~~');
      conditions = { text: { $in: tags } };
    }
    //  filter by ids
    if (req.query.hasOwnProperty('ids')) {
      conditions = { _id: { $in: req.query.ids } };
    }
    //  filter by image ids
    if (req.query.hasOwnProperty('iids')) {
      conditions = { _images: { $in: req.query.iids } };
    }
  }
  if (conditions !== null) {
    Tag.find(conditions, function (err, tags) {
      if(err) { return handleError(res, err); }
      return res.json(200, tags);
    });
  } else {
    Tag.find(function (err, tags) {
      if(err) { return handleError(res, err); }
      return res.json(200, tags);
    });
  }
};

// Get a single tag
exports.show = function(req, res) {
  Tag.findById(req.params.id, function (err, tag) {
    if(err) { return handleError(res, err); }
    if(!tag) { return res.send(404); }
    return res.json(tag);
  });
};

// Creates a new tag in the DB.
exports.create = function(req, res) {
  Tag.create(req.body, function(err, tag) {
    if(err) { return handleError(res, err); }
    return res.json(201, tag);
  });
};

// Updates an existing tag in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Tag.findById(req.params.id, function (err, tag) {
    if (err) { return handleError(res, err); }
    if(!tag) { return res.send(404); }
    var updated = _.merge(tag, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, tag);
    });
  });
};

// Deletes a tag from the DB.
exports.destroy = function(req, res) {
  Tag.findById(req.params.id, function (err, tag) {
    if(err) { return handleError(res, err); }
    if(!tag) { return res.send(404); }
    tag.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}