'use strict';

var _ = require('lodash');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var url = require('url');
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
  width: Number,
  height: Number,
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
    default: 0
  },
  temporary: {
    type: Number,
    default: Date.now()
  }
});

ImageSchema.post('remove', function (doc) {
  // remove all derivatives
  var ds = doc.derivative;
  var s3 = new aws.S3();
  _.forEach(ds, function(d){
    var path = url.parse(d.uri).pathname.slice(1);
    //  remove from s3 bucket
    var params = {
      Bucket: process.env.AWS_THUMB_BUCKET,
      Key: path,
    }
    s3.deleteObject(params, function(err, data){
      if(err) { console.log('image:remove error', err, path); }
      console.log('image:remove derivative', path);
    });
  });
});

module.exports = mongoose.model('Image', ImageSchema);