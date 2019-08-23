'use strict';

var express = require('express');
var controller = require('./selected.controller');
var auth = require('../../auth/auth.service');
var attach = require('../image/image.service');
var insert = require('./selected.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.index);
router.post('/', auth.isAuthenticated(), insert.query(), attach.conditions(), controller.select);
router.post('/:id', auth.isAuthenticated(), controller.selectOne);
router.delete('/', auth.isAuthenticated(), insert.query(), attach.conditions(), controller.delete);
router.delete('/:id', auth.isAuthenticated(), controller.deleteOne);
router.get('/tags', auth.hasRole('admin'), controller.getTags);
router.post('/tags', auth.hasRole('admin'), controller.saveTags);
router.delete('/tags/:id', auth.hasRole('admin'), controller.deleteTags);
router.delete('/images', auth.hasRole('admin'), controller.deleteSelectedImages);

module.exports = router;
