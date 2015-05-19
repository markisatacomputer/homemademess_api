'use strict'

angular.module 'hmm2App'
.controller 'UserAdminCtrl', ($scope, $http, Auth, User) ->

  $http.get '/api/users'
  .success (users) ->
    $scope.users = users

  $scope.delete = (user) ->
    User.remove id: user._id
    _.remove $scope.users, user