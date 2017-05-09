'use strict';

var _ = require('lodash');
var Tag = require('../tag/tag.model');

exports.autocomplete = function(req, res) {
  var q = req.query.q,
  s = req.query.s,
  re = new RegExp(q, "gi"),
  search = {text: {$regex: re}};
  if (typeof s !== 'undefined') {
    search['_sort.size'] = {$gt: s}
  }
  Tag.find(search,
    null,
    { sort: { '_sort.size': -1, '_sort.naturalized' : 1 }, limit: 10 },
    function (err, tags){
      if(err) { return res.json({status: 500}); }
      if(!tags) { return res.json({status:404}); }
      //  sort tags again - mongo can't do case insensitive
      return res.json(tags);
    });
}
