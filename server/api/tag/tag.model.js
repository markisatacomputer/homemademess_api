'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId

var TagSchema = new Schema({
  text: {
    type: String,
    unique: true
  },
  namespace: String,
  _images: [{
    type: ObjectId,
    ref: 'Image'
  }],
  _sort: {
    size: {
      type: Number,
      default: 0
    },
    naturalized: {
      type: String,
      Lowercase: true
    }
  }
});

TagSchema.pre('save', function (next) {
  // set sort field
  this._sort.naturalized = this.text.toLowerCase();
  next();
});

module.exports = mongoose.model('Tag', TagSchema);