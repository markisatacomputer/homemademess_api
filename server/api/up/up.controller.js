'use strict';

var Queue = require('./up.queue');
var Image = require('../image/image.model');

/*      Process upload
 *
 *    1. CHECK Get exif
 *    2. Write to DB *tmp
 *    3. Push Original to bucket, update db w uri
 *    4. Pipe to derivatives, push to cdn bucket, update db w uri
 *    5. Return Image record for app api use
 */
exports.index = function(req, res) {
  var file = req.files.file;
  // create new image
  var i = new Image();
  // save original filename
  i.filename = file.originalname;
  // temporary - let's make it an hour limit
  i.temporary = Date.now() + 3600000;
  // save the image to db
  i.save(function (err) {
    if (err) {
      console.log(err);
      return res.json(200, err);
    }
    //  add file to upload queue
    Queue.add(file.path, i.id);
    // pass back our image db record
    return res.json(200, i);
  });
};
