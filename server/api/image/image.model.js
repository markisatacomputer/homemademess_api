'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ObjectId = Schema.Types.ObjectId

var ImageSchema = new Schema({
  name: String,
  filename: String,
  tags: [{
    type: ObjectId,
    ref: 'Tag'
  }],
  exif: [{
    name: { type: ObjectId, ref: 'Exif' },
    value: String,
  }],
  original: String,
  derivative:[{
    type: ObjectId
  }],
  temporary: {
    type: Date,
    default: Date.now()
  }
});

module.exports = mongoose.model('Image', ImageSchema);