'use strict';

var path = require('path');

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
  }
};
