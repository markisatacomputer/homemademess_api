'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId

var ImageSchema = new Schema({
  name: String,
  filename: String,
  tags: [{
    Type: String
  }],
  exif: [{
    Type: ObjectId
  }],
  original: String,
  derivative:[{
    Type: ObjectId
  }]
});

module.exports = mongoose.model('Image', ImageSchema);