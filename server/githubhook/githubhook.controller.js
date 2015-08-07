/**
 *    Github Post Recieve Web Hook
 *         Update the repo and restart service
 */

'use strict';

exports.index = function(req, res) {
  exec("git pull origin master", function(error, stdout, stderr) {
    if (!error) {
      //  send stdout as res
      console.log('updating git repo from origin', stdout);
      res.json(stdout);

      //  restart api service
      exec("restart homemademess-api", function(error, stdout, stderr) {
        if (error) {
          console.log('service restart failed: ', error);
        } else {
          console.log('this log message should never happen because the service will already be restarting before this line of code is executed...');
        }
      });
    } else {
      // things failed :(
      res.json({response: error});
    }
  });
}