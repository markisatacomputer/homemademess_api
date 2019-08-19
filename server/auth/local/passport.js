var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Tag = require('../../api/tag/tag.model');

exports.setup = function (User, config) {
  passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password' // this is the virtual field on the model
    },
    function(email, password, done) {
      //  First check for download link authentication
      Tag.findOne({
        _id: password
      }, function(err, tag) {
        if (err) console.log('Error in authentication process - Tag check', err);
        if (tag && tag.text == email) return done(null, {_id: password, role: 'download'});

        //  Failing that check for a real user
        User.findOne({
          email: email.toLowerCase()
        }, function(err, user) {
          if (err) return done(err);

          if (!user) {
            return done(null, false, { message: 'This email is not registered.' });
          }
          if (!user.authenticate(password)) {
            return done(null, false, { message: 'This password is not correct.' });
          }
          return done(null, user);
        });

      });


    }
  ));
};