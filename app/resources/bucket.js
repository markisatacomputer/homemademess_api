app.factory('Bucket', function($resource) {
  return $resource('/bucket/:id/:key/', { id: '@id' });
}).factory('Image', function($resource) {
  return $resource('/bucket/:id/:key/image/');
});