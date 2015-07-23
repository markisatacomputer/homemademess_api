'use strict'

angular.module 'hmm2App'
.controller 'MainCtrl', ($scope, $http, socket) ->
  # init view
  $scope.view = {}
  
  $http.get('/api/images').success (result) ->
    $scope.view.images = result.images
    $scope.view.tags = result.tags
    $scope.view.offset = 0;

  $scope.$on '$destroy', ->
    socket.unsyncUpdates 'thing'
