'use strict';

var _ = require('lodash');
var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;
var url = require('url');
var Queue = require('../up/up.queue');
var Tag = require('../tag/tag.model');
var Q = require('q');
var events = require('../../components/events');
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
  fileType: String,
  mimeType: String,
  width: Number,
  height: Number,
  original: String,
  derivative:[{
    uri: String,
    name: String,
    width: Number,
    height: Number
  }],
  createDate: {
    type: Number,
    default: 0,
    index: true
  },
  uploadDate: {
    type: Number,
    default: Date.now()
  },
  temporary: {
    type: Number,
    default: Date.now()
  },
  selected: [{
    type: ObjectId,
    ref: 'User'
  }],
  updatedOriginal: {
    type: Number,
    default: 0
  },
  deletedCorrupt: {
    type: Number,
    default: 0
  }
});

ImageSchema.post('remove', function (doc) {
  var ds = doc.derivative;
  var s3 = new aws.S3();
  var id = doc.id;
  var imgP = Q.defer(), tagP = Q.defer(), derP = Q.defer(), ders =[];

  // first emit the start of this process
  events.emitter.emit('image.delete.begin', id);

  // abort managed upload if necessary - logic in queue object
  Queue.abort(id);

  //  remove ORIGINAL from s3 bucket
  var params = {
    Bucket: process.env.AWS_ORIGINAL_BUCKET,
    Key: id,
  }
  s3.deleteObject(params, function(err, data){
    if(err) {
      imgP.reject(err);
    } else {
      imgP.resolve(data);
    }
  });

  //  remove from DERIVATIVES from s3 bucket
  _.forEach(ds, function(d){
    var p = Q.defer();
    ders.push(p);
    var path = url.parse(d.uri).pathname.slice(1);
    var params = {
      Bucket: process.env.AWS_THUMB_BUCKET,
      Key: path,
    }
    s3.deleteObject(params, function(err, data){
      if(err) { p.reject(err); } else { p.resolve(data); }
    });
  });
  Q.allSettled(ders).then(function(r){
    derP.resolve(r);
  },
  function(e){
    derP.reject(e);
  });

  // remove image refs from tags
  Tag.find({_images: id }, function(err, tags){
    _.forEach(tags, function(tag){
      _.forEach(tag._images, function(imageid, i){
        if (imageid == id) {
          tag._images.splice(i,1);
        }
        tag._sort.size = tag._images.length;
        tag.save().then(function(r){
          tagP.resolve(r);
        },
        function(e){
          tagP.reject(e);
        });
      });
    });
  });

  //  Wait for all our promises to be complete and then we know if delete was a success
  Q.allSettled([imgP, tagP, derP]).then( function(r){
    events.emitter.emit('image.delete.complete', id);
  },
  function (err) {
    events.emitter.emit('image.delete.error', err)
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
