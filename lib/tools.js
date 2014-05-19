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
  $.isAllowedUrl      = isAllowedUrl;

  return;

  function isAllowedUrl (url) {
    return WHITEURL_REGEXP.test(url);
  }

  function normalizeInterval (s, x) {
    var result = seconds2interval(interval2seconds(s));
    if (x) {
      result = result.replace(/^([\.\d]+[a-z]+)(.*)$/, function (m, result, tail) {
        return result + (tail.length? '+' : '');
      }).replace(/s/, '');
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

}(this));
