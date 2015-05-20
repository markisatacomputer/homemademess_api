'use strict'

angular.module 'hmm2App'
.controller 'AdminCtrl', ($scope, $http, Auth, $state) ->
  #   Are we allowed to be here?
  $scope.checkAuth = () ->
    Auth.isLoggedInAsync (ili) ->
      if !ili || !Auth.isAdmin
        $state.go 'login'
  $scope.checkAuth()

  $scope.files = []

  $scope.dragover = (event) ->
    $ 'div.drop' 
    .css 'background-color', '#999'
  $scope.dragleave = (event) ->
    $ 'div.drop'
    .css 'background-color', 'rgba(0,0,0,0)'
  $scope.addedfile = (file) ->
    $scope.files.push file
    $ 'div.dz-message' 
    .hide()

  $scope.dropzoneConfig = {
    url: '/up'
    previewsContainer: 'form.preview[name="image-details"]'
    parallelUploads: 3
    maxFileSize: 40
    acceptedFiles:'image/*'
    autoProcessQueue: false
    init: () ->
      this.on 'dragover', $scope.dragover
      this.on 'dragleave', $scope.dragleave
      this.on 'addedfile', $scope.addedfile
      $scope.dz = this
  }


