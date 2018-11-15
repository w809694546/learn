(function(root) {
  var _ = function(obj) {
    if(!(this instanceof _)){
      return new _(obj);
    }
    this.wrap = obj;
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

  _.max = function(obj) {
    if(obj instanceof Array) {
      return Math.max.apply(null,obj)
    } else {
      var max = -Infinity;
      for(var i in obj) {
        if(obj[i] > max) {
          max = obj[i];
        }
      }
      return max;
    }
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
      var func = obj[name];
      _.prototype[name] = function() {
        var args = [this.wrap];
        Array.prototype.push.apply(args, arguments)
        return func.apply(this, args);
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