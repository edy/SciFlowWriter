var Store = require('ep_etherpad-lite/node_modules/connect/lib/middleware/session/store'),
  utils = require('ep_etherpad-lite/node_modules/connect/lib/utils'),
  Session = require('ep_etherpad-lite/node_modules/connect/lib/middleware/session/session'),
  db = require('ep_etherpad-lite/node/db/DB').db,
  log4js = require('ep_etherpad-lite/node_modules/log4js'),
  messageLogger = log4js.getLogger("DirtyStore");

var DirtyStore = module.exports = function DirtyStore() {};

DirtyStore.prototype.__proto__ = Store.prototype;

DirtyStore.prototype.get = function(sid, fn){
  messageLogger.debug('GET ' + sid);
  var self = this;
  db.get("sessionstorage:" + sid, function (err, sess)
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
  messageLogger.debug('SET ' + sid);
  db.set("sessionstorage:" + sid, sess);
  process.nextTick(function(){
    if(fn) fn();
  });
};

DirtyStore.prototype.destroy = function(sid, fn){
  messageLogger.debug('DESTROY ' + sid);
  db.remove("sessionstorage:" + sid);
  process.nextTick(function(){
    if(fn) fn();
  });
};

DirtyStore.prototype.all = function(fn){
  messageLogger.debug('ALL');
  var sessions = [];
  db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      sessions.push(value);
    }
  });
  fn(null, sessions);
};

DirtyStore.prototype.clear = function(fn){
  messageLogger.debug('CLEAR');
  db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      db.db.remove("session:" + key);
    }
  });
  if(fn) fn();
};

DirtyStore.prototype.length = function(fn){
  messageLogger.debug('LENGTH');
  var i = 0;
  db.forEach(function(key, value){
    if (key.substr(0,15) === "sessionstorage:") {
      i++;
    }
  });
  fn(null, i);
};
