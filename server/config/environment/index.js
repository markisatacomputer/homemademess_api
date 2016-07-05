'use strict';

var path = require('path');

// All configurations will extend these options
// ============================================
module.exports = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.port || 80,

  // Should we populate the DB with sample data?
  seedDB: process.env.seedDB,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: process.env.secret
  },

  // MongoDB connection options
  mongo: {
    uri: process.env.mongo_uri,
    options: {
      db: {
        safe: true
      }
    }
  }
};
