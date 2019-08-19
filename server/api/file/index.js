'use strict';

var express = require('express');
var controller = require('./file.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/:id', auth.isAuthenticated(), controller.one);
router.post('/', auth.hasRole('admin'), controller.many);

module.exports = router;