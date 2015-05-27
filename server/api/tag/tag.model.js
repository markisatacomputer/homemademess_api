'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var TagSchema = new Schema({
  name: {
    Type: String
  }
});

module.exports = mongoose.model('Tag', TagSchema);