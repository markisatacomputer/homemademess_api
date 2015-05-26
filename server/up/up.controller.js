'use strict';

var _ = require('lodash');
var multer  = require('multer')
var Image = require('../api/image/image.model');

// Get list of images
exports.index = function(req, res) {
  console.log(req.files);
  return res.json(200, req.files);
};