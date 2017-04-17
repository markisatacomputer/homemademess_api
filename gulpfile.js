/**
 *  Welcome to your gulpfile!
 *  The gulp tasks are splitted in several files in the gulp directory
 *  because putting all here was really too long
 */

'use strict';

var gulp = require('gulp')
  , nodemon = require('gulp-nodemon')
  , jshint = require('gulp-jshint')
  , localEnv = require('./server/config/local.env.js')
  , _ = require('lodash')

gulp.task('lint', function () {
  gulp.src('server/**/*.js')
    .pipe(jshint())
})

gulp.task('develop', function () {
  var stream = nodemon({
      script: 'server/app.js'
    , ext: 'js'
    , tasks: ['lint']
    , watch: ['server/']
    , delay: 3
    , env: _.assign({
        NODE_ENV: "development",
        PORT: "8666"
      },localEnv)
    })

  stream
    .on('restart', function () {
      console.log('restarted!')
    })
    .on('crash', function() {
      console.error('Application has crashed!\n')
      stream.emit('restart', 10)  // restart the server in 10 seconds
    })
})