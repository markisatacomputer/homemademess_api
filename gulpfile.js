/**
 *
 *
 */

'use strict';

var gulp = require('gulp')
  , nodemon = require('gulp-nodemon')
  , jshint = require('gulp-jshint')
  , _ = require('lodash')
  , env = require('gulp-env')
  , fs = require('fs')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , spawnP

spawnP = function(command, args) {
  var p;

  fs.open('.env', 'r', (err, fd) => {
    if (!err) {
      env({
        file: '.env'
      })
    }
  });

  p = spawn(command, args)
  p.stdout.on('data', function(data){
    console.log(data.toString());
  })
  p.stderr.on('data', function(data){
    console.log('error: ' + data.toString());
  })
  p.on('exit', function(code){
    console.log('child process exited with code ' + code.toString());
  })
}

gulp.task('lint', function () {
  gulp.src('server/**/*.js')
    .pipe(jshint())
})

gulp.task('develop', function () {
  env({
    file: '.env'
  })


  var stream = nodemon({
      script: 'server/app.js'
    , ext: 'js'
    , tasks: ['lint']
    , watch: ['server/']
    , delay: 3
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

gulp.task( 'seed', function() {
  spawnP('node', ['node gulp/seed.js'])
})

gulp.task( 'fix:dates',  function() {
  spawnP('node', ['gulp/fix.dates.js'])
})
