'use strict';

var _ = require('lodash');
var Tag = require('../tag/tag.model');
var Image = require('../image/image.model');

exports.tagged = function(req, res) {
  var tag = req.params.tag;
  tag = tag.replace('_', ' ');
  Tag.find({text: tag}, function(err, tags){
    if(err) { return res.json({status: 500}); }
    if(!tags) { return res.json({status:404}); }
    //  no exif please
    projection = {
      exif: 0
    }
    // set up tags condition
    conditions.tags = { $in: tags };
    Image.find(conditions, projection).sort({createDate: 'desc'}).populate('tags', 'text').lean().exec( function (err, images) {
      if(err) { return handleError(res, err); }
      // transform tags
      allTags = [];
      _.each(images, function(image, i){
        // collect all tags in one array
        allTags = _.union(allTags, image.tags);
        // transform tags to simple array
        images[i].tags = _.map(image.tags, function(tag){
          return tag.text.replace(' ', '_');
        });
      });
      return res.json(200, {images: images, tags: allTags });
    });
  });
}