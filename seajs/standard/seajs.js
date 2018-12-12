/*
* @Author: Max
* @Date:   2018-12-04 20:26:13
* @Last Modified by:   Max
* @Last Modified time: 2018-12-11 22:30:59
* 模块的生命周期
*/
(function( root ){
  var data = {};
  data.history = {};
  var anonymousMeta;  //存储定义模块时的信息  deps
  var cacheMods = {};    //    对象里面
  //模块的生命周期
  var status = {
     FETCHED: 1,   //获取模块的uri
     SAVED: 2,    // 元数据存储在缓存中
     LOADING: 3,   //加载模块的依赖项
     LOADED: 4,   //准备执行依赖项模块
     EXECUTING: 5,  //正在执行  加载模块
     EXECUTED: 6,    // 返回接口对象
  }
 var isArray = function(obj){
   return toString.call(obj) === "[object Array]";
  }
 var isFunction = function(obj){
   return toString.call(obj) === "[object Function]";
 }
  var isString = function(obj){
   return toString.call(obj) === "[object String]";
 }
 var seajs = root.seajs = {
     version:"1.0.0",
  }
 
 seajs.request = function( url, callback ){
    var node = document.createElement("script");
    node.src = url;
    document.body.append(node);
    node.onload = function(){
     node.onload = null;
     document.body.removeChild(node);   //定义a模块  callback怎么获取
     callback();
    }
 }
 //是否使用了别名
 function parseAlias(id){  //a  b
  var alias = data.alias;  //配置
  return alias && isString(alias[id]) ? alias[id] : id;
 }
 
  //不能以"/" ":"开头  结尾必须是一个"/" 后面跟随任意字符至少一个
 var PATHS_RE = /^([^\/:]+)(\/.+)$/;   //([^\/:]+)   路径的短名称配置
 // 是否有路径短名称
 function parsePaths( id ){   //
  var paths = data.paths;  //配置
  if(paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])){
    id = paths[m[1]] + m[2]
  }
  return id;
 }
 
 function normalize(path){
  var last = path.length-1;
  var lastC = path.charAt(last);
  //".js" 6-4
  return (lastC === "/" || path.substring(last-2) === ".js") ? path : path+".js";
 
 }
 
 function addBase( id, uri ){   
   //? ./  ../    app/c   match(/[^?]*\//)[0];
   var result;
   if(id.charAt(0) === "."){
    result = relapath((uri ? uri.match(/[^?]*\//)[0] : data.cwd)+id);
   }else{
    result = data.cwd+id;
   }
   return result;
 }
 
 var DOT_RE = /\/.\//g;   // "/./" => "/"
  //规范路径
 function relapath(path){
  return path.replace(DOT_RE,"/");
 }
//对应模块的绝对路径地址   定义时候的名称   uri 根目录
 seajs.resolve = function( id, uri ){
   if(!id)return "";
   //是否是个别名
   id = parseAlias(id);    //检测是否有别名
   id = parsePaths(id);    // 检测是否有路径别名 依赖模块中引包的模块路径地址 require("app/c");
   id = normalize(id);     //检测是否添加后缀
   return addBase(id, uri);   //添加根目录
 }
 //构造函数
 function Module( uri, deps ){
   this.uri = uri;
   this.deps = deps||[];
   this.exports = null;   //接口对象
   this.status = 0;    //转态
   this._waitings = {};  //我有几个依赖项
   this._remain = 0;   // 未加载的依赖项
 }
 
 Module.prototype.load = function(){
    var mod = this;   //a.js  module    b.js  module
    mod.status = status.LOADING;
    var uris = mod.resolve(); //获取依赖模块的绝对路径
    var len =mod._remain= uris.length;
    var m;
    for(var i=0; i<len; i++ ){
        m = Module.get(uris[i]); //依赖项是否存储在缓存中 ? 取读  : 创建一条记录
        if(m.status < status.LOADED ){
          m._waitings[mod.uri] = m._waitings[mod.uri] || 1;
        }else{
          mod._remain--;
        }
    }
     
    if(mod._remain == 0){   //第一次调用load方法 并不会让他直接去调用onload方法。
      mod.onload();
    };
 
    
   //console.log(mod._remain)  //根目录下的依赖 2  a.js 0   b.js 0
    //进入模块的生命周期
    //准备执行根目录下的依赖项模块
    //依赖项  a  b  
    var requestCache = {};   
    for(var i = 0; i<len; i++ ){
      m = Module.get(uris[i]); 
      //console.log(m.status)
      if(m.status < status.FETCHED){
         m.fetch(requestCache);
      }
    }
 
    for( uri in requestCache){ 
       requestCache[uri]();
    }
 }
  
 Module.prototype.fetch = function(requestCache){
    var mod = this;  //a b
    mod.status = status.FETCHED;
    var uri = mod.uri;
    requestCache[uri] = sendRequest;   //发送请求  注入script
 
    function sendRequest(){
      seajs.request(uri, onRequest);
    }
 
    function onRequest(){    //当前模块的  deps 依赖项
      //console.log(anonymousMeta)
      if(anonymousMeta){
         mod.save(uri,  anonymousMeta);   //更改数据
      }
      mod.load();    //递归   根目录下的依赖项(a b)   (a b)是否还有依赖项  deps
    }
 }
 //加载模块的时候调用此方法
 Module.prototype.onload = function(){
    var mod = this;
    var uris = mod.resolve(); //获取依赖模块的绝对路径
    var len = uris.length;
    mod.status = status.LOADED;
    if(mod.callback){
       mod.callback();
    }
 
    //伪递归
    _waitings = mod._waitings;
    var uri, m ;
    for( uri in _waitings){
      //console.log(uri);   //根目录对应的Module实例对象
      m = cacheMods[uri];
      m._remain -= _waitings[uri];
      if(m._remain == 0){ m.onload()};   //依赖项模块数据已经更新完毕 deps   factory
    }
     
 }
 Module.prototype.save = function(uri, meta ){
    var mod =  Module.get(uri);
    mod.id = uri;
    mod.deps = meta.deps || [];
    mod.factory = meta.factory;
    mod.status = status.SAVED;
 
 }
 
 Module.prototype.resolve = function(){
    var mod = this;
    var ids = mod.deps;    //["./a","./b"]
    var uris = [];  //依赖模块的绝对路径 (地址)
    for(var i = 0; i<ids.length; i++){
       uris[i] = Module.resolve( ids[i], mod.uri );    //绝对路径的地址
    }
    //console.log(uris)
    return uris;
 }
  
 //获取子模块的接口对象
 Module.prototype.exec = function(){
    var mod = this;
    //防止重复执行
    if( mod.status >= status.EXECUTING ){
       return mod.exports;
    }
    mod.status = status.EXECUTING;  //5
    var uri = mod.uri;
    function require(id){
      console.log(require.resolve(id));   //更新过后的数据
      return Module.get(require.resolve(id)).exec();   //获取接口对象
    }
 
    require.resolve = function(id){
      return  Module.resolve(id,uri);  //seajs.resolve
    }
 
    var factory = mod.factory;  
    var exports = isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory;
 
    if(exports === undefined){
        exports = mod.exports; 
    }
    mod.exports = exports;
    mod.status = status.EXECUTED;  //6
    return exports;
 }
 
 Module.resolve = function( id, refUri ){
   var emitDate = {id:id, refUri:refUri};
   //emitDate.uri  模块的地址(绝对路径)
   return  seajs.resolve(emitDate.id, refUri );
 }
 
 //定义模块
 Module.define = function(factory){
   var deps;
   if(isFunction(factory)){
      //调用toString方法   正则解析依赖项
      deps =parseDependencies(factory.toString());   //静态分析
   }
   //存储当前模块的信息
   var meta = {
      id:"",
      uri:"",
      deps:deps,
      factory:factory
   }
   anonymousMeta = meta;
 }
 
  
 //主模块是否存在于缓存   检测的是就根目录这个"模块"是否存在缓存
 Module.get = function(uri, deps ){
 //{"file:///C:/Users/Max/Desktop/seajs/a.js":Module实例对象}
  return cacheMods[uri] ||(cacheMods[uri] = new Module(uri, deps));
 }
 //入口的方法
 Module.use = function( deps, callback, uri ){
   var mod = Module.get(uri, isArray(deps) ? deps: [deps] )
   //依赖项模块都加载完毕
   mod.callback = function(){
     var exports = [];   //所以依赖项模块的接口对象
     var uris = mod.resolve(); //获取依赖模块的绝对路径
     //cacheMods
     for(var i=0; i<uris.length; i++ ){
       exports[i] = cacheMods[uris[i]].exec(); //接口对象
     }
     if(callback){
        callback.apply(root, exports);
     }
   }
   mod.load();  //开启运行模块的生命周期
 }
 
 var _cid = 0;
 function cid(){
   return _cid++;
 };
 
 //data 数组
 data.preload = [];
 //获取当前工作的目录
 data.cwd = document.URL.match(/[^?]*\//)[0];
 Module.preload = function(callback){
   var len = data.preload.length;
   if(!len){callback()}
   //先加载预先设定模块
 };
  
 
 seajs.use = function( ids, callback ){
    //检测有没有预先加载的模块  preload
    Module.preload(function(){
        Module.use(ids, callback, data.cwd+"_use_"+cid() );   //虚拟的根目录
    });  
 }
 
 seajs.config = function( options ){
    var curr;
    for( var key in options ){
      curr =  options[key];
      //记录配置
      data.history[key] = data.history[key] || [];
      data.history[key].push(curr);
 
      data[key] = curr;   //data.alias  data.paths
    }
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
 
 
 root.define = Module.define;
})( this );
 
 
//900+
