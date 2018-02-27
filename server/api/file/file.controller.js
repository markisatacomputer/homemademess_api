'use strict';

var Image  = require('../image/image.model');
var aws             = require('aws-sdk');
aws.config.endpoint = process.env.AWS_ENDPOINT;

function logErr (res, err) {
  console.log('Upload Error: ', err);
  return res.json(500, err);
}

exports.one = function(req, res) {
  var filepath = req.params.id,
      id = filepath.split('/')[0];
  Image.findById(id)
  .exec( function (err, IMG) {
    var params, S3, download;

    if (err) { return logErr(res, err); }
    if(!IMG) { return res.send(404); }


    var S3 = new aws.S3();
    params = {
      Bucket: process.env.AWS_ORIGINAL_BUCKET,
      Key: filepath,
    };

    S3.getSignedUrl('getObject', params, function(err, url) {
      return res.send(url);
    });

    //S3.getObject(params).createReadStream().pipe(res);

    /*download = S3.getObject(params, function(err, data) {
      var buf, contentype;
      if (err) {
        return logErr(res, err);
      }
      if (data) {
        console.log(data);
        contentype = data.ContentType;
        IMG.exif.forEach(function(v, i){
          var result = v.name.name.match(/mimetype/i);
          if (result) {
            contentype = v.value;
          }
        });
        res.setHeader('Content-Disposition', 'attachment; filename='+ IMG.filename);
        res.setHeader("Content-Type", data.ContentType);
        res.setHeader("Content-Length", data.ContentLength);
        res.setHeader("Last-Modified", data.LastModified);
        return res.send(data.Body);
      }
    });*/

  });
};

exports.many = function(req, res) {

};