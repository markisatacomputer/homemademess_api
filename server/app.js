/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');

// Connect to database
var connection = mongoose.connect(config.mongo.uri, config.mongo.options);

var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync(process.env.KEY_PATH, 'utf8');
var certificate = fs.readFileSync(process.env.CERT_PATH, 'utf8');

var credentials = {key: privateKey, cert: certificate};

// Setup server
var app = express();

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

var socketio = require('socket.io')(httpsServer, {
  path: '/socket.io-client'
});
require('./config/socketio')(socketio);
require('./config/express')(app);
require('./routes')(app);

// Start server
httpServer.listen(process.env.HTTP_PORT, process.env.HOST, function () {
  console.log('Express server listening on %d, in %s mode', process.env.HTTP_PORT, app.get('env'));
  // Schedule cleanup
  require('./components/schedule');
});
httpsServer.listen(process.env.HTTPS_PORT, process.env.HOST, function () {
  console.log('Express server listening on %d, in %s mode', process.env.HTTPS_PORT, app.get('env'));
});

// Expose app
exports = module.exports = app;