function BucketCtrl($scope, Bucket, Image) {
  $scope.buckets = Bucket.query();
  $scope.bucket = '';
  $scope.objs = [];
  $scope.obj = {};

  $scope.view_bucket = function(id) {
    var objs = Bucket.get({ id: id });
    objs.$promise.then(function(e,r,d){
      $scope.objs = objs.Contents;
      $scope.bucket = id;
    });
  }

  $scope.view_object = function(id,key) {
    var img = Image.get({id: id, key: key});
    img.$promise.then( function (e,r,d){
      $scope.img = '';
      $scope.img = 'temp.jpg?' + new Date().getTime();
    });
  }
}