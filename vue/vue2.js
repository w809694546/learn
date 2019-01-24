(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : (global.Vue = factory());
})(this, function() {
  var warn = function(msg) {
    console.error('[Vue Warn]：' + msg);
  }

  var warnNonePresent = function(target, key) {
    warn('属性或方法'+key+'未在实例对象上定义');
  }

  function isPlainObject(obj) {
    return toString.call(obj) === '[object Object]'
  }

  var isObject = function(obj) {
    return obj !== null && typeof obj === 'object';
  }

  // 响应式系统核心。将数据对象的属性转化成访问器属性  getter, setter
  function defineReactive(obj, key, val, shallow) {
    var dep = new Dep();
    var property = Object.getOwnPropertyDescriptor(obj, key);
    var getter = property && property.get;
    var setter = property && property.set;
    if((!getter || setter) && arguments.length === 2) {
      val = obj[key]; // 深度观测
    }
    var childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
      get: function() { // 依赖收集
        var value =  getter ? getter.call(obj) : val;
        if(Dep.target) {
          dep.depend(); // 收集依赖
          if(childOb) {
            childOb.dep.depend();
          }
        }
        return value;
      },
      set: function(newVal) { // 调用依赖
        var value = getter ? getter.call(obj) : val;
        if(newVal == value || (value !== value && newVal !== newVal)) {
          return;
        }
        if(setter) {
          setter.call(obj, newVal)
        } else {
          val = newVal;
        }
        childOb = !shallow && observe(val); // 深度观测
        dep.notify()
      }
    });
  }

  var ASSET_TYPES = [
    'component',
    'directive',
    'filter'
  ]

  var LIFECYCLE_HOOKS = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeDestroy',
    'destroyed',
    'activated',  // 内置组件  激活keep-alive
    'deactivated',  // 内置组件  停用keep-alive
    'errorCaptured'
  ]
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = function(parent, key) {
    return hasOwnProperty.call(parent, key);
  }

  function resolveConstructorOptions(Con) {
    var options = Con.options;
    /* 判断 Con.super == vue   TODO*/
    return options;
  }

  function checkComponents(options) {
    for(var key in options.components) {
      validataComponentName(key);
    }
  }

  //  检测key是否在makeMap
  function makeMap(str, tolowercase) {
    var map = {};
    var list = str.split(',');
    for(var i=0; i<list.length; i++) {
      map[list[i]] = true;
    }
    return tolowercase ? function(val) {
      return map[val.toLowerCase()]
    } : function(val) {
      return map[val];
    }
  }

  var isHTMLTag = makeMap(
    'html,body,base,head,link,meta,style,title,' +
    'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
    'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
    'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
    's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
    'embed,object,param,source,canvas,script,noscript,del,ins,' +
    'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
    'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
    'output,progress,select,textarea,' +
    'details,dialog,menu,menuitem,summary,' +
    'content,element,shadow,template,blockquote,iframe,tfoot'
  );

  //保留标签不能注册为组件
  var isSVG = makeMap(
      'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
      'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
      'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
      true
  );

  var allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  );

  var config = {
    // 自定义策略
    optionMergeStrategies: {}
  }
  var strats = config.optionMergeStrategies;
  strats.el = function(parent, child, vm, key) {
    if(!vm) {
      warn('选项'+key+'只能在实例中使用');
    }
    return defaultStrats(parent, child)
  }

  function mergeData(to, from) {
    if(!from) {
      return to;
    }
  }

  function mergeDataOrFn(parentVal, childVal, vm) {
    if(!vm) {
      // 合并处理 parentVal  childVal  
      if(!childVal) {
        return parentVal;
      }
      if(!parentVal) {
        return childVal;
      }
      return function mergeDataFn() {
        // 合并子组件data  父组件data
        return mergeData( typeof childVal === 'function' ? childVal.call(this,this) : childVal,
                          typeof parentVal === 'function' ? parentVal.call(this,this) : parentVal
        )
      }
    } else {
      return function mergeInstanceDataFn() {
        var instanceData = typeof childVal === 'function' ? childVal.call(vm, vm) : childVal;
        var defaultData = typeof parentVal === 'function' ? parentVal.call(vm, vm) : parentVal;
        if(instanceData) {
          return mergeData(instanceData, defaultData)
        } else {
          return defaultData;
        }
      }
    }
  }

  // 自定义策略  Vue.options  options
  strats.data = function(parentVal, childVal, vm) {
    // 区分是组件还是实例
    if(!vm) {  // 组件
      if(childVal && typeof childVal !== 'function') {
        warn('data类型应为function');
      }
      return mergeDataOrFn(parentVal, childVal);
    }
    return mergeDataOrFn(parentVal, childVal, vm);
  }

  function mergeHook(parentVal, childVal) {
    return childVal ? (parentVal ? parentVal.concat(childVal) : (Array.isArray(childVal) ? childVal : [childVal])) : parentVal;
  }

  strats.props = function(parentVal, childVal, vm, key) {
    if(!parentVal) {
      return childVal
    }
    var res = Object.create(null);
    extend(res, parentVal);
    if(childVal) {
      extend(res, childVal)
    }
    return res
  }

  strats.computed = function(parentVal, childVal, vm, key) {
    if(!parentVal) {
      return childVal
    }
    var res = Object.create(null);
    extend(res, parentVal);
    if(childVal) {
      extend(res, childVal)
    }
    return res
  }

  // 钩子自定义策略
  LIFECYCLE_HOOKS.forEach(function(hook) {
    strats[hook] = mergeHook;
  });

  function assetObjectType(key, childVal, vm) {
    if(!isPlainObject(childVal)) {
      warn('选项'+key+'无效，必须为Object');
    }
  }

  function extend(to, from) {
    for(var key in from) {
      to[key] = from[key];
    }
    return to
  }

  function mergeAssets(parentVal, childVal, vm, key) {
    var res = Object.create(parentVal || null);
    if(childVal) {
      assetObjectType(key, childVal, vm);
      return extend(res, childVal);  // res.__proto__ == Vue.options.component
    }
    return res
  }

  // 资源选项  自定义策略
  ASSET_TYPES.forEach(function(type) {
    strats[type+'s'] = mergeAssets;
  });

  // watch选项
  strats.watch = function(parentVal, childVal, vm ,key) {
    if(!childVal) {
      return Object.create(parentVal || null)
    }
    assetObjectType(key, childVal, vl);
    if(!parentVal) {
      return childVal;
    }
    var res = {}
    extend(res, parentVal);
    for(var k in childVal) {
      var parent = res[k];  // 可能为undefined
      var child = child[k];
      if(parent && !Array.isArray(parent)) {
        parent = [parent];
      }
      res[k] = parent ? parent.concat(child) : (Array.isArray(child) ? child : [child]);
    }
    return res
  }
  // 内置标签
  var isBuiltInTag = makeMap('slot,component', true);
  var isReservedTag = function(tag) {
    return isSVG(tag) || isHTMLTag(tag);
  }

  function validataComponentName(key) {
    if(!/^[a-zA-Z][\w-]*$/.test(key)) {
      warn('组件名由字母或横线组成，且必须为字符开头');
    }

    if(isBuiltInTag(key) || isReservedTag(key)) {
      warn('不要使用内置组件或保留的HTML、SVG作为元素'+key);
    }
  }

  function defaultStrats(parent, child) {
    return child === undefined ? parent : child;
  }

  var camelizeReg = /-(\w)/g;
  // 将中横线转换为小驼峰
  function camelize(val) {
    return val.replace(camelizeReg, function(_, c) {
      return c ? c.toUpperCase() : '';
    });
  }

  function normalizeProps(options) {
    var props = options.props;
    if(!props) {
      return;
    }
    var i, key, name;
    var res = {};
    if(Array.isArray(props)) {
      i = props.length;
      while(i--) {
        val = props[i];
        if(typeof val === 'string') {
          name = camelize(val);
          res[name] = {
            type: null
          }
        } else {
          warn('使用数组语法时，props值必须为字符串');
        }
      }
    } else if(isPlainObject(props)) {
      for(key in props) {
        val = props[key];
        name = camelize(key);
        res[name] = isPlainObject(val) ? val : {type: null, default: val}
      }
    } else {
      warn('选项props无效，必须为数组或者对象s');
    }
    options.props = res;
  }

  function normalizeDirective(options) {
    var dirs = options.directives;
    if(dirs) {
      for(var key in dirs) {
        var def = dirs[key];
        if(typeof def === "function") {
          dirs[key] = {
            bind: def,
            update: def
          }
        }
      }
    }
  }

  // 选项合并 一个或者多个选项合并
  function mergeOptions(parent, child, vm) {
    // 规范的检测
    checkComponents(child);
    // 规范props
    normalizeProps(child);
    // 规范directive
    normalizeDirective(child);
    var options = {};
    var k;
    for(k in parent) { // 默认选项
      mergeField(k);
    }
    for(k in child) { // 自定义选项
      if(!hasOwn(parent, k)) {
        mergeField(k);
      }
    }
    // 默认策略
    function mergeField(key) {
      // 以默认为优先，以用户配置为覆盖
      var result = strats[key] || defaultStrats;
      options[key] = result(parent[key], child[key], vm, key)
    }
    return options
  }
  function isNative(Ctor) {
    return typeof Ctor === 'function' && /native code/.test(Proxy.toString());
  }
  var hasProxy = typeof Proxy !== 'undefined' && isNative(Proxy);

  var hasHandler = {
    has: function(target, key) {
      var has = key in target;
      // 全局对象或者渲染函数的内置方法
      var isAllowed = allowedGlobals(key) || (typeof key === 'string' && key.charAt(0) === '_');
      if(!has && !isAllowed) {
        warnNonePresent(target, key);
      }
      return has;
    }
  }

  var getHandler = {
    get: function(target, key) {
      if(typeof key === 'string' && !(key in target)) {
        warnNonePresent(target, key);
      }
      return target[key];
    }
  }

  function initProxy(vm) {
    if(hasProxy) {
      var options = vm.$options;
      // 拦截哪些操作
      var Handlers =  options.render && options.render._withStripped ?  getHandler : hasHandler;
      vm._renderProxy =  new Proxy(vm, Handlers);
    } else {
      vm._renderProxy = vm;
    }
  }

  // 将当前实例添加到父实例的$children中，并设置自身的$parent属性指向父实例
  function initLifeCycle(vm) {
    var options = vm.$options;
    // parent 父实例引用， 父组件
    var parent = options.parent;
    //抽象组件 1：不会出现在子父级路径上  2：不参与DOM的渲染
    if(parent && options.sbstrat) {
      while(parent.$options.abstract && parent.$parent) {
        parent = options.$parent;
      }
      parent.$children.push(vm);
    }
    //设置$root  
    vm.$root = parent ? parent.$root : vm;
 
    vm.$children = []; //当前实例的子组件实例数组
    vm.$refs = {};

    vm._watcher = null;
    vm._inactive = null;
    vm._directInactive = false;
    vm._isMounted = false; //是否挂载
    vm._isDestroyed = false; //是否销毁
    vm._isBeingDestroyed = false; //是否正在销毁
  }

  function callhook(vm, hook) {
    var handlers = vm.$options[hook];
    if(handlers) {
      for(var i=0,len = handlers.length;i<len;i++) {
        handlers[i].call(vm);
      }
    }
  }

  function getData(data, vm) {
    return data.call(vm, vm);
  }

  function isReserved(key) {
    var code = (key+'').charCodeAt(0);
    // $ || _
    return code === 0x24 || code === 0x5F;
  }

  var noop = function(){}

  var shareProperty = {
    enumerable: true,
    configrable: true,
    get: noop,
    set: noop
  }

  function proxy(target, data, key) {
    shareProperty.get = function() {
      return this[data][key]; // vm._data
    }
    shareProperty.set = function(val) {
      this[data][key] = val;
    }
    Object.defineProperty(target, key, shareProperty);
  }

  function initData(vm) {
    var data = vm.$options.data;
    data = vm._data = typeof data === 'function' ? getData(data, vm) : data || {};
    if(!isPlainObject(data)) {
      data = {};
      warn('data选项值应该是Object');
    }
    var keys = Object.keys(data);
    var methods = vm.$options.methods;
    var props = vm.$options.props;
    var len = keys.length;
    while(len--) {
      var key = keys[len];
      if(methods && hasOwn(methods ,key)) {
        warn('methods'+key+'选项已经定义为data的属性');
      } else if(props && hasOwn(props ,key)) {
        warn('props'+key+'选项已经定义为data的属性');
      } else if (!isReserved(key)) {
        proxy(vm, '_data', key);
      }
    }
    observe(data, true);
  }

  var shouldObserve = true;

  function toggleObserve(value) {
    shouldObserve = value;
  }

  function def(obj, key, val) {
    Object.defineProperty(obj, key, { // obj.__ob__
      value: val,
      enumerable: false,
      configrable: true,
    });
  }

  function Dep() {
    this.subs = [];
  }
  Dep.target = null;
  Dep.prototype.depend = function() {

  }

  Dep.prototype.addSub = function(sub) {
    this.subs.push(sub);
  }

  Dep.prototype.notify = function() {
    var subs = this.subs.slice;
    for(var i=0;i<subs.length;i++) {
      subs[i].update();
    }
  }

  function Observe(value) {
    this.vmCount = 0;
    this.value = value;
    this.dep = new Dep(); // 回调列表，存储依赖
    //标志
    def(value, '__ob__', this);
    this.walk(value);
  }

  Observe.prototype.walk = function walk(obj) {
    var keys = Object.keys(obj);
    for(var i=0,len=keys.length;i<len;i++) {
      defineReactive(obj, keys[i]);
    }
  }

  function observe(value, asRootData) {
    if(!isObject(value)) {
      return
    }
    var ob;
    if(hasOwn(value, '__ob__') && value.__ob__ instanceof Observe) {
      ob = value.__ob__;
    } else if(shouldObserve && (Array.isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue) {
      ob = new Observe(value);
    }
    if(ob && asRootData) {
      ob.vmCount++;
    }
    return ob;
  }

  function initState(vm) {
    var opts = vm.$options;
    if(opts.props) {
      initProps(vm, opts.props);
    }
    if(opts.methods) {
      initMethods(vm, opts.methods);
    }
    if(opts.computed) {
      initComputed(vm, opts.computed);
    }
    if(opts.data) {
      initData(vm);
    } else {
      // 响应式系统入口
      observe(vm._data = {}, true);
    }
  }

  var uid = 0;
  function initMixin(Vue) {
    Vue.prototype._init = function(options) {
      var vm = this;
      // 有多少个Vue的实例
      vm._uid = uid++;
      vm._isVue = true;
      // 选项的合并
      vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options, vm);
      initProxy(vm);
      initLifeCycle(vm);
      callhook(vm, 'beforeCreate');
      initState(vm);
    }
  }

  function initExtend(Vue) {
    Vue.extend = function(extendOption) {
      extendOption = extendOption || {};
      var _this = this;
      var Sub = function VueComponent(options) {
        this._init(options);
      }
      Sub.prototype = Object.create(_this.prototype);
      Sub.prototype.constructor = Sub;
      Sub.options = mergeOptions(_this.options, extendOption);
      Sub.extend = _this.extend;
      return Sub;
    }
  }

  function Vue(options) {
    if(!(this instanceof Vue)) {
      warn('Must be use new Vue');
    }
    this._init(options);
  }
  initMixin(Vue); // 选项规范，合并策略
  initExtend(Vue);
  // 全局API
  Vue.options = {
    components: {
      keepAlive: {},
      transition: {},
      transitionGroup: {}
    },
    directives: {},
    _base: Vue
  }
  return Vue;
});