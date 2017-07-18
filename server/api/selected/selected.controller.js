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

//  Get all images marked as selected by current logged in user
exports.index = function(req, res) {
  var query;

  //  param to return Image Objects
  if (req.query.returnImages) {
    query = Image.find({ selected: { $elemMatch: { $eq: req.user._id } } });
  //  Default returns only ids
  } else {
    query = Image.find({ selected: { $elemMatch: { $eq: req.user._id } } }, {_id: 1}).lean();
  }

  //  limit if per query param included
  if (req.query.per) {
    query.limit( parseInt(req.query.per, 10) );
  }

  query.exec( function (err, selected) {
    if (err) { return handleError(res, err); }
    //  default return array of ids
    if (!req.query.returnImages) {
      selected = selected.map(function(doc){
        return doc._id;
      });
    }
    return res.json(200, selected);
  });
};

//  Mark all images in current view as SELECTED by current logged in user
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

// Mark one image as SELECTED by current logged in user
exports.selectOne = function(req, res, next) {
  if (req.params.id == 'tags') {
    next();
  } else {
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
  }
};

//  Mark images as UNSELECTED
exports.delete = function(req, res) {
  var conditions = req.conditions;
  //  selected by current user
  conditions.selected = { $elemMatch: { $eq: req.user._id } };
  //  update
  Image.update(
    conditions,
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

//  Mark one image as UNSELECTED by current logged in user
exports.deleteOne = function(req, res, next) {
  if (req.params.id == 'images') {
    next();
  } else {
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
  }
};

//  GET TAGS in selected
exports.getTags = function(req, res) {
  Image.find(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { tags: 1 }
  )
  .populate('tags')
  .exec( function (err, selected) {
    var tags = {
      ids: [],
      objects: []
    };

    if(err) { return handleError(res, err); }

    selected.forEach( function(img, i){
      img.tags.forEach( function(tag, ii) {
        if ( tags.ids.indexOf(tag._id) == -1 ){
          tags.ids.push(tag._id);
          tags.objects.push(tag);
        }
      });
    });

    return res.json(200, tags);
  });
};

//  ADD TAGS
exports.saveTags = function(req, res) {
  Image.update(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { $addToSet:
      { tags: { $each: req.body } }
    },
    { multi: true }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    saveSelectedImages(req.user._id);
    return res.json(200, selected);
  });
};

//  REMOVE TAGS
exports.deleteTags = function(req, res) {
  Image.update(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { $pull:
      { tags: req.params.id }
    },
    { multi: true }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    saveSelectedImages(req.user._id);
    return res.json(200, selected);
  });
};

//  DELETE SELECTED IMAGES
exports.deleteSelectedImages = function(req, res) {
  Image.find(
    { selected: { $elemMatch: { $eq: req.user._id } } },
    { multi: true }
  ).exec( function (err, selected) {
    if(err) { return handleError(res, err); }
    selected.forEach( function(img, i) {
      img.remove().then(
        function (img) { },
        function (err) {
          return handleError(res, err);
        }
      );
    });
    return res.json(200, {deleted: selected});
  });
};



//  Save all the docs so the tags get updated - there's probably a better way to do this
function saveSelectedImages(userid) {
  Image.find( { selected: { $elemMatch: { $eq: userid } } },
    function (err, docs) {
      if(err) { return handleError(res, err); }
      docs.forEach(function(doc){
        doc.save();
      });
    });
}

function handleError(res, err) {
  return res.send(500, err);
}
