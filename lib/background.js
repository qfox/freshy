// this will be loaded once per chrome
/* global Tools, Config, Tabs */

// one timer to rule them all
setInterval(function () {
  var tabIds = Tabs.activeIds();
  if (!tabIds.length) return;

  var tabId;
  for (var i = 0, l = tabIds.length; i < l; i += 1) {
    tabId = tabIds[i];
    if (!Tabs.refreshReady(tabId)) {
      continue;
    }
    Tabs.deactivate(tabId);

    /*jshint loopfunc: true */
    Tabs.refresh(tabId, Tabs.get(tabId).get('method'), function (resp) {
      if (resp.err) {
        console.error(tabId, resp.err);
        Tabs.unregister(tabId);
        setTimeout(function () {
          Tabs.setIcon(tabId, 'error');
        }, 42);
      }
      else {
        console.log(tabId, 'refreshed for', resp.elapsed + 'ms');
      }
    });
  }
}, 250);

// listen for messages
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  console.log({msg: msg, sender: sender, sendResponse: sendResponse});

  switch (msg.type) {
    case 'refresh':
      Tabs.refresh(msg.tabId, msg.method || 'css', function (response) {
        sendResponse(response);
      });
      break;

    default:
      console.error('Unknown message type', msg);
      break;
  }
});

// Listen for activating tab and reload it if necessary
chrome.tabs.onActivated.addListener(function (activeInfo) {
  if (Tabs.isRegistered(activeInfo.tabId)) {
    // add tab to refreshing list
    return Tabs.activate(activeInfo.tabId);
  }

  // clean inactive tabs
  Tabs.ids().forEach(function (tabId) {
    tabId = Number(tabId);
    if (activeInfo.tabId === tabId) {
      return;
    }
    chrome.tabs.get(tabId, function (tab) {
      if (!tab) {
        // tab removed
        console.debug(tabId, 'closed by user');
        Tabs.unregister(tabId);
        return;
      }
      if (!tab.active && Tabs.isActive(tab.id)) {
        Tabs.deactivate(tab.id);
      }
    });
  });
});

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // skip unfinished updates
  if ('complete' !== (changeInfo && changeInfo.status)) {
    return;
  }
  // just activate tab if registered
  if (Tabs.isRegistered(tabId)) {
    return Tabs.activate(tabId);
  }
  // skip strange
  if (!tab) {
    console.error(tabId, 'no tab', changeInfo);
    Tabs.unregister(tabId);
    return;
  }
  // skip blacklisted
  if (!Tools.isAllowedUrl(tab.url)) {
    console.debug(tabId, 'skipped: ', tab.url);
    return;
  }

  // refresh tab
  tabUpdateData(tab);
});

// listen for replaces
chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
  console.debug(removedTabId, 'replaced with', addedTabId);
  Tabs.unregister(removedTabId);
  chrome.tabs.get(addedTabId, function (tab) {
    // skip blacklisted
    if (!Tools.isAllowedUrl(tab.url)) {
      console.debug(tab.id, 'skipped: ', tab.url);
      return;
    }
    // refresh tab data
    tabUpdateData(tab);
  });
});

function tabUpdateData (tab, conf) {
  if (!conf) {
    var host = tab.host || Tools.fetchHost(tab.url);
    conf = Config.create(host);
  }

  // fetch timer checkbox state
  var timerSwitcher = conf.get('timerSwitcher');

  // deny tab refreshing if disabled
  if (!timerSwitcher) {
    Tabs.unregister(tab.id);
    return;
  }

  // register if timer enabled
  if (!Tabs.isRegistered(tab.id)) {
    Tabs.register(tab.id, conf);
  }

  // activate if tab is active
  if (!Tabs.isActive(tab.id) && tab.active) {
    Tabs.activate(tab.id);
  }
  else {
    Tabs.updateTime(tab.id);
  }
}

// initialization
Config.ready(function () {
  init.confs = true;
  init();
});
chrome.tabs.query({}, function (tabs) {
  init.tabs = tabs;
  init();
});

function init () {
  if (!init.tabs || !init.confs) {
    return;
  }

  // register config change event handler
  Config.change(function (key, value) {
    var lookingForHost = this.uniqueId;
    // for each tab...
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        // skip blacklisted
        if (!Tools.isAllowedUrl(tab.url)) {
          return;
        }

        // looking for specific host
        if (lookingForHost !== Tools.fetchHost(tab.url)) {
          // and skip another tabs
          return;
        }

        // ...refresh tab data
        tab.host = lookingForHost;
        tabUpdateData(tab);
      });
    });
    console.log(0, this.uniqueId, 'config changed', key, '->', value);
  });

  // first load
  init.tabs.forEach(function (tab) {
    // skip blacklisted
    if (!Tools.isAllowedUrl(tab.url)) {
      Tabs.disable(tab.id);
      return;
    }

    var host = Tools.fetchHost(tab.url);
    if (!Config.has(host)) {
      return;
    }

    console.log(tab.id, 'tab found. activity: ', tab.active, ', url: ', tab.url, ', timer: ', Config.create(host).get('timerSwitcher'));
    // init tab
    tab.host = host;
    tabUpdateData(tab);
  });
}
