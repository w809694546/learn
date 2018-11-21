(function(root) {
  var _ = function(obj) {
    if(!(this instanceof _)){
      return new _(obj);
    }
    this.wrap = obj;
  }

  var push = Array.prototype.push;
  var nativeKeys = Object.keys;
  var objProto = Object.prototype;

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

  // 求最大值
  _.max = function(obj) {
    if(obj instanceof Array) {
      return Math.max.apply(null,obj)
    } else if (toString.call(obj) === '[object Object]') {
      var max = -Infinity;
      for(var i in obj) {
        if(obj[i] > max) {
          max = obj[i];
        }
      }
      return max;
    } else {
      throw new Error('参数错误');
    }
  }

  // 求最小值
  _.min = function(obj) {
    if(obj instanceof Array) {
      return Math.max.apply(null,obj)
    } else if (toString.call(obj) === '[object Object]') {
      var min = Infinity;
      for(var i in obj) {
        if(obj[i] < min) {
          min = obj[i];
        }
      }
      return min;
    } else {
      throw new Error('error: your arauments must be Object or Array, please check');
    }
  }

  // 开启链式调用
  _.chain = function(obj) {
    var instance = _(obj);
    instance.chainLabel = true;
    return instance;
  }

  // 关闭链式调用
  _.prototype.value = function() {
    return this.wrap;
  }

  /** 链式开启辅助函数
   * @param data 处理好的数据
   * @param instance 实例对象
  */
  _.assist = function(instance, data) {
    return instance.chainLabel ? _(data).chain() : data;
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

  /**
   * @param obj 目标源
   * @param iteratee 迭代器
   * @param context 绑定的上下文对象，传不传都行
  */
  _.map = function(obj, iteratee, context) {
    var iteratee = cb(iteratee, context);
    var keys = !_.isArray(obj) && _.keys(obj); //传入的是对象的话，返回一个对象键名组成的数组
    var len = (keys || obj).length;
    var result = Array(len);
    for(var index=0;index<len;index++) {
      // Object 存键名  Array 存下标
      var currentkey = keys ? keys[index] : index;
      result[index] = iteratee(obj[currentkey], index, obj);
    }
    return result;
  }

  var cb = function(iteratee, context, args) {
    if(iteratee == null) {
      return _.identity;
    }
    if(_.isObject(iteratee)) {
      return;
    }
    if(_.isFunction(iteratee)) {
      return optimizeCb(iteratee, context, args);
    }
  }

  // 优化回调
  var optimizeCb = function( func, context, args) {
    if(context == void 0) {
      return func;
    }
    switch(args == null ? 3 : args) {
      case 3: return function(val, index, obj) {
        return func.call(context, val, index, obj);
      }
    }
  }

  _.identity = function(value) {
    return value;
  }

  _.keys = function(obj) {
    if(!_.isObject(obj)) {
      return []
    }
    if(nativeKeys) {
      return nativeKeys(obj);
    }
    var keys = [];
    for(var item in obj) {
      keys.push(obj[item]);
    }
    if(hasEnumBug) {
      collect(obj, keys)
    }
    return keys;
  }

  // 判断是否支持for in IE9一下
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  // obj 的不可枚举属性
  var noEnumProps = ['constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf']
  var collect = function(obj, keys) {
    var nElength = noEnumProps.length;
    var constructor = obj.constructor;
    var proto = constructor.prototype || objProto;
    while(nElength--) {
      var key = noEnumProps[nElength];
      if(key in obj && obj[key] !== proto[key]) {
        keys.push(key);
      }
    }
  }

  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = obj[name];
      _.prototype[name] = function() {
        var args = [this.wrap];
        push.apply(args, arguments)
        return _.assist(this, func.apply(this, args));
      };
    });
  }

  _.each(['Function', 'String', 'Boolean', 'Number', 'Object'], function(name) {
    _['is'+name] = function(obj) {
      return toString.call(obj) === '[object '+ name +']'
    }
  })

  _.mixin(_);

})(this)