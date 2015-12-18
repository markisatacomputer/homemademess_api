'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId

var TagSchema = new Schema({
  text: String,
  namespace: String,
  _images: [{
    type: ObjectId,
    ref: 'Image'
  }]
});

module.exports = mongoose.model('Tag', TagSchema);