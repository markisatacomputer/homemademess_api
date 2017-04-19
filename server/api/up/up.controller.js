'use strict';

var Queue = require('./up.queue');
var Image = require('../image/image.model');
var exif   = require('./up.exif');

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
  var file = req.files.file;
  // create new image
  var i = new Image();
  // save original filename
  i.filename = file.originalname;
  // temporary - let's make it an hour limit
  i.temporary = Date.now() + 3600000;
  //  get exif and save
  exif.extract(file.path, i).then(
    function (doc) {
      //  add file to upload queue
      Queue.add(file.path, i.id);
      //  respond to request
      return res.json(200, doc);
    },
    function (err) { return logErr(err, res); }
  );
};
