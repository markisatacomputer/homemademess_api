exports.install = function() {
    framework.route('/bucket/', view_buckets);
    framework.route('/bucket/{id}/', view_objects);
    framework.file('All *.jpg', view_image);
};

function view_buckets() {
  var self = this;
  dreamObjects.listBuckets(function(err, data) {
    var list = [];
    if (err) { console.log("Error:", err); }
    else {
      for (var index in data.Buckets) {
        var bucket = data.Buckets[index];
        console.log("Bucket: ", bucket.Name, ' : ', bucket.CreationDate);
        if (bucket.Name != undefined) {
          list.push(bucket);
        }
      }
    }
    self.json(list);
  });
}
function view_objects(id) {
  var self = this;
  dreamObjects.listObjects({Bucket: id}, function(err, data){
    if (err) { console.log("Error:", err); }
    else {
      self.json(data);
    }
  });
}
function view_image(req,res,isValidation) {
  //*
  if (isValidation && req.url.indexOf('.JPG') !== -1 && req.url.indexOf('/object/') !== -1) {
    var path = req.uri.path
    path = path.split('/');
    console.log(path);

    var gm = require('gm');
    var params = {Bucket: path[2], Key: decodeURIComponent(path[3])};
    var local = require('fs').createWriteStream('public/temp.jpg');
    var file = dreamObjects.getObject(params).createReadStream();
    var img = gm(file).resize(400).compress('JPEG').quality(60).stream();

    framework.responseStream(req, res, 'image/jpeg', img, 'temp.jpg');
    //framework.responseImage(req, res, img, function(image){});
  }
  
  /*
  var gm = require('gm');
  var params = {Bucket: id, Key: decodeURIComponent(key)};
  var local = require('fs').createWriteStream('public/temp.jpg');
  var file = dreamObjects.getObject(params).createReadStream();
  var img = gm(file).resize(400).compress('JPEG').quality(60).stream();

  framework.responseStream(req, res, contentType, img, 'temp.jpg');
  framework.responseImage(req, res, img, function(img){
    image.resize('400');
    image.minify();
  });
  */
}