app.factory('User', function($resource) {
	return $resource('/user/:id', { id: '@id' });
}).factory('Bucket', function($resource) {
  return $resource('/bucket/:id', { id: '@id' });
});