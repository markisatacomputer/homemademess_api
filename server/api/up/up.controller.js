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

    // create new image doc
    var i = new Image();
    // save original filename
    i.filename = filename;
    // save original filename
    i.mimeType = mimetype;
    // temporary - let's make it an hour limit
    i.temporary = Date.now() + 3600000;

    //  save image doc
    i.save(function(err){
      if (err) { return logErr(err, res); }

      //  add file stream to processing queue and respond
      Queue.add(file, i).then(
        function(data) { return res.json(200, data); },
        function(err) { return res.json(500, err); }
      );
    });
  });

  busboy.on('error', function(err){ logErr(err); });

  return req.pipe(busboy);
};

exports.status = function(req, res) {
  return res.json(200, {
    stack: Queue.stack,
    ready: Queue.ready,
    current: Queue.current
  });
}

