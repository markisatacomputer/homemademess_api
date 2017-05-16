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
var Tag = require('../tag/tag.model');
var Image = require('../image/image.model');

// Get all images marked as selected by current logged in user
exports.index = function(req, res) {
  Image.find({ selected: { $elemMatch: { $eq: req.user._id } } }).exec( function (err, selected) {
    if (err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

// Mark images as selected by current logged in user
exports.select = function(req, res) {
  Image.update(
    { _id: { $in :req.body } },
    { $addToSet:
      { selected: req.user._id }
    }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

// Unmark images as selected by current logged in user
exports.delete = function(req, res) {
  Image.update(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { $pull:
      { selected: req.user._id }
    }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

// Unmark one image as selected by current logged in user
exports.deleteOne = function(req, res) {
  Image.update(
    { _id: { $eq: req.params.id } },
    { $pull:
      { selected: req.user._id }
    }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

// Add tags to images marked as selected by current logged in user
exports.saveTags = function(req, res) {
  Image.update(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { $addToSet:
      { selected: { $each: req.body } }
    }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

// Remove tags from images marked as selected by current logged in user
exports.deleteTags = function(req, res) {
  Image.update(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { $addToSet:
      { selected: { $each: req.body } }
    }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
