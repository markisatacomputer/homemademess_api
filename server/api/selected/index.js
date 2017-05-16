'use strict';

var express = require('express');
var controller = require('./selected.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.post('/', auth.hasRole('admin'), controller.select);
router.delete('/', auth.hasRole('admin'), controller.delete);
router.delete('/:id', auth.hasRole('admin'), controller.deleteOne);
//router.post('/tags', auth.hasRole('admin'), controller.saveTags);
//router.delete('/tags', auth.hasRole('admin'), controller.deleteTags);

module.exports = router;
