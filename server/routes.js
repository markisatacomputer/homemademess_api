/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  // Insert routes below
  app.use('/api/images', require('./api/image'));
  app.use('/api/tags', require('./api/tag'));
  app.use('/api/auto', require('./api/auto'));
  app.use('/api/things', require('./api/thing'));
  app.use('/api/users', require('./api/user'));
  
  // This might need to be moved out of api for clarity
  app.use('/up', require('./api/up'));

  app.use('/auth', require('./auth'));

  // All other routes should return an error
  app.route('/*')
    .get(function(req, res) {
      res.json({response: 'where you trying to go?'});
    });
};
