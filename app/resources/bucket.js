app.factory('Bucket', function($resource) {
  return $resource('/bucket/:id/', { id: '@id' });
}).factory('Image', function($resource) {
  return $resource('/object/:id/:key/');
});