'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ObjectId = Schema.Types.ObjectId

var ImageSchema = new Schema({
  name: String,
  description: String,
  filename: String,
  tags: [{
    type: ObjectId,
    ref: 'Tag'
  }],
  exif: [{
    name: { type: ObjectId, ref: 'Exif' },
    value: String,
  }],
  orientation: Number,
  original: String,
  derivative:[{
    uri: String,
    width: Number,
    height: Number
  }],
  createDate: {
    type: Number,
    default: 0
  },
  uploadDate: {
    type: Number,
    default: Date.now()
  },
  temporary: {
    type: Number,
    default: Date.now()
  }
});

module.exports = mongoose.model('Image', ImageSchema);