'use strict';

var _ = require('lodash');
var Tag = require('../tag/tag.model');

exports.autocomplete = function(req, res) {
  var q = _.values(req.query);
  var re = new RegExp(q.join(''), "gi");
  Tag.find({text: {$regex: re}, '_sort.size': {$gt: 0}}, 
    null, 
    { sort: { '_sort.size': -1, '_sort.naturalized' : 1 }, limit: 10 }, 
    function (err, tags){
      if(err) { return res.json({status: 500}); }
      if(!tags) { return res.json({status:404}); }
      //  sort tags again - mongo can't do case insensitive
      return res.json(tags);
    });
}
