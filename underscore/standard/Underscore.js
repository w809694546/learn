/*
* @Author: Max
* @Date:   2018-11-13 20:17:56
* @Last Modified by:   Max
* @Last Modified time: 2018-11-17 22:35:14
*
*/
(function( root ){
  //减少原型链的查询
	var push = Array.prototype.push,
      ObjProto = Object.prototype;
  //浏览器支持 ES5的方法就优先使用
  var nativeKeys = Object.keys;
   var _ = function( obj ){
     if( !(this instanceof  _) ){
        return new _(obj);
     }
     this.wrap = obj;
   }
   //commonjs 规范  js 社区
   typeof module !== "undefined" && module.exports ? module.exports = _ : root._ = _;
   // AMD 规范  requirejs    客户端模块加载器如何实现
   if( typeof define === "function" && define.amd ){
      define( "underscore", [], function(){
          return {
          	   _:_,
          }
      });
   }
   /*
    数组去重
    target  目标源
    callback
    */
   _.uniq = function( target, callback ){
   	  var result = [];    //去重之后的结果  [1,2,3,4,5,2,4,5,3]
      for( var i=0; i<target.length; i++ ){
      	var computed = callback ? callback(target[i]) : target[i];
        if(result.indexOf(computed) === -1 ){
           result.push(computed)
        }
      }

      return result;
   }
   
   _.functions = function( obj ){
    var result = [];
    var key;
    for( key in obj ){
         result.push(key);
    }
    return result;
   }
   
   // 遍历 数组  对象
   _.each = function( target, callback ){
   	   var key,i = 0;
       if( _.isArray(target) ){
       	 var length = target.length;
          for( ;i<length; i++ ){
             callback.call( target, target[i], i );          
          }
       } else {
          for( key in target ){
             callback.call( target, key, target[key] );   
          }
       }
   	
   }

   //开启链接式的调用
   _.chain = function( obj ){
     var instance = _( obj );     // {wrap: u处理好的数据  _chain:true}
     instance._chain = true;   //_chain 标识当前的实例对象支持链接式的调用
     return instance;
   }

   //辅助函数  result(实例对象, 处理好数据最终的结果 )
   var result = function( instance, obj ){
      return instance._chain ? _(obj).chain() : obj;
   }

   _.prototype.value = function(){
    return this.wrap;
   }
   //类型检测
   _.isArray = function( array ){
     return toString.call( array ) === "[object Array]";
   }
  
   _.each(["Function", "String", "Object" , "Number"], function( name ){  //key  value
          _["is"+name] = function( obj ){
          	 return toString.call( obj ) === "[object "+name+"]";
          }
   });
  
  /*
    obj       目标源对象   必须
    iteratee   迭代器   ( 不仅可以是函数 对象  字符串  字面量的值 )   选择
    context    绑定的上下文对象    选择
   */
  _.map = function( obj, iteratee, context ){    
     //生成不同功能迭代器   函数
     var iteratee = cb( iteratee, context );   //return function(){}
     //如果你给我传入是object对象   获取key 存储在一个数组中
     var keys =  !_.isArray(obj) && _.keys(obj) ;    
     var length = (keys || obj).length;   //3
     var result = Array(length);    
     for(var index = 0; index<length; index++ ){
        //object = 属性   array = 下标
        var currentKey = keys ? keys[index] : index;
        result[index] = iteratee( obj[currentKey], index, obj );
     }

     return result;
  }
     // hasEnumBug   true IE9>
  var hasEnumBug = !{valueOf: null}.propertyIsEnumerable('valueOf');
  var noEnumProps = ["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"];
  function collect( obj, keys ){
     var nElen =  noEnumProps.length,
         constructor = obj.constructor,   //构造函数
         proto = constructor.prototype || ObjProto;   //原型对象
         while( nElen-- ){
           var key = noEnumProps[nElen];
           if( key in obj &&obj[key] !== proto[key] ){
                keys.push(key);
           }
         }

  }
  _.keys = function( obj ){
     //允许错误
     if( !_.isObject(obj) ){ return [] };
     //浏览器是否支持Object.keys
     if( nativeKeys ){return nativeKeys(obj) };
     //遍历
     var keys = [];
     for( var key in obj ){     //IE9>   Keys[name]    {name:"max", valueOf:"value"}
         keys.push(key);
     }
     // IE9 兼容性的问题   不可枚举属性的集合 
     if(hasEnumBug){collect( obj, keys )}
    return keys;
  }
  var cb = function( iteratee, context, args ){
      if( iteratee == null ){
        return _.identity;
      }
      if( _.isFunction(iteratee) ){
        return optimizeCb( iteratee, context, args);  //optimizeCb优化迭代器
      }
      if( _.isObject(iteratee) ){
        return ;
      }

      //其他   字符串
  }
   // optimize   优化 回调    
  var optimizeCb = function( func, context, args  ){  
     //context 是否有值  上下文对象是否设置
     if( context == void 0 ){return func;}
     switch( args == null ? 3 : args ){
      case 1: return function(value){
        return func.call(context,value);
      }
      //1 2 3 4
      case 3: return function( value, index, obj ){
         return  func.call( context, value, index, obj );
      }
      case 4: return function( memo, value, index, obj ){
         return func.call( context, memo, value, index, obj );
      }
     }
  }

  _.times = function( n, iteratee, context ){
    var result = Array(Math.max(0,n));
    iteratee = optimizeCb( iteratee, context, 1 );   //itertee
    for(var i= 0; i< n; i++ ){
     result[i] = iteratee( i );
    }
    return result;
  }
  /*
    createReduce  工厂函数生成reduce 
   */
  var createReduce = function( dir ){
    //累加
    var reduce = function( obj, iteratee, memo, init ){
    var keys =  !_.isArray(obj) && _.keys(obj),
        length = (keys || obj).length,
        index = dir>0 ? 0 : length-1;   //确定累加的方向
        if(!init){
          memo = obj[keys ? keys[index] : index];  //1   obj第一项数据的成员
          index+=dir;   //1   
        }
        for( ;index >= 0 && index<length; index+=dir ){
           var currnteKey = keys ? keys[index] : index;   
           memo = iteratee(memo, obj[currnteKey], currnteKey, obj )
        }
      return memo;
    }
    //memo  最终能累加的结果     每一次累加的过程
    return function( obj, iteratee , memo, context ){
      //init    初始化了memo  
      var init = arguments.length>= 3;
      return reduce( obj, optimizeCb(iteratee, context, 4), memo, init );
    }
  }
  _.reduce = createReduce( 1 );   //1 || -1    dir
  _.identity = function( value ){
     return value;
  }

   //mixin 
   _.mixin = function( obj ){
     _.each( _.functions( obj ), function( name ){
     	var func = obj[name];
		_.prototype[name] = function(){
			var args = [this.wrap];     // 处理好数据最终的结果
			push.apply( args, arguments );
      // this    instance   处理好数据最终的结果   func.apply( this,args)
        return result(this, func.apply( this,args));   //处理好数据最终的结果
		}
     });
   }

  _.mixin( _ );
})( this );

