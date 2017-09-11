'use strict';

var Queue  = require('./up.queue');
var Image  = require('../image/image.model');
var Busboy = require('busboy');

/*      Process upload
 *
 *    1. CHECK Get exif
 *    2. Write to DB *tmp
 *    3. Push Original to bucket, update db w uri
 *    4. Pipe to derivatives, push to cdn bucket, update db w uri
 *    5. Return Image record for app api use
 */
function logErr (err, res) {
  console.log('Upload Error: ', err);
  return res.json(500, err);
}
exports.index = function(req, res) {
  var busboy, i, saveTo, S3;

  //  stream incoming files
  busboy = new Busboy({ headers: req.headers });

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    var IMG;

    // create new image doc
    IMG = new Image();
    // save original filename
    IMG.filename = filename;
    // temporary - let's make it an hour limit
    IMG.temporary = Date.now() + 3600000;

    //  save image doc
    IMG.save(function(err, data){
      //  send response
      if (err) {
        return res.json(500, err);
      } else {
        //  add file stream to queue and respond
        Queue.add(file, IMG);
        return res.json(200, data);
      }
    });
  });

  //  send errors
  busboy.on('error', function (err){
    logErr(err);
  });

  return req.pipe(busboy);
};

exports.status = function(req, res) {
  return res.json(200, {
    stack: Queue.stack,
    current: Queue.current
  });
}

