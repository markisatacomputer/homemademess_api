exports.install = function() {
    framework.route('/bucket/', view_buckets);
    framework.route('/bucket/{id}/', view_objects);
    framework.route('/bucket/{id}/{key}/image', view_image);
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
  var gm = require('gm');
  var params = {Bucket: id, Key: decodeURIComponent(key)};
  var local = require('fs').createWriteStream('public/temp.jpg');
  var file = dreamObjects.getObject(params).createReadStream();
  var img = gm(file);
  // image manipulations
  img.resize(400).compress('JPEG').quality(60).stream().on('data', function(d){
    local.write(d);
  }).on('end', function(){
    local.end();
    self.json({message:'hello'});
  }).on('error', function() { 
    console.log(':(');
    console.log('stream didn\'t work');
  });
}