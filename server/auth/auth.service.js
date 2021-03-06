'use strict';

var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var compose = require('composable-middleware');
var User = require('../api/user/user.model');
var Tag = require('../api/tag/tag.model');
var validateJwt = expressJwt({ secret: config.secrets.session });

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
function isAuthenticated(required) {
  return compose()
    // Validate jwt
    .use(function(req, res, next) {
      // allow access_token to be passed through query parameter as well
      if(req.query && req.query.hasOwnProperty('access_token')) {
        req.headers.authorization = 'Bearer ' + req.query.access_token;
      }
      //  if not required, and no header, skip authorization
      if ( typeof req.headers.authorization === 'undefined'  && required === false) {
        next();
      } else {
        validateJwt(req, res, next);
      }
    })
    // Attach user to request
    .use(function(req, res, next) {
      //  if not required, and no header, skip authorization
      if (typeof req.headers.authorization === 'undefined'  && required === false) {
        req.user = {role: 'anon'};
        next();
      } else {
        User.findById(req.user._id, function (err, user) {
          if (err) return next(err);

          //  Look for tag if no user exists...
          if (!user) {
            Tag.findOne({
              _id: req.user._id
            }, function(err, tag) {
              if (err) console.log('Error in isAuthenticated - Tag.findOne', err);
              if (!tag) return res.send(401);
              req.user = {_id: tag._id, role: 'download'};
              return next();
            });
          //  Return User
          } else {
            req.user = user;
            next();
          }

        });
      }
    });
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
function hasRole(roleRequired) {
  if (!roleRequired) throw new Error('Required role needs to be set');

  return compose()
    .use(isAuthenticated())
    .use(function meetsRequirements(req, res, next) {
      if (config.userRoles.indexOf(req.user.role) >= config.userRoles.indexOf(roleRequired)) {
        next();
      }
      else {
        res.send(403);
      }
    });
}

/**
 * Returns a jwt token signed by the app secret
 */
function signToken(id) {
  return jwt.sign({ _id: id }, config.secrets.session, { expiresIn: "5h" });
}

/**
 * Set token cookie directly for oAuth strategies
 */
function setTokenCookie(req, res) {
  if (!req.user) return res.json(404, { message: 'Something went wrong, please try again.'});
  var token = signToken(req.user._id, req.user.role);
  res.cookie('token', JSON.stringify(token));
  res.redirect('/');
}

exports.isAuthenticated = isAuthenticated;
exports.hasRole = hasRole;
exports.signToken = signToken;
exports.setTokenCookie = setTokenCookie;