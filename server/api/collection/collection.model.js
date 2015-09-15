'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var CollectionSchema = new Schema({
  text: String,
  namespace: String
});

module.exports = mongoose.model('Tag', TagSchema);
