(function(root) {
  var _ = function() {
    if(!(this instanceof _)){
      return new _();
    }
  }

  // commonJS规范
  typeof module !== 'undefined' && module.exports ? module.exports = _ : root._ = _;
  // AMD规范
  if(typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return {
        _:_
      }
    });
  }

  // 数组去重
  _.unique = function() {

  }

  _.functions = function(obj) {
    var result = [];
    for(var key in obj) {
      result.push(key);
    }
    return result
  }

  _.isArray = function(isArr) {
    return toString.call(isArr) === '[object Array]';
  }

  _.each = function(obj, callback) {
    if(_.isArray(obj)) {
      for(var k in obj) {
        callback.call(obj, obj[k], k);
      }
    } else {
      for(var k in obj) {
        callback.call(obj, k, obj[k])
      }
    }
  }

  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = obj[name]
      _.prototype[name] = function() {
        func.call(this);
      };
    });
  }

  _.each(['Function', 'String', 'Boolean', 'Number'], function(name) {
    _['is'+name] = function(obj) {
      return toString.call(obj) === '[object '+ name +']'
    }
  })

  _.mixin(_);

})(this)