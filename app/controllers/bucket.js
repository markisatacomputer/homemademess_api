function BucketCtrl($scope, Bucket) {
  $scope.buckets = Bucket.query();
  console.log('buckets');
}