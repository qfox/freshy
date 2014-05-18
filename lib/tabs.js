(function (w) {

  // const
  var TAB_ICONS = {
    default : {
      icon: {
        '19': 'images/popup_icon/default.png',
        '38': 'images/popup_icon/default@2x.png'
      },
      bgBadgeColor: '#777'
    },
    error   : {
      icon: {
        '19': 'images/popup_icon/error.png',
        '38': 'images/popup_icon/error@2x.png'
      },
      bgBadgeColor: '#b66c76'
    },
    active  : {
      icon: {
        '19': 'images/popup_icon/active.png',
        '38': 'images/popup_icon/active@2x.png'
      },
      bgBadgeColor: '#63a36a'
    }
  };

  var
    refreshAfter = {},
    tabs = {};

  w.Tabs = {
    disable      : disableTab,
    register     : registerTab,
    unregister   : unregisterTab,
    isRegistered : isRegistered,

    activate     : addTab,
    deactivate   : deleteTab,
    isActive     : tabInRefreshList,

    setIcon      : setTabIcon,
    refreshReady : tabNeedRefresh,
    refresh      : tabRefresh,

    get          : function (tabId) {
      return tabs[tabId];
    },

    ids          : function () {
      return Object.keys(tabs);
    },
    activeIds    : function () {
      return Object.keys(refreshAfter);
    }
  };

  function disableTab (tabId) {
    chrome.browserAction.disable(tabId);
  }

  function registerTab (tabId, data) {
    if (tabs[tabId]) {
      console.error(tabId, 'already registered');
      return;
    }
    tabs[tabId] = data;
    console.log(tabId, 'registered');
  }

  function unregisterTab (tabId) {
    if (!isRegistered(tabId)) {
      return;
    }
    console.log(tabId, 'erased');
    setTabIcon(tabId, {type: 'default', text: ''});
    delete refreshAfter[tabId];
    delete tabs[tabId];
  }

  function isRegistered (tabId) {
    return tabs.hasOwnProperty(tabId);
  }

  function tabInRefreshList (tabId) {
    return refreshAfter.hasOwnProperty(tabId);
  }

  function deleteTab (tabId) {
    console.log(tabId, 'waiting...');
    delete refreshAfter[tabId];
  }

  function addTab (tabId) {
    if (!tabs[tabId]) {
      console.debug(tabId, 'try to add unregistered tab');
      return;
    }
    setTabIcon(tabId, {type: 'active', text: w.Tools.normalizeInterval(tabs[tabId].get('timerTimeout') || '10s', true)});
    console.log(tabId, 'activated');
    refreshAfter[tabId] = Date.now() + (w.Tools.interval2seconds(tabs[tabId].get('timerTimeout') || '10s') * 1000);
  }

  function setTabIcon(tabId, o) {
    if (typeof o === 'string') {
      if (!(o in TAB_ICONS)) {
        console.error(tabId, 'invalid icon type passed', o);
        return;
      }
      o = {type: o};
    }
    tabId = Number(tabId);
    if (o.type in TAB_ICONS) {
      chrome.browserAction.setIcon({
        tabId: tabId,
        path: TAB_ICONS[o.type].icon
      });
      chrome.browserAction.setBadgeBackgroundColor({
        tabId: tabId,
        color: TAB_ICONS[o.type].bgBadgeColor
      });
    }
    if (o.text) {
      chrome.browserAction.setBadgeText({
        tabId: tabId,
        text: o.text
      });
    }
  }

  function tabNeedRefresh (tabId) {
    return Date.now() > refreshAfter[tabId];
  }

  function tabRefresh (tabId, method, cb) {
    tabId = Number(tabId);
    var response = {
      initialized: Date.now(),
      tabId: tabId
    };

    console.log(tabId, 'refreshing', method);
    if (method === 'reload') {
      chrome.tabs.reload(tabId, { bypassCache: true }, function () {
        response.elapsed = Date.now() - response.initialized;
        console.log('Done for', response.elapsed);
        cb(response);
      });
      return;
    }

    chrome.tabs.sendMessage(tabId, {
        tabId: tabId,
        command: 'refresh',
        method: method
      },
      function (messageResponse) {
        console.log(tabId, 'messageResponse', messageResponse);
        messageResponse = messageResponse || {};
        response.elapsed = Date.now() - response.initialized;
        response.err = messageResponse.err || chrome.runtime.lastError;
        response.data = messageResponse.data;
        console.log(tabId, 'elapsed', response.elapsed);
        if (response.err) {
          setTabIcon(tabId, 'error');
          console.error(tabId, response.err);
        }
        addTab(tabId);
        cb(response);
      });
  }


}(this));
