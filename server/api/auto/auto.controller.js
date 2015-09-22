'use strict';

var _ = require('lodash');
var Tag = require('../tag/tag.model');

exports.autocomplete = function(req, res) {
  var q = _.values(req.query);
  var re = new RegExp(q.join(''), "gi");
  Tag.find({text: {$regex: re}}, null, { $orderby: { text : -1 } }, function(err, tags){
    if(err) { return res.json({status: 500}); }
    if(!tags) { return res.json({status:404}); }
    //  no repeats in our results please... there shouldn't be any anyway
    var tagstexts = {};
    var returntags = [];
    _.forEach(tags, function(tag, i) {
      if (!tagstexts.hasOwnProperty(tag.text)) {
        returntags.push(tag);
      }
      tagstexts[tag.text] = tag.text;
    });
    return res.json(returntags);
  });
}
