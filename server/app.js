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


var httpsServer = https.createServer(credentials, app);
var socketio = require('socket.io')(httpsServer, {
  serveClient: true,
  path: '/socket.io-client'
});
require('./config/socketio')(socketio);

var httpServer = http.createServer(app);
var socketioHttp = require('socket.io')(httpServer, {
  serveClient: true,
  path: '/socket.io-client'
});
require('./config/socketio')(socketioHttp);

require('./config/express')(app);
require('./routes')(app);

// Start server
var httpPort = process.env.HTTP_PORT || 80;
var httpHost = process.env.IP || 'localhost';
httpServer.listen(httpPort, httpHost, function () {
  console.log('Express server listening on %d, in %s mode', httpPort, app.get('env'));
  // Schedule cleanup
  require('./components/schedule');
});
var httpsPort = process.env.HTTPS_PORT || 443;
var httpsHost = process.env.IP || 'localhost';
httpsServer.listen(httpsPort, httpsHost, function () {
  console.log('Express server listening on %d, in %s mode', httpsPort, app.get('env'));
});

// Expose app
exports = module.exports = app;