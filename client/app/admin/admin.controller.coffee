'use strict'

angular.module 'hmm2App'
.controller 'AdminCtrl', ($scope, $http, Auth) ->

  $scope.dropzoneConfig = {
    url: '/up'
    parallelUploads: 3
    maxFileSize: 40
    acceptedFiles:'image/*'
    autoProcessQueue: false
  }