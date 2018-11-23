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
      case 1: return function(val) {
        return func.call(context, val);
      }
      case 3: return function(val, index, obj) {
        return func.call(context, val, index, obj);
      }
      case 4: return function(memo, val, index, obj) {
        return func.call(context, memo, val, index, obj)
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

  var createReducer = function( dir ) {
    var reduce = function(obj, iteratee, memo, init) {
      var keys = !_.isArray(obj) && _.keys(obj);
      var len = (keys || obj).length;
      var index = dir>0?0:len-1; // 确定方向
      if(!init) {
        memo = obj[ keys ? keys[index] : index];
        index+=dir;
      }
      for(;index>=0 && index<len;index+=dir) {
        var currentkey = keys?keys[index] : index;
        memo = iteratee(memo, obj[currentkey], index, obj);
      }
      return memo;
    }
    return function(obj, iteratee, memo, context) {
      var init = arguments.length >= 3;
      return reduce(obj, optimizeCb(iteratee, context, 4), memo, init);
    }
  }

  _.reduce = createReducer(1); // 1 || -1 dir 从左到右累加还是从右到左累加

  _.times = function(n, iteratee, context) {
    var result = Array(Math.max(0,n));
    iteratee = optimizeCb(iteratee, context, 1);
    for(var i=0; i<result.length; i++) {
      result[i] = iteratee(i);
    }
    return result;
  }

  // 柯里化包装器
  _.restArgs = function(fn) { // fn为需要包装的原函数
    return function() {
      var len = fn.length;
      var startIndex = len - 1; // 最后一个形参的位置
      var args = Array(len);
      var rest = Array.prototype.slice.call(arguments,startIndex);
      for(var i=0;i<startIndex;i++) {
        args[i] = arguments[i];
      }
      args[startIndex] = rest;
      return fn.apply(this, args);
    }
  }

  // 模板解析
  _.templateSettings = {
    // 执行体
    evalute: /<%([\s\S]+?)%>/g,
    // 插入变量
    interpolate: /<%=([\s\S]+?)%>/g,
    // 逃逸
    escape: /<%-([\s\S]+?)%>/g
  }

  _.template = function(text, settings) {
    settings = _.templateSettings;
    var matcher = RegExp([
      settings.escape.source,
      settings.interpolate.source,
      settings.evalute.source].join('|'),'g');
    var source = "_p+='"
    text.replace(matcher, function(match, escape, interpolate, evalute) {
      if(evalute) {

      } else if (interpolate) {
        // 插入变量
        source += "'+\n((_t="+interpolate+")==null?'':_t)+\n'";
      } else if (escape) {

      }
    });
    source += "';"
    if(!settings.variable) source='\nwith(obj||{}){\n'+source+'}\n';
    source="var _t,_p='';"+source+"return _p;\n"
    console.log(source)
    // 渲染函数
    var render = new Function('obj', '_', source);
    return function(data) {
      return render.call(this, data, _)
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

})(this);
