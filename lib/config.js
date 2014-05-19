(function (w) {
  var instances = {};
  var exports = w.Config = Object.create(null);

  exports.create = function (uniqueId) {
    if (instances[uniqueId]) {
      return instances[uniqueId];
    }
    return instances[uniqueId] = new Config(uniqueId);
  };

  exports.ready = function (cb) {
    if (typeof cb !== 'function') {
      throw new Error('function required');
    }
    chrome.storage.sync.get(function (confs) {
      Object.keys(confs).forEach(function (uniqueId) {
        var conf = exports.create(uniqueId);
        conf.data = confs[uniqueId];
      });
      cb(confs);
    });
  };

  var changeListeners = [];
  exports.change = function (cb) {
    changeListeners.push(cb);
  };
  function _triggerChange (instance, key, value) {
    for (var i = 0, l = changeListeners.length; i < l; i += 1) {
      changeListeners[i].call(instance, key, value);
    }
  }

  exports.has = function (uniqueId) {
    return instances.hasOwnProperty(uniqueId);
  };

  /**
   * Config class
   */
  function Config (uniqueId) {
    this.uniqueId = uniqueId;
    this.data = Object.create(null);
  }

  /**
   * Config get property
   */
  Config.prototype.get = function getConf (fullKey) {
    var key, hash, parts;
    hash = this.data;
    parts = keyParts(fullKey);

    while (key = parts.shift()) {
      if (!key || !hash.hasOwnProperty || !hash.hasOwnProperty(key)) {
        return null;
      }
      hash = hash[key];
    }
    return hash;
  };

  /**
   * Config set property
   */
  Config.prototype.set = function setConf (fullKey, value) {
    var key, hash, parts;
    hash = this.data;
    parts = keyParts(fullKey);

    while (key = parts.shift()) {
      if (!hash[key]) {
        hash[key] = Object.create(null);
      }
      if (parts.length) {
        hash = hash[key];
      } else {
        break;
      }
    }
    hash[key] = value;
    _triggerChange(this, fullKey, value);
  };

  /**
   * Store configs to chrome.storage
   */
  Config.prototype.store = function saveConf (cb) {
    var data = {};
    data[this.uniqueId] = this.data;
    chrome.storage.sync.set(data, function (err) {
      if (cb && cb.call) cb(err);
    }.bind(this));
  };

  /**
   * Retrieve configsselect box and checkbox state using the preferences
   * stored in chrome.storage.
   */
  Config.prototype.retrieve = function loadConf (cb) {
    chrome.storage.sync.get([this.uniqueId], function (items) {
      this.data = items[this.uniqueId] || this.data;
      if (cb && cb.call) cb(this.data);
    }.bind(this));
  };

  function keyParts (fullKey) {
    return fullKey.replace(/([A-Z])/g, function (v) { return '\x01' + v.toLowerCase(); }).split('\x01');
  }

}(this));
