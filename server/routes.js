/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');
var config = require('./config');

module.exports = function(app) {
  //  Require allowed host and origin if set
  if (Array.isArray(config.allow.origin) && config.allow.origin.length > 0 && Array.isArray(config.allow.host)  && config.allow.host.length > 0) {
    app.use(function (req, res, next) {
      var allowed = false,
          host = req.headers.host,
          origin =  req.headers.origin;

      if (config.allow.origin.indexOf(origin) > -1 && config.allow.host.indexOf(host) > -1) {
        allowed = true;
      }

      if (allowed) {
        next();
      } else {
        console.log('not allowed:  host - ' + host + ' origin - ' + origin);
      }
    });
  }
  // API routes
  app.use('/auto', require('./api/auto'));
  app.use('/images', require('./api/image'));
  app.use('/info', require('./api/info'));
  app.use('/select', require('./api/selected'));
  app.use('/tags', require('./api/tag'));
  app.use('/tagged', require('./api/tagged'));
  app.use('/up', require('./api/up'));
  app.use('/file', require('./api/file'));
  app.use('/users', require('./api/user'));

  //  Auth
  app.use('/auth', require('./auth'));

  // All other routes should return an error
  app.route('/*')
    .get(function(req, res) {
      res.json({response: 'where you trying to go?'});
    });
};
