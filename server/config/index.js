'use strict';

var path = require('path');
var origin;
var host;

if (typeof process.env.ALLOWED_ORIGIN == 'undefined') {
  origin = [];
} else {
  origin = process.env.ALLOWED_ORIGIN.split(' ');
}

if (typeof process.env.ALLOWED_HOST == 'undefined') {
  host = [];
} else {
  host = process.env.ALLOWED_HOST.split(' ');
}

// All configurations will extend these options
// ============================================
module.exports = {
  env: process.env.NODE_ENV || 'dev',

  // Root path of server
  root: path.normalize(__dirname + '/../..'),

  // Server port
  port: process.env.PORT || 80,

  // domain aliases?
  thumbAlias: process.env.THUMB_DOMAIN_ALIAS || false,
  originalAlias: process.env.ORIGINAL_DOMAIN_ALIAS || false,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: process.env.SESSION_SECRET
  },

  // List of user roles
  userRoles: ['guest', 'user', 'admin'],

  // MongoDB connection options
  mongo: {
    uri: process.env.MONGO || 'mongodb://localhost/hmm-dev',
    options: {
      db: {
        safe: true
      }
    }
  },

  //  Allowed origins - should be an array
  allow: {
    origin: origin,
    host: host
  }
};
