'use strict';

var express = require('express');
var controller = require('./tagged.controller');

var router = express.Router();

router.get('/:tag', controller.tagged);

module.exports = router;