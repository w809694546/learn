(function(root, factory) {
  root.Vue = factory();
})(this, function() {
  function defineProperty(obj, prop, value, def) {
    if(value === void 0) {
      obj[prop] = def;
    } else {
      obj[prop] = value;
    }
  }

  var noop = function(){}

  function observe(data) {
    if(!data || toString.call(data) !== '[object Object]') return;
    return new Observe(data);
  }

  function Observe(data) {
    var _this = this;
    _this.data = data;
    this.walk(data)
  }

  Observe.prototype = {
    walk: function(data) {
      var _this = this;
      Object.keys(data).forEach(function(key) {
        _this.convert(key, data[key]);
      });
    },
    convert: function(key, val) {
      this.defineReactive(this.data, key, val)
    },
    // 监听对象属性值得变化
    defineReactive: function(obj, key, val) {
      Object.defineProperty(obj, key, {
        get: function() {
          return val;
        },
        set: function(newval) {
          if(newval === val) return
          val = newval; // 记录新的值
          observe(newval);
        }
      });
    }
  }

  function Vue(options) {
    this.$options = options || {};
    var data = this._data = options.data;
    var _this = this;
    defineProperty(this, '$render', this.$options.render, noop);
    Object.keys(data).forEach(function(key) {
      _this._proxy(key);
    });
    // 监听data数据， 加入响应式系统
    observe(data);
    this.init();
  }

  Vue.prototype.init = function() {
    var el = this.$options.el;
    if(el !== void 0) {
      this.$mount(el);
    } else {
      
    }
  }

  Vue.prototype.$mount = function(el) {
    // 获取挂载DOM
    this.$el = typeof el === 'string' ? document.querySelector(el) : document.body;
    if(this.$el == null) {
      error('element'+ this.$options.el +'not found');
    }

    // template是否配置
    defineProperty(this, '$template', this.$options.template, this.$el.outerHTML);
    if(this.$render == noop) {
      // render function -> render   virtual DOM
      this.$render = Vue.compile(this.$template);
    }
  }

  Vue.compile = function(template) {

  }

  Vue.prototype._proxy = function(key) {
    var _this = this;
    Object.defineProperty(_this, key, {
      get: function() {
        return _this._data[key];
      },
      set: function(newval) {
        _this._data[key] = newval;
      }
    });
  }

  return Vue
});