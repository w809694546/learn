define(function(require, exports, module) {
  var b = require('app/b');
  console.log(b.age)
  exports.Hello = function() {
    console.log('hello, guys');
  }
});