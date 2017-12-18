'use strict';

var mongoose = require('mongoose');
var compose = require('composable-middleware');
var Tag = require('../tag/tag.model');
var Image = require('../image/image.model');
var Q = require('q');
var moment = require('moment');

/**
 * Attaches query conditions to the request
 * Otherwise returns 403
 */
function attachFilters() {
  return compose()
    // Attach user to request
    .use(function(req, res, next) {
      var filter, resolveFilters;

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
        },
        selected: false,
        exif: {}
      };

      //  we must resolve conditions in order to provide a text tag query param
      resolveFilters = Q.defer();

      //  if there is a query, let's parse it
      if (req.query) {
        //  pagination params
        if (req.query.hasOwnProperty('page')) {
          filter.pagination.page = Number(req.query.page);
        }
        if (req.query.hasOwnProperty('per')) {
          filter.pagination.per = Number(req.query.per);
        }
        //  selected only
        if (req.query.hasOwnProperty('selected')) {
          filter.selected = true;
        }
        //  date params
        if (req.query.hasOwnProperty('start')) {
          filter.date.from = Number(req.query.start);
        }
        if (req.query.hasOwnProperty('end')) {
          filter.date.to = Number(req.query.end);
        }
        if (req.query.hasOwnProperty('up')) {
          filter.date.up = req.query.up;
          filter.date.up_g = (req.query.hasOwnProperty('up_g')) ? req.query.up_g : 'day';
        }
        if (req.query.hasOwnProperty('ids')) {
          filter.ids = req.query.ids.slice(0,25);
        }

        //  --  TAGS --
        //  tag id param
        if (req.query.hasOwnProperty('tags')) {
          if (!Array.isArray(req.query.tags)) {
            req.query.tags = [req.query.tags];
          }
          filter.tag.tags = req.query.tags;
        }
        //  tag Text param
        if (req.query.hasOwnProperty('tagtext')) {

          filter.tag.tagtext = req.query.tagtext.replace(/_/g, ' ').split('~~');

          Tag.find({ text: { $in: filter.tag.tagtext } }, function (err, tags) {
            if(err) { resolveFilters.reject(err); }
            filter.tag.tags = tags;

            resolveFilters.resolve(filter);
          });
        } else {
          resolveFilters.resolve(filter);
        }
      }

      resolveFilters.promise.then( function(conditions) {
        req.filter = filter;
        next();
      },
      function(error){
        return res.json(500, error);
      });
    });
}


function attachConditions() {
  return compose()
    // Attach user to request
    .use(attachFilters())
    .use(function(req, res, next) {
      var conditions, tagIds;

      conditions = {
        temporary: 0 //  turn off for debug
      };

      //  if there is a query, let's parse it
      if (req.hasOwnProperty('filter')) {
        //  --  TAGS --
        if (req.filter.hasOwnProperty('tag')) {
          if (req.filter.tag.hasOwnProperty('tags')) {
            tagIds = req.filter.tag.tags.map( function(t){
              return t._id;
            });
            if (tagIds.length > 0) {
              conditions.tags = { $in: tagIds };
            }
          }
        }
        //  --  SELECTED --
        if (req.filter.selected && typeof(req.user._id) !== 'undefined') {
          conditions.selected = { $eq: req.user._id }
        }
        //  --  DATE CONSTRAINTS --
        //        must be unix micro
        //    CreateDate
        if (req.filter.date.hasOwnProperty('from') && req.filter.date.from !== 0 && Number.isInteger(req.filter.date.from)) {
          conditions.createDate = { $gte: req.filter.date.from }
        }
        if (req.filter.date.hasOwnProperty('to') && req.filter.date.to !== 0 && Number.isInteger(req.filter.date.to)) {
          if (conditions.hasOwnProperty('createDate')) {
            conditions.createDate.$lte = req.filter.date.to;
          } else {
            conditions.createDate = { $lte: req.filter.date.to }
          }
        }
        //    UploadDate
        if (req.filter.date.hasOwnProperty('up')) {
          conditions.uploadDate = {
            $gte: Number( moment(req.filter.date.up).startOf(req.filter.date.up_g).valueOf() ),
            $lte: Number( moment(req.filter.date.up).endOf(req.filter.date.up_g).valueOf() )
          }
        }
        if (req.filter.hasOwnProperty('ids')) {
          conditions._id = { $in: req.filter.ids };
        }
      }

      req.conditions = conditions;

      next();
    });
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
function attachCount() {

  return compose()
    .use(attachConditions())
    .use(function(req, res, next) {

      Image.find(req.conditions).count(function(err, count){
        if(err) {  return res.json(500, err); }
        req.filter.pagination.count = count;
        next();
      });
    });
}

exports.filters = attachFilters;
exports.conditions = attachConditions;
exports.count= attachCount;