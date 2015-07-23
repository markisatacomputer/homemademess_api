'use strict'

angular.module 'hmm2App'
.controller 'NavbarCtrl', ($scope, $location, Auth, $resource) ->
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

  #  Tag-Input Events
  $scope.redoSearch = () ->
    console.log $scope.tags
  #  Autocomplete
  Auto = $resource '/api/auto'
  $scope.findTags = (query) ->
    return Auto.query(query).$promise
