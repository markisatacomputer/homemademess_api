'use strict'

angular.module 'hmm2App'
.config ($stateProvider) ->
  $stateProvider
  .state 'admin',
    url: '/admin'
    templateUrl: 'app/admin/admin.html'
    controller: 'AdminCtrl'

  .state 'admin-users',
    url: '/admin/users'
    templateUrl: 'app/admin/user/user.html'
    controller: 'UserAdminCtrl'
