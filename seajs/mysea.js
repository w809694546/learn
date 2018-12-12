(function(root) {
  var data = {
    preload: [], // 存储模块
    cwd: document.URL.match(/[^?]*\//)[0],
    history: {}
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
    varsion: '1.0.0'
  }

  seajs.request = function(uri, callback) {
    var node = document.createElement('script');
    node.src = uri;
    document.body.append(node);
    node.onload = function() {
      node.onload = null;
      document.body.removeChild(node);
      callback();
    }
  }

  function Module(uri, deps) {
    this.uri = uri;
    this.deps = deps || [];
    this.exports = null;
    this.status = 0;
    this._waitings = {};  // 存贮依赖项
    this._remain = 0; // 含有几个未加载的依赖项
  }

  // 模块是否存在于缓存
  Module.get = function(uri, deps) {
    return cache[uri] || (cache[uri] = new Module(uri, deps))
  }

  var isArray = function(arr) {
    return toString.call(arr) === '[object Array]'
  }

  var isFunction = function(fun) {
    return toString.call(fun) === '[object Function]'
  }

  var isString = function(str) {
    return toString.call(str) === '[object String]'
  }

  Module.prototype.load = function() {
    var mod = this;
    mod.status = status.LOADING;
    var uris = mod.resolve(); //获取依赖模块的绝对路径
    var len = mod._remain = uris.length;
    var m;
    for(var i=0; i<len; i++) {
      m = Module.get(uris[i]);
      if(m.status<status.LOADED) {
        m._waitings[mod.uri] = m._waitings[mod.uri] || 1;
      } else {
        mod._remain--
      }
    }

    if(mod._remain == 0) {
      mod.onload(); //第一次调用load方法 并不会让他直接去调用onload方法。
    }

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

  Module.prototype.fetch = function(requestCache) {
    var mod = this;
    mod.status = status.FETCHED;
    var uri = mod.uri;
    requestCache[uri] = sendRequest;  // 发送请求注入script
    function sendRequest() {
      seajs.request(uri, onRequest);
    }

    function onRequest() {// 当前模块的id  deps  uri
      if(anonymousMeta) {
        mod.save(uri, anonymousMeta)
      }
      mod.load(); //递归 检测根目录下的依赖项  是否还有依赖项
    }
  }

  Module.prototype.save = function(uri , meta) {
    var mod = Module.get(uri);
    mod.id = uri;
    mod.deps = meta.deps || [];
    mod.factory = meta.factory;
    mod.status = status.SAVED;
  }

  Module.prototype.onload = function() {
    var mod = this;
    var uris = mod.resolve();
    var len = uris.length;
    mod.status = status.LOADED;
    if(mod.callback) {
      mod.callback();
    }
    _waitings = mod._waitings;
    var uri, m;
    for(uri in _waitings) {
      m = cache[uri];
      m._remain -= _waitings[uri];
      if(m._remain == 0) {
        m.onload();
      }
    }
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
    return emitData.uri || seajs.resolve(emitData.id, refUri);
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
    if(exports === undefined) {
      exports = mod.exports;
    }

    mod.exports = exports;
    return exports
  }

  var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
  var SLASH_RE = /\\\\/g
 
  function parseDependencies(code) {
    var ret = []
  
    code.replace(SLASH_RE, "")
        .replace(REQUIRE_RE, function(m, m1, m2) {
          if (m2) {
            ret.push(m2)
          }
        })
  
    return ret
  }

  root.define = Module.define = function(factory) {
    var deps;
    if(isFunction(factory)) {
      // 调用toString
      deps = parseDependencies(factory.toString());;
    }
    // 存储当前模块的信息
    var meta = {
      id: '',
      uri: '',
      deps: deps,
      factory: factory
    }
    anonymousMeta = meta;
  }

  var _cid = 0;
  function cid() {
    return _cid++;
  }

  // 检测预加载
  Module.preload = function(callback) {
    var len = data.preload.length;
    if(!len) {
      callback();
    }
  }

  function parseAlias(id) {
    var alias = data.alias;
    return alias && isString(alias[id]) ? alias[id] : id;
  }

  // 路径正则，不能以'/' ':'开头，结尾必须是一个'/' 后面至少一个字符
  var path_reg = /^([^\/:]+)(\/.+)$/
  // 检测是否有路径短名称
  function parsePaths(id) {
    var paths = data.paths;
    if(paths && (m = id.match(path_reg)) && isString(paths[m[1]])) {
      id = paths[m[1]]+m[2];
    }
    return id
  }

  function normalize(path) {
    var last = path.length - 1;
    var lastC = path.charAt(last); // 最后一个字符的值
    return (lastC === '/' || path.substring(last-2) === '.js') ? path : path+'.js'
  }

  var dot_reg = /\/\.\//g;
  // 规范路径
  function replacePath(path) {
    return path.replace(dot_reg, '/');
  }

  function addBase(id, uri) {
    var result;
    if(id.charAt(0) === '.') {
      result = replacePath((uri ? uri.match(/[^?]*\//)[0] : data.cwd)+id);
    } else {
      result = data.cwd+id
    }
    return result
  }

  seajs.resolve = function(id, uri) {
    if(!id) {
      return ''
    }
    id = parseAlias(id); // 是否是别名
    id = parsePaths(id); // 是否有路径别名 依赖模块中引包的模块路径地址
    id = normalize(id); // 是否添加后缀
    return addBase(id, uri); // 添加根目录
  }

  seajs.config = function(options) {
    var cur = {};
    for(var key in options) {
      cur[key] = options[key];
      data.history[key] = data.history[key] || [];
      data.history[key].push(cur);
      data[key] = cur[key];
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