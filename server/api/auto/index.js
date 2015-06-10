'use strict';

var express = require('express');
var controller = require('./auto.controller');

var router = express.Router();

router.get('/', controller.autocomplete);


module.exports = router;