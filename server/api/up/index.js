'use strict';

var express = require('express');
var controller = require('./up.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/', auth.hasRole('admin'), controller.index);

module.exports = router;