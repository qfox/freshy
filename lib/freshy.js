// this will be executed once per page

chrome.runtime.onMessage.addListener(function (request, sender, _sendResponse) {
  request = request || {};

  var response = {
    tabId: sender.tab? sender.tab.id : request.tabId,
    sender: sender
  };
  switch (request.command) {
    case 'refresh':
      window.Freshy({method: request.method || 'css'}, function (err, data) {
        console.debug('cb called');
        response.err = err;
        response.data = data;
        sendResponse(response);
      });
      break;

    default:
      setTimeout(function () {
        response.err = 'Unknown command';
        sendResponse(response);
      }, 42);
      break;
  }

  function sendResponse (response) {
    _sendResponse(response);
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    }
  }

  return true;
});

(function (w) {

  var FILTER, SEARCH_REG_EXPR, IMPORT_REG_EXPR, URL_MATCH;
  FILTER = [
    'yui.yahooapis.com',
    'ajax.googleapis.com',
    'fonts.googleapis.com',
    'ajax.aspnetcdn.com',
    'ajax.microsoft.com',
    'code.jquery.com'
  ];
  SEARCH_REG_EXPR = /freshy=\w+/;
  IMPORT_REG_EXPR = /(@import[^)]+)/;
  URL_MATCH = /url[\s\('"]+([^'"]+)/;

  var d = w.document;

  w.Freshy = refresh;
  function refresh (o, cb) {
    switch (o.method) {
      case 'css':
        refreshCss(o, cb);
        break;
      case 'cssforced':
        refreshForced(o, cb);
        break;
      default:
        cb('Unknown method');
        break;
    }
  }

  function refreshForced (o, cb) {
    // console.log('refreshing stylesheets with page query');
    var t = Date.now();
    var response = {};
    $xhr({url: patchUrl(w.location.href)}, function (err, responseData) {
      if (err || !responseData || !responseData.responseText) {
        // console.error('error on refreshing stylesheets with page query', err || 'empty responseText');
        response = response || Object.create(null);
        response.elapsed = Date.now() - t;
        response.data = responseData;
        // console.log('calling cb');
        return cb(err, response);
      }

      var i, l, doc, item, node, content, parts, stylesheets, data = {}, href;

      data.search = generateSearch();

      doc = d.implementation.createHTMLDocument();
      doc.documentElement.innerHTML = responseData.responseText.replace(/^.*\s*.*<\s*html\s?(\s+[^>]*\s*)?>\s*|<\/\s*html\s*>.*\s*$/ig, '');

      // drop old styles
      for (i = 0, l = d.styleSheets.length; i < l; i++) {
        node = d.styleSheets[0].ownerNode;
        node.parentNode.removeChild(node);
      }

      // add new styles
      stylesheets = doc.querySelectorAll('link[rel="stylesheet"],style');
      for (i = 0, l = stylesheets.length; i < l; i++) {
        node = stylesheets[i].cloneNode();

        href = node.getAttribute('href');
        if (href && node.nodeName === 'LINK') {
          node.setAttribute('href', patchUrl(href, data.search) || href);
        }
        else if (node.nodeName === 'STYLE') {
          data.update = false;
          content = node.innerHTML;

          parts = content.split(IMPORT_REG_EXPR);
          parts.forEach(patchPart, data);

          if (data.update) {
            node.innerHTML = parts.join('');
          }
        }
        d.head.appendChild(node);
      }

      // console.log('stylesheets refreshed');
      response.elapsed = Date.now() - t;
      // response.data = responseData; // should be concreted to pass through chrome messager
      // console.log('stylesheets refresh response data', response, cb);
      cb(null, response);
      // console.log('stylesheets refresh completed');
    });
  }

  function refreshCss (o, cb) {
    var i, item, a, newUrl, content, parts, data;

    data = {};
    data.search = generateSearch();

    for (i = 0; i < d.styleSheets.length; i++) {
      data.update = false;
      item = d.styleSheets[i];

      if (!item.ownerNode) {
        continue;
      }

      if (item.href && item.ownerNode.nodeName === 'LINK') {
        newUrl = patchUrl(item.href, data.search);

        if (newUrl) {
          item.ownerNode.href = newUrl;
        }
      }
      else if (item.ownerNode.nodeName === 'STYLE') {
        content = item.ownerNode.innerHTML;

        parts = content.split(IMPORT_REG_EXPR);
        parts.forEach(patchPart, data);

        if (data.update) {
          item.ownerNode.innerHTML = parts.join('');
        }
      }
    }

    cb(null, data);
  }

  function patchPart (part, key, parts) {
    var matches;

    if (!IMPORT_REG_EXPR.test(part)) {
      return;
    }

    matches = part.match(URL_MATCH);
    if (matches.length === 2) {
      this.update = true;
      parts[key] = part.replace(matches[1], patchUrl(matches[1], this.search));
    }
  }

  /**
   * @param {String} url
   * @param {String} [search]
   * @return {*}
   */
  function patchUrl (url, search) {
    var a;

    search = search || generateSearch();
    a = document.createElement('a');
    a.href = url;

    if (FILTER.indexOf(a.host) !== -1) {
      return false;
    }

    a.search = SEARCH_REG_EXPR.test(a.search)?
      a.search.replace(SEARCH_REG_EXPR, search) : search;

    return a.href;
  }

  /**
   * @return {String}
   */
  function generateSearch () {
    return 'freshy=' + Date.now().toString(36);
  }

  /**
   * @param {Object} o
   * @param {Function} cb
   * @results {XMLHttpRequest}
   */
  function $xhr (o, cb) {
    var t = Date.now();
    var x = new XMLHttpRequest();
    x.timeout = o.timeout || 5000;
    x.open(o.method || 'GET', o.url);
    x.onreadystatechange = function () {
      var data;
      if (x.readyState !== 4) {
        return;
      }
      data = {};
      data.xhr = x;
      data.response = x.response;
      data.elapsed = Date.now() - t;
      if (x.status === 200) {
        data.responseText = x.responseText;
        data.responseType = x.responseType;
      }
      delete x.ontimeout;
      delete x.onreadystatechange;
      cb(x.status === 200? null : x.status, data);
    };
    x.ontimeout = function () {
      delete x.ontimeout;
      delete x.onreadystatechange;
      cb(408, {xhr: x, elapsed: Date.now() - t});
    };
    x.send(null);
    return x;
  }

}(this));
