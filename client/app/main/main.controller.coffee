'use strict'

angular.module 'hmm2App'
.controller 'MainCtrl', ($scope, $http, socket) ->
  $scope.awesomeThings = []

  $http.get('/api/images').success (images) ->
    $scope.images = images

  $scope.$on '$destroy', ->
    socket.unsyncUpdates 'thing'
