(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : (global.Vue = factory());
})(this, function() {
  var warn = function(msg) {
    console.error('[Vue Warn]：' + msg);
  }

  var hasOwn = function(parent, key) {
    hasOwnProperty.call(parent, key);
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

  function mergeData(to, form) {
    if(!form) {
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
    } else {  // vue的实例调用
      return mergeInstanceDataFn(parentVal, childVal, vm)
    }
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

  // 选项合并 一个或者多个选项合并
  function mergeOptions(parent, child, vm) {
    // 规范的检测
    checkComponents(child);
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

  var uid = 0;
  function initMixin(Vue) {
    Vue.prototype._init = function(options) {
      var vm = this;
      // 有多少个Vue的实例
      vm._uid = uid++;
      // 选项的合并
      mergeOptions(resolveConstructorOptions(vm.constructor), options, vm);
    }
  }

  function initExtend(Vue) {
    Vue.extend = function(extendOption) {
      extendOption = extendOption || {};
      var _this = this;
      var Sub = function VueComponent() {
        this._init();
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
    components: {},
    directives: {},
    _base: Vue
  }
  return Vue;
});