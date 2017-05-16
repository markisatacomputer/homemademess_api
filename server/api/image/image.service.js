'use strict';

var mongoose = require('mongoose');
var compose = require('composable-middleware');
var Tag = require('../tag/tag.model');
var Image = require('../image/image.model');
var Q = require('q')

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
        }
      };

      //  we must resolve conditions in order to provide a text tag query param
      resolveFilters = Q.defer();

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
        if(err) {  return res.json(500, error); }
        req.filter.pagination.count = count;
        next();
      });
    });
}

exports.filters = attachFilters;
exports.conditions = attachConditions;
exports.count= attachCount;