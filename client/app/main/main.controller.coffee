'use strict'

angular.module 'hmm2App'
.controller 'MainCtrl', ($scope, $http, socket) ->
  $scope.awesomeThings = []

  $http.get('/api/images').success (result) ->
    $scope.images = result.images
    $scope.tags = result.tags
    $scope.offset = 0;

  $scope.$on '$destroy', ->
    socket.unsyncUpdates 'thing'
