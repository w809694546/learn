(function(root) {
  var modMap = {}; // 存储模块的名称
  // 初始化
  var requireUse = function(deps, callback) {
    var depsLen = deps.length;
    var params = [];
    if(depsLen === 0) {
      callback();
      return
    }
    for(var i=0; i<depsLen;i++) {
      (function(j) {
        loadMod(deps[j], function(options) {
          depsLen--;
          params[j] = options;
          if(depsLen === 0) {
            callback.apply(null, params);
          }
        });
      })(i);
    }
  }

  var loadMod = function(modName, callback) {
    if(!modMap[modName]) {
      modMap[modName] = { //查看缓存是否有模块
        state: 'loading'
      }
      loadScript(modName, function() {
        requireUse(modMap[modName].deps, function() {
          // 执行当前要加载的模块
          execMod(modName, callback);
        });
      });
    }
  }

  var execMod = function(modName, callback) {
    var options = modMap[modName].callback;
    modMap.exports = options;
    callback(options);
  }

  var loadScript = function(modName, callback) {
    var script = document.createElement('script');
    script.src = modName+'.js';
    document.body.append(script);
    script.onload = function() {
      callback();
    }
  }

  var define = function(modName, deps, callback) {
    modMap[modName] = modMap[modName] || {};
    modMap[modName].deps = deps;
    modMap[modName].state = 'loaded';
    modMap[modName].callback = callback();
  }

  root.requireUse = requireUse;
  root.define = define;
})(this);