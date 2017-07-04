/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  // API routes
  app.use('/auto', require('./api/auto'));
  app.use('/images', require('./api/image'));
  app.use('/info', require('./api/info'));
  app.use('/select', require('./api/selected'));
  app.use('/tags', require('./api/tag'));
  app.use('/tagged', require('./api/tagged'));
  app.use('/up', require('./api/up'));
  app.use('/users', require('./api/user'));

  //  Auth
  app.use('/auth', require('./auth'));

  // All other routes should return an error
  app.route('/*')
    .get(function(req, res) {
      res.json({response: 'where you trying to go?'});
    });
};
