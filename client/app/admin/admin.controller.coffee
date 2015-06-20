'use strict'

angular.module 'hmm2App'
.controller 'AdminCtrl', ($scope, Auth, $state, $resource, socket, $q) ->  
  ###
        DROPZONE
  ###
  
  #   Config
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
      $('div.drop').removeClass 'notempty'
    else
      $('div.drop').addClass 'notempty'
  #  Image successfully added to dropzone and processed by upload api
  $scope.success = (file, res) ->
    #  Add image to model and watch
    image = res
    imageId = if image.id then image.id else image._id
    $scope.files[imageId] = image
    socket.syncUpdatesObj 'image', $scope.files
    socket.syncUploadProgress imageId, $scope.filesInProgress
    
    #  Image orientation class
    if image.orientation
      $ file.previewElement 
      .find '.dz-image'
      .addClass 'image-orientation-' + image.orientation
    #  Select listener
    if imageId
      $ file.previewElement
      .attr 'id', imageId
      .on 'click', (event) ->
        #  toggle class
        id = $ event.currentTarget
        .toggleClass 'selected'
        .attr 'id'
        #  track selected
        $scope.imageClick id, $scope
        #  keep editor current
        $scope.updateEditor()
  
  #  Update S3 upload Progress
  $scope.$watchCollection 'filesInProgress', (newValues, oldValues) ->
    angular.forEach newValues, (progress, key) ->
      # insert progress bar if nonexistant
      if !oldValues[key]
        $ '#'+key
        .addClass 'inProgress'
        .prepend '<div class="s3progress"><p class="percentage"></p></div>'
      
      # update percentage
      $ '#'+key+' .s3progress .percentage'
      .text progress+'%'
      
      # complete
      if progress == 100
        $ '#'+key 
        .removeClass 'inProgress'
        .addClass 'complete'


  ###
            EDITOR
  ###
  
  #  Init vars
  $scope.files = {}
  $scope.filesInProgress = {}
  $scope.fileSelected = []
  $scope.imageTitle = ''
  $scope.imageDesc = ''
  $scope.tags
  $scope.allTags = {}
  Tags = $resource '/api/tags'
  Auto = $resource '/api/auto'

  #  Image Selection
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

  #  Check if all the selected images have the same value for an attribue
  allSame = (attr) ->
    # we must return a promise here - must have something to do with angular.forEach
    return $q (resolve, reject) ->
      value = 0
      angular.forEach $scope.fileSelected, (id, key) ->
        if value == 0
          value = $scope.files[id][attr]
        if value != $scope.files[id][attr]
          resolve false
      resolve true
  
  #  Keep Editor view updated
  $scope.updateEditor = () ->
    $scope.$apply () ->
      $scope.tags = $scope.getTagsFromSelected()
      #  Nothing selected - make em empty
      if $scope.fileSelected.length == 0
        $scope.imageTitle = ''
        $scope.imageDesc = ''
      #  One selected - use it's values
      if $scope.fileSelected.length == 1
        $scope.imageTitle = $scope.files[$scope.fileSelected[0]].name
        $scope.imageDesc = $scope.files[$scope.fileSelected[0]].description
      #  Multiple selected - if they're the same us that value
      if $scope.fileSelected.length > 1
        allSame 'name'
        .then (s) ->
          if s
            $scope.imageTitle = $scope.files[$scope.fileSelected[0]].name;
          if !s
            $scope.imageTitle = ''
        allSame 'description'
        .then (s) ->
          if s
            $scope.imageDesc = $scope.files[$scope.fileSelected[0]].description;
          if !s
            $scope.imageDesc = ''

  #  Write Name and Description to selected images
  $scope.$watch 'imageTitle', (newValue, oldValue) ->
    if newValue != oldValue and newValue != ''
      angular.forEach $scope.fileSelected, (id, key) ->
        $scope.files[id].name = newValue
  $scope.$watch 'imageDesc', (newValue, oldValue) ->
    if newValue != oldValue and newValue != ''
      angular.forEach $scope.fileSelected, (id, key) ->
        $scope.files[id].description = newValue
  
  #  Tag-Input Events
  $scope.tagAdded = (tag) ->
    #  create new tag if it doesn't exist
    if !tag._id
      newTag = new Tags(tag)
      newTag.$save (saved) ->
        angular.extend tag, saved
        $scope.addTagtoSelected tag
        $scope.allTags[tag._id] = tag
    #  save existing tag to model and allTags
    else
      $scope.addTagtoSelected tag
      $scope.allTags[tag._id] = tag
  $scope.tagRemoved = (tag) ->
    $scope.removeTagFromSelected tag
  #  Autocomplete
  $scope.findTags = (query) ->
    return Auto.query(query).$promise
  #  Add Tags
  $scope.addTagtoSelected = (tag) ->
    angular.forEach $scope.fileSelected, (id, key) ->
      $scope.files[id].tags.push tag._id
  #  Load Tags into editor
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
  #  Remove tags
  $scope.removeTagFromSelected = (tag) ->
    #  make sure our records don't save these tags to the db
    angular.forEach $scope.fileSelected, (id, key) ->
      i = $scope.files[id].tags.indexOf tag._id
      if i > -1
        $scope.files[id].tags.splice i, 1

  #  Remove Selected Images
  $scope.removeSelected = () ->
    angular.forEach $scope.fileSelected, (id, key) ->
      socket.socket.emit 'image:remove', id
    