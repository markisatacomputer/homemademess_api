/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  // API routes
  app.use('/images', require('./api/image'));
  app.use('/tags', require('./api/tag'));
  app.use('/auto', require('./api/auto'));
  app.use('/things', require('./api/thing'));
  app.use('/users', require('./api/user'));
  app.use('/up', require('./api/up'));

  //  Auth
  app.use('/auth', require('./auth'));

  // All other routes should return an error
  app.route('/*')
    .get(function(req, res) {
      res.json({response: 'where you trying to go?'});
    });
};
