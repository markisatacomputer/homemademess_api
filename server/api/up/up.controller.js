'use strict';

var Queue  = require('./up.queue');
var Image  = require('../image/image.model');
var exif   = require('./up.exif');
var Busboy = require('busboy');
var path   = require('path');
var fs     = require('fs');
var Up     = require('./up.model');

/*      Process upload
 *
 *    1. CHECK Get exif
 *    2. Write to DB *tmp
 *    3. Push Original to bucket, update db w uri
 *    4. Pipe to derivatives, push to cdn bucket, update db w uri
 *    5. Return Image record for app api use
 */
function logErr (err, res) {
  console.log(err);
  return res.json(500, err);
}
exports.index = function(req, res) {
  var busboy, i, saveTo, S3;

  //  stream incoming files
  busboy = new Busboy({ headers: req.headers });
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    //  save temp file
    saveTo = path.join(process.env.UPLOAD_PATH, path.basename(filename));
    file.pipe(fs.createWriteStream(saveTo));

    // create new image doc
    var i = new Image();
    // save original filename
    i.filename = filename;
    // temporary - let's make it an hour limit
    i.temporary = Date.now() + 3600000;

    //  save image doc
    i.save(function(err){
      if (err) { return logErr(err, res); }
    //  send stream to S3 managed upload
      S3 = Up.getS3({
        Bucket: process.env.AWS_ORIGINAL_BUCKET,
        Key: i.id,
        Body: file
      });
      Up.emit('StackBegin', i.id, i);
      S3.send( function(err, data) {
        Up.emit('S3UploadEnd', i.id, data);
        //  get exif and save
        exif.extract(saveTo, i).then(
          function (doc) {
            //  add file to processing queue
            Queue.add(saveTo, i.id);
            //  respond to request
            return res.json(200, doc);
          },
          function (err) { return logErr(err, res); }
        );
      });

    });
  });

  busboy.on('error', function(err){ console.log('error: ', err); });

  return req.pipe(busboy);
};
