'use strict'

angular.module 'hmm2App'
.controller 'AdminCtrl', ($scope, $http, Auth, $state) ->
  $scope.files = []

  $scope.dragover = (event) ->
    $ 'div.drop' 
    .addClass 'over'
  $scope.dragleave = (event) ->
    $ 'div.drop' 
    .removeClass 'over'
  $scope.filechange = (file) ->
    images = $('div.drop form[name="image-details"]').children()
    if $.isEmptyObject images
      #$('div.dz-message').hide()
      $('div.drop').removeClass 'notempty'
    else
      #$('div.dz-message').show()
      $('div.drop').addClass 'notempty'
  $scope.thumbnail = (file, datauri) ->
    # more here
  $scope.success = (file, res) ->
    image = angular.extend {}, file, res
    $scope.files.push image
    if image.orientation
      $ file.previewElement 
      .find '.dz-image'
      .addClass 'image-orientation-' + image.orientation

  $scope.dropzoneConfig = {
    url: '/up'
    previewsContainer: 'form.dropzone[name="image-details"]'
    parallelUploads: 3
    maxFileSize: 40
    acceptedFiles:'image/*'
    #autoProcessQueue: false
    init: () ->
      this.on 'dragover', $scope.dragover
      this.on 'dragleave', $scope.dragleave
      this.on 'drop', $scope.dragleave
      this.on 'addedfile', $scope.filechange
      this.on 'removedfile', $scope.filechange
      this.on 'thumbnail', $scope.thumbnail
      this.on 'success', $scope.success
      $scope.dz = this
  }


