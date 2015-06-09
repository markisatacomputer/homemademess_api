'use strict'

angular.module 'hmm2App'
.controller 'AdminCtrl', ($scope, $http, Auth, $state, $resource) ->
  #  Init vars
  $scope.files = {}
  $scope.fileSelected = []
  $scope.imageTitle = ''
  $scope.imageDesc = ''
  $scope.tags
  $scope.allTags = {}
  Tags = $resource('/api/tags');
  Auto = $resource('/api/auto/:tag');

  #  Dropzone Event Functions
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
  $scope.success = (file, res) ->
    image = angular.extend {}, file, res
    $scope.files[image._id] = image
    #  Image orientation class
    if image.orientation
      $ file.previewElement 
      .find '.dz-image'
      .addClass 'image-orientation-' + image.orientation
    #  Select listener
    if image._id
      $ file.previewElement
      .attr 'id', image._id
      .on 'click', (event) ->
        #  toggle class
        id = $ event.currentTarget
        .toggleClass 'selected'
        .attr 'id'
        #  track selected
        $scope.imageClick id, $scope
        #  keep editor current
        $scope.updateEditor()

  $scope.imageClick = (id, $scope) ->
    $scope.$apply () ->
      # add/remove from selected array
      i = $scope.fileSelected.indexOf id
      if i == -1
        $scope.fileSelected.push id
      else
        $scope.fileSelected.splice i, 1
      
      # indicate if drop zone has selected
      if $scope.fileSelected.length > 0
        $ '.drop'
        .addClass 'has-selected'
      else
        $ '.drop'
        .removeClass 'has-selected'

  $scope.updateEditor = () ->
    $scope.$apply () ->
      $scope.tags = $scope.getTagsFromSelected()

  #  Tag-Input Events
  $scope.tagAdded = (tag) ->
    #  create new tag if it doesn't exist
    if !tag._id
      newTag = new Tags(tag)
      newTag.$save (saved) ->
        angular.extend tag, saved
        $scope.addTagtoSelected tag
        $scope.allTags[tag._id] = tag
  $scope.tagRemoved = (tag) ->
    $scope.removeTagFromSelected tag

  #  Autocomplete
  $scope.findTags = (query) ->
    return Auto.query().$promise

  $scope.addTagtoSelected = (tag) ->
    angular.forEach $scope.fileSelected, (id, key) ->
      $scope.files[id].tags.push tag._id
  $scope.getTagsFromSelected = () ->
    uniq = {}
    #  get all tags from all selected Images
    angular.forEach $scope.fileSelected, (id, key) ->
      #  no repeats allowed
      uniq[key] = 1 for key in $scope.files[id].tags
    tags = Object.keys(uniq)

    #  transform each id to it's full object
    angular.forEach tags, (id, key) ->
      if $scope.allTags[id]
        tags[key] = $scope.allTags[id]
      else
        console.log 'Error: Somehow a tag was lost...'
        tags.splice key, 1
    return tags
  $scope.removeTagFromSelected = (tag) ->
    #  make sure our records don't save these tags to the db
    angular.forEach $scope.fileSelected, (id, key) ->
      i = $scope.files[id].tags.indexOf tag._id
      if i > -1
        $scope.files[id].tags.splice i, 1

  #   Dropzone Config
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
      this.on 'success', $scope.success
      $scope.dz = this
  }


