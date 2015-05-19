exports.install = function() {
    framework.route('/bucket/', view_buckets);
    framework.route('/bucket/{id}/', view_objects);
    framework.route('/bucket/{id}/{key}/img/', view_image);
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
function view_image(id,key) {
  var self = this;
  
  // get image from DreamObjects
  var params = {Bucket: id, Key: decodeURIComponent(key)};
  var file = dreamObjects.getObject(params).createReadStream();
  
  //  transform on the way to local file
  var gm = require('gm');
  var img = gm(file).resize(400).compress('JPEG').quality(60).stream(function (err, stdout, stderr) {
    // local temp path
    var local = require('fs').createWriteStream('public/temp.jpg');
    // notify client when we're done writing local
    local.on('finish', function(){
      self.json({message: 'booya'});
    });
    // write to local
    stdout.pipe(local);
  });  
}