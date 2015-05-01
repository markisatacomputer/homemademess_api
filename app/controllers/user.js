function UserCtrl($scope, User) {

    $scope.users = User.query();
    $scope.isForm = false;

    $scope.edit = function(id) {   
    	$scope.user = User.get({ id: id });
    	$scope.isForm = true;
    };

    $scope.save = function() {
    	var refresh = function() {
        $scope.users = User.query();
      };
      if ($scope.user._id ) {
        $scope.user.$save({ id: $scope.user._id }, refresh);
        $scope.isForm = false;
      } else {
        $scope.user.$save(refresh);
        $scope.isForm = false;
      }
    };

    $scope.cancel = function() {
    	$scope.isForm = false;
    };
    
    $scope.create = function() {
      $scope.user = new User;
      $scope.isForm = true;
    };

    $scope.delete = function(id) {
		
		User.delete({ id: id }, function() {
			// Refresh users
			// $scope.users = User.query();
			alert('User was removed.');
		});

    	$scope.isForm = false;
    };

}