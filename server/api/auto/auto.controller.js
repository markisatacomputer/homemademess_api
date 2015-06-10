'use strict';

var _ = require('lodash');
var Tag = require('../tag/tag.model');

exports.autocomplete = function(req, res) {
  console.log(req.params);
  console.log(req.tag);
  var re = new RegExp(req.params.tag,"g");
  Tag.find({text: {$regex: re}}, function(err, tags){
    if(err) { return handleError(res, err); }
    if(!tags) { return res.json({status:404}); }
    return res.json(tags);
  });
}