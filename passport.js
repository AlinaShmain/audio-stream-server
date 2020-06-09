// const LocalStrategy = require('passport-local').Strategy;
//
// module.exports = function (passport) {
//
//     passport.serializeUser(function (user, done) {
//         done(null, user.id);
//     });
//
//     passport.deserializeUser(function (id, done) {
//         // connection.query("select * from users where id = "+id,function(err,rows){
//         //     done(err, rows[0]);
//         // });
//     });
//
//     passport.use('local-signup', new LocalStrategy({
//             // by default, local strategy uses username and password, we will override with email
//             usernameField: 'email',
//             passwordField: 'password',
//             passReqToCallback: true // allows us to pass back the entire request to the callback
//         },
//         function (req, email, password, done) {
//
//         })
//     );
// };