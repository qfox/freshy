(function (w) {

  var $, FILTER, SEARCH_REGEXP, IMPORT_REGEXP, WHITEURL_REGEXP, URL_MATCH, INTERVAL_MULTIPLIERS;

  INTERVAL_MULTIPLIERS = {
    ms: 0.001,
    s : 1,
    m : 60,
    h : 3600,
    d : 3600 * 24,
    w : 3600 * 24 * 7
  };

  FILTER = [
    'yui.yahooapis.com',
    'ajax.googleapis.com',
    'fonts.googleapis.com',
    'ajax.aspnetcdn.com',
    'ajax.microsoft.com',
    'code.jquery.com'
  ];
  SEARCH_REGEXP = /freshy=\w+/;
  IMPORT_REGEXP = /(@import[^)]+)/;
  URL_MATCH = /url[\s\('"]+([^'"]+)/;
  WHITEURL_REGEXP = /^(http:|https:|feed:)/;

  $ = w.Tools = Object.create(null);
  $.normalizeInterval = normalizeInterval;
  $.interval2seconds  = interval2seconds;
  $.seconds2interval  = seconds2interval;
  $.fetchHost         = fetchHost;
  $.generateNewUrl    = generateNewUrl;
  $.refreshTab        = refreshTab;
  $.isAllowedUrl      = isAllowedUrl;

  return;

  function isAllowedUrl (url) {
    return WHITEURL_REGEXP.test(url);
  }

  function normalizeInterval (s, x) {
    var result = seconds2interval(interval2seconds(s));
    if (x) {
      result = result.replace(/^(\d+\w+)(.*)$/, function (m, result, tail) {
        return result + (tail.length? '+' : '');
      }).replace(/s$/, '');
    }
    return result;
  }

  function interval2seconds (s) {
    return s.replace(/\s*([\d\.]+)\s*(ms|\w)?\s*/g, function (v, number, multiplier) {
      return '+' + (Number(number) * (INTERVAL_MULTIPLIERS[multiplier] || 1));
    }).split('+').reduce(function (a, b) { return a + Number(b); }, 0);
  }

  function seconds2interval (n) {
    var
      multipliers = Object.keys(INTERVAL_MULTIPLIERS),
      r = [];

    var multiplier, number, mvalue, i;
    for (i = multipliers.length - 1; i >= 0; i -= 1) {
      multiplier = multipliers[i];
      mvalue = INTERVAL_MULTIPLIERS[multiplier];
      number = Math.floor(n / mvalue);
      if (number > 0) {
        r.push(number);
        r.push(multiplier);
      }
      n %= mvalue;
    }
    if (!r.length) {
      return '0s';
    }

    return r.join('');
  }

  function fetchHost (url) {
    return String(url).replace(/^[\w\d\-]+:\/\/([\w\.\-\d]+).+$/, '$1');
  }

  /**
   * @param url
   * @param search
   * @return {*}
   */
  function generateNewUrl (url, search) {
    var a = document.createElement('a');
    a.href = url;

    if (FILTER.indexOf(a.host) === -1) {
      a.search = SEARCH_REGEXP.test(a.search)?
        a.search.replace(SEARCH_REGEXP, search)
        : search;

      return a.href;
    }

    return false;
  }

  function refreshTab (document) {
    var i, item, a, search, newUrl, content, parts, data;

    search = 'freshy=' + Date.now().toString(36);

    data = {};
    for (i = 0; i < document.styleSheets.length; i++) {
      data.update = false;
      item = document.styleSheets[i];

      if (!item.ownerNode) {
        continue;
      }

      if (item.href && item.ownerNode.nodeName === 'LINK') {
        newUrl = generateNewUrl(item.href, search);

        if (newUrl) {
          item.ownerNode.href = newUrl;
        }
      }
      else if (item.ownerNode.nodeName === 'STYLE') {
        content = item.ownerNode.innerHTML;

        parts = content.split(IMPORT_REGEXP);
        parts.forEach(patchPart, data);

        if (data.update) {
          item.ownerNode.innerHTML = parts.join('');
        }
      }
    }

    function patchPart (part, key, parts) {
      var matches;

      if (IMPORT_REGEXP.test(part)) {
        matches = part.match(URL_MATCH);
        if (matches.length === 2) {
          this.update = true;
          parts[key] = part.replace(matches[1], generateNewUrl(matches[1], search));
        }
      }
    }

  }

}(this))
