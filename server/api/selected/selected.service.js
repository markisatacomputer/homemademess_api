'use strict';

var compose = require('composable-middleware');

/**
 * Attaches query conditions to the request
 * Otherwise returns 403
 */
function attachQuery() {
  return compose()
    // Attach user to request
    .use(function(req, res, next) {

      if (req.body.query) {
        if (req.query) {
          Object.assign(req.query, req.body.query);
        } else {
          req.query = req.body.query;
        }
      }

      next();

    });
}

exports.query= attachQuery;