'use strict';

var express = require('express');
var controller = require('./selected.controller');
var auth = require('../../auth/auth.service');
var attach = require('../image/image.service');
var insert = require('./selected.service');

var router = express.Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.post('/', auth.hasRole('admin'), insert.query(), attach.conditions(), controller.select);
router.post('/:id', auth.hasRole('admin'), controller.selectOne);
router.delete('/', auth.hasRole('admin'), controller.delete);
router.delete('/:id', auth.hasRole('admin'), controller.deleteOne);
router.post('/tags', auth.hasRole('admin'), controller.saveTags);
router.delete('/tags', auth.hasRole('admin'), controller.deleteTags);

module.exports = router;
