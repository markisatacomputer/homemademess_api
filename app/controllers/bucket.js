function BucketCtrl($scope, Bucket) {
  $scope.buckets = Bucket.query();
  $scope.objects = [];

  $scope.view_bucket = function(id) {
    var objs = Bucket.get({ id: id });
    objs.$promise.then(function(e,r){
      $scope.objects = objs.Contents;
    });
  }
}