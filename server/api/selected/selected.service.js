'use strict';

var compose = require('composable-middleware');

/**
 * Attaches query conditions in request body to the request query property
 *
 */
function attachQuery() {
  return compose()
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