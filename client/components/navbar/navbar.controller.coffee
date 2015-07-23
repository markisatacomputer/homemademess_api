'use strict'

angular.module 'hmm2App'
.controller 'NavbarCtrl', ($scope, $location, Auth, $resource, lodash, $q) ->
  $scope.tags = []
  $scope.menu = [
    {
      title: 'admin'
      link: '/admin'
    }
    {
      title: 'users'
      link: '/users'
    }
  ]
  $scope.isCollapsed = true
  $scope.isLoggedIn = Auth.isLoggedIn
  $scope.isAdmin = Auth.isAdmin
  $scope.getCurrentUser = Auth.getCurrentUser

  $scope.logout = ->
    Auth.logout()
    $location.path '/'

  $scope.isActive = (route) ->
    #console.log $location.path()
    route is $location.path()

  #  Map tags to simple array
  $scope.mapTags = (tags) ->
    # return an array of unique values
    lodash.uniq lodash.map tags, '_id'
  
  #  Action to take when tags change
  Images = $resource '/api/images'
  $scope.redoSearch = () ->
    Images.get { tags: $scope.mapTags $scope.tags }, (result) ->
      $scope.view.images = result.images

  #  Autocomplete
  Auto = $resource '/api/auto'
  $scope.findTags = (query) ->
    return Auto.query(query).$promise
