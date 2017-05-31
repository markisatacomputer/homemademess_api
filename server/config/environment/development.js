'use strict';

// Development specific configuration
// ==================================
module.exports = {
  // MongoDB connection options
  mongo: {
    uri: process.env.MONGO || 'mongodb://localhost/hmm-dev'
  },

  seedDB: true
};
