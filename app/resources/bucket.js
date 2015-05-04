app.factory('Bucket', function($resource) {
  return $resource('/bucket/:id', { id: '@id' });
});