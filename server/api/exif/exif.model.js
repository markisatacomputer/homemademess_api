'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ObjectId = mongoose.Schema.Types.ObjectId

var ExifSchema = new Schema({
  name: String
});

module.exports = mongoose.model('Exif', ExifSchema);