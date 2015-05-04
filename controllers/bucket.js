exports.install = function() {
    framework.route('/bucket/', view_buckets);
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