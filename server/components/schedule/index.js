var _               = require('lodash');
var Image = require('../../api/image/image.model');
var schedule = require('node-schedule');

var aws = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;

var rule = new schedule.RecurrenceRule();
rule.minute = 13;

var j = schedule.scheduleJob(rule, function(){
  //  Remove images that are temporary and the countdown has passed
  Image.find({temporary: {$lte: Date.now(), $gt: 0}}, function(err, docs){
    _.forEach(docs, function(doc, key){
        var id
        doc.remove(function(err){
          if (err) {
            console.log(err);
          }
          console.log('temporary file removed - '+id);
        });
      });
    if (err) {
      console.log(err);
    }
  });
});

//  This is for me when I need it...
var truncate = function() {
  var params = {Bucket: 'hmmtesting'};
  var s3 = new aws.S3();
  s3.listObjects(params, function(err, data) {
    console.log(err);
    _.forEach(data.Contents, function(obj, key){
      params.Key = obj.Key;
      s3.deleteObject(params, function(err, data){
        console.log(err, data);
      });
    });
  });
}

module.exports = j;