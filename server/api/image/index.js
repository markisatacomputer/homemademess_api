'use strict';

var express = require('express');
var controller = require('./image.controller');
var attach = require('./image.service');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(false), attach.count(), controller.index);
router.get('/:id', auth.isAuthenticated(false), controller.show);
router.post('/', auth.hasRole('admin'), controller.create);
router.put('/:id', auth.hasRole('admin'), controller.update);
router.patch('/:id', auth.hasRole('admin'), controller.update);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);

module.exports = router;