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
  , spawnProcess
  , taskfiles

spawnProcess = function(command, args) {
  var p;

  fs.open('.env.json', 'r', (err, fd) => {
    if (!err) {
      env({
        file: '.env.json'
      })
    } else {
      console.log(err);
    }

    p = spawn(command, args)
    p.stdout.on('data', function(data){
      console.log(data.toString());
    })
    p.stderr.on('data', function(data){
      console.log('error: ' + data.toString());
    })
    p.on('exit', function(code){
      //console.log('child process exited with code ' + code.toString());
    })
  });
}

//  Specific scripts from gulp dir
taskfiles = fs.readdirSync('gulp')
taskfiles.forEach( (filename) => {
  var file = filename.split('.');

  if (file[1] == 'js') {
    gulp.task( file[0], function() {
      spawnProcess('node', ['gulp/'+filename])
    })
  }
})



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