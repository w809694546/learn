(function(root) {
  var data = {
    preload: [], // 存储模块
    cwd: document.URL.match(/[^?]*\//)[0]
  };
  var cache = {};
  var anonymousMeta; // 存储定义模块时的信息
  var status = {
    FETCHED: 1, //获取模块的uri
    SAVED: 2, // 元数据存储在缓存中
    LOADING: 3, //加载模块的依赖项,
    LOADED: 4, // 加载完成，准备执行以来模块
    EXECUTING: 5, //加载依赖项模块
    EXECTED: 6 // 返回接口对象
  }

  var seajs = root.seajs = {
    varsion: '1.0.0',
    request: function(uri, callback) {
      var node = document.createElement('script');
      node.src = uri;
      document.body.append(node);
      node.onload = function() {
        node.onload = null;
        document.body.removeChild(node);
      }
    }
  }

  function Module(uri, deps) {
    this.uri = uri;
    this.deps = deps || [];
    this.exports = null;
    this.status = 0;
    this._waitings = {};  // 存贮依赖项
  }

  // 模块是否存在于缓存
  Module.get = function(uri, deps) {
    return cache[uri] || (cache[uri] = new Module(uri, deps))
  }

  var isArray = function(arr) {
    return toString.call(arr) === '[object Array]'
  }

  var isFunction = function(fun) {
    return toString.call(func) === '[object Function]'
  }

  Module.prototype.load = function() {
    var mod = this;
    mod.status = status.LOADING;
    var uris = mod.resolve(); //获取依赖模块的绝对路径
    var len = uris.length;
    var m;
    for(var i=0; i<len; i++) {
       m = Module.get(uris[i]);
       if(m.status<status.LOADING) {
         m._waitings[uris[i]] = m._waitings[uris[i]] || 0;
       }
    }
    mod.onload();

    var requestCache = {};
    for(var j=0;j<len; j++) {
      m = Module.get(uris[j]);
      if(m.status< status.FETCHED) {
        m.fetch(requestCache);
      }
    }

    for(uri in requestCache) {
      requestCache[uri]();
    }
  }

  Module.prototype.fetch = function() {
    var mod = this;
    mod.status = status.FETCHED;
    var uri = mod.uri;
    requestCache[uri] = sendRequest;  // 发送请求注入script

    function sendRequest() {
      seajs.request(uri, onRequest)
    }

    function onRequest() {// 当前模块的id  deps  uri
      if(anonymousMeta) {

      }
    }
  }

  Module.prototype.onload = function() {
    var mod = this;
    var uris = mod.resolve();
    var len = uris.length;
    mod.status = status.LOADED;
  }

  Module.prototype.resolve = function() {
    var mod = this;
    var ids = mod.deps;
    var uris = []; //所有依赖模块的绝对路径
    for(var i=0; i< ids.length; i++) {
      uris[i] = Module.resolve(ids[i], mod.uri); //生成地址
    }
    return uris
  }
  Module.resolve = function(id, refUri) {
    var emitData = {id:id, refUri:refUri}
    return emitData.uri
    // return emitData.uri || seajs.resolve(emitData.id, refUri);
  }
  // 入口方法
  Module.use = function(deps, callback, uri) {
    var mod = Module.get(uri, isArray(deps)?deps:[deps]);
    // 依赖项的模块都加载完毕
    mod.callback = function() {
      var exports = []; // 所有依赖项的接口对象
      var uris = mod.resolve();
      for(var i=0; i<uris.length; i++) {
        exports[i] = cache[uris[i]].exec();
      }
      if(callback) {
        callback.apply(root, exports);
      }
    }
    mod.load(); // 运行模块的生命周期
  }

  // 获取子模块的接口对象
  Module.prototype.exec = function() {
    var mod = this;
    // 防止重复执行
    if(mod.status >= 5) {
      return mod.exports;
    }
    mod.status = status.EXECUTING;
    var uri = mod.uri;
    function require(id) {
      return Module.get(require.resolve(id)).exec();
    }

    require.resolve = function(id) {
      return Module.resolve(id, uri);
    }

    var factory = mod.factory;
    var exports = isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory;

    if(exports === void 0) {
      exports = mod.exports;
    }

    mod.exports = exports;
    return exports
  }

  root.define = Module.define = function(factory) {
    var deps;
    if(isFunction(factory)) {
      // 调用toString
      deps = [];
    }
    // 存储当前模块的信息
    var meta = {
      id: '',
      uri: '',
      deps: deps,
      factory: factory
    }
    var anonymousMeta = meta;
  }

  var _cid = 0;
  function cid() {
    return _cid++;
  }

  // 检测预加载
  Module.preload = function(callback) {
    var len = data.preload.length;
    if(len === 0) {
      callback();
    }
  }

  /**
   *  @param deps
   * */
  seajs.use = function(deps, callback) {
    // 检测有没有预先加载的模块 preload
    Module.preload(function() {
      Module.use(deps, callback, data.cwd+'_use_'+cid()); //虚拟根目录
    });
  }
})(this);