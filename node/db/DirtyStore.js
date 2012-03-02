var Store = require('express/node_modules/connect/lib/middleware/session/store'),
  utils = require('express/node_modules/connect/lib/utils'),
  Session = require('express/node_modules/connect/lib/middleware/session/session'),
  db = require('./DB');

var DirtyStore = module.exports = function DirtyStore() {};

DirtyStore.prototype.__proto__ = Store.prototype;

DirtyStore.prototype.get = function(sid, fn){
  console.log('DirtyStore get: ', sid);
  db.db.get("sessionstorage:" + sid, function (err, sess)
  {
    if (sess) {
      sess.cookie.expires = 'string' == typeof sess.cookie.expires ? new Date(sess.cookie.expires) : sess.cookie.expires;
      if (!sess.cookie.expires || new Date() < expires) {
        fn(null, sess);
      } else {
        self.destroy(sid, fn);
      }
    } else {
      fn();
    }
  });
};

DirtyStore.prototype.set = function(sid, sess, fn){
  console.log('DirtyStore set: ', sid);
  db.db.set("sessionstorage:" + sid, sess);
  process.nextTick(function(){
    if(fn) fn();
  });
};

DirtyStore.prototype.destroy = function(sid, fn){
  console.log('DirtyStore destroy: ', sid);
  db.db.remove("sessionstorage:" + sid);
  process.nextTick(function(){
    if(fn) fn();
  });
};

DirtyStore.prototype.all = function(fn){
  console.log('DirtyStore all');
  var sessions = [];
  db.db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      sessions.push(value);
    }
  });
  fn(null, sessions);
};

DirtyStore.prototype.clear = function(fn){
  console.log('DirtyStore clear');
  db.db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      db.db.remove("session:" + key);
    }
  });
  if(fn) fn();
};

DirtyStore.prototype.length = function(fn){
  console.log('DirtyStore length');
  var i = 0;
  db.db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      i++;
    }
  });
  fn(null, i);
};