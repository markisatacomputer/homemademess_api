'use strict';

var _ = require('lodash');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var url = require('url');
var Queue = require('../up/up.queue');
var Tag = require('../tag/tag.model');
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.Types.ObjectId;

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
    default: Date.now()
  },
  temporary: {
    type: Number,
    default: Date.now()
  }
});

ImageSchema.post('remove', function (doc) {
  console.log('remove');
  var ds = doc.derivative;
  var s3 = new aws.S3();
  var id = doc.id;

  // abort managed upload if necessary - logic in queue object
  Queue.abort(id);

  //  remove ORIGINAL from s3 bucket
  var params = {
    Bucket: process.env.AWS_ORIGINAL_BUCKET,
    Key: id,
  }
  s3.deleteObject(params, function(err, data){
    if(err) { console.log('image:remove error', err); } else {
      console.log('image:removed', id);
    }
  });
  //  remove from DERIVATIVES from s3 bucket
  _.forEach(ds, function(d){
    var path = url.parse(d.uri).pathname.slice(1);
    var params = {
      Bucket: process.env.AWS_THUMB_BUCKET,
      Key: path,
    }
    s3.deleteObject(params, function(err, data){
      if(err) { console.log('image:remove error', err, path); }
      console.log('image:remove derivative', path);
    });
  });

  // remove image refs from tags
  Tag.find({_images: id }, function(err, tags){
    _.forEach(tags, function(tag){
      _.forEach(tag._images, function(imageid, i){
        if (imageid == id) {
          tag._images.splice(i,1);
        }
        tag._sort.size = tag._images.length;
        tag.save();
      });
    });
  });
});

ImageSchema.post('save', function (doc) {
  // add image refs to tags
  _.forEach(doc.tags, function(tag){
    Tag.findOne({_id: tag}, function(err, t){
      if (err) {
        console.log('error finding tag ('+tag+'): ', e);
      } else if (t) {
        if (t._images) {
          t.update({$addToSet: {_images: doc._id}, $set: {'_sort.size': t._images.length+1}}).exec();
        } else {
          t.update({$set: {_images: [doc._id], '_sort.size': t._images.length+1}}).exec();
        }
      }
    });
  });
});

module.exports = mongoose.model('Image', ImageSchema);
