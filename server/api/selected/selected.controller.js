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
var EventEmitter = require('events');
var emitter = new EventEmitter();
var Tag = require('../tag/tag.model');
var Image = require('../image/image.model');

//  Emit custom events for socket to pass on
exports.emitter = emitter;

// Get all images marked as selected by current logged in user
exports.index = function(req, res) {
  Image.find({ selected: { $elemMatch: { $eq: req.user._id } } }).exec( function (err, selected) {
    if (err) { return handleError(res, err); }
    return res.json(200, selected);
  });
};

// TODO - need to pass filter to this in body so that we select based on that
// Mark images as selected by current logged in user
exports.select = function(req, res) {
  var conditions = req.conditions;
  Image.update(
    conditions,
    { $addToSet:
      { selected: req.user._id }
    },
    { multi: true },
    function (err, selected) {
      if(err) { return handleError(res, err); }
      emitter.emit('image.select.all');
      //  return ids of selected
      Image.find(conditions,{_id: 1}).lean().exec(function (err, docs) {
        if(err) { return handleError(res, err); }
        docs = docs.map(function(doc){
          return doc._id;
        });
        return res.json(200, docs);
      });
    });
};

// Mark images as selected by current logged in user
exports.selectOne = function(req, res) {
  Image.findOneAndUpdate(
    { _id: { $eq: req.params.id } },
    { $addToSet:
      { selected: req.user._id }
    },
    function (err, selected) {
      if(err) { return handleError(res, err); }
      emitter.emit('image.select.on', selected._id);
      return res.json(200, selected);
    });
};

// Unmark images as selected by current logged in user
exports.delete = function(req, res) {
  Image.update(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { $pull:
      { selected: req.user._id }
    },
    { multi: true },
    function (err, selected) {
      if(err) { return handleError(res, err); }
      emitter.emit('image.select.none');
      return res.json(200, selected);
    });
};

// Unmark one image as selected by current logged in user
exports.deleteOne = function(req, res) {
  Image.findOneAndUpdate(
    { _id: { $eq: req.params.id } },
    { $pull:
      { selected: req.user._id }
    },
    function (err, selected) {
      if(err) { return handleError(res, err); }
      emitter.emit('image.select.off', selected._id);
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
