// this will be executed on popup show

var
  s = Function.prototype.call.bind(Array.prototype.slice),
  d = document,
  $_ = function () {
    return s(d.getElementsByClassName.apply(d, arguments));
  },
  $id = d.getElementById.bind(d),
  $name = function () {
    return (d.getElementsByName.apply(d, arguments) || [])[0];
  },
  conf = Object.create(null),
  inputs = Object.create(null),
  rangeValues = {
    timerTimeout: [
      '1s', '1.5s', '2s', '3s', '4s', '5s', '6s', '8s',
      '10s', '15s', '20s', '25s', '30s', '45s',
      '1m', '1.5m', '2m', '3m', '4m', '5m', '6m', '8m',
      '10m', '15m', '20m', '25m', '30m', '45m',
      '1h'
    ]
  };

d.addEventListener('DOMContentLoaded', function () {

  var data = {};
  chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tabs) {
    data.tab = tabs.shift();
    finish();
  });
  chrome.runtime.getBackgroundPage(function (bg) {
    data.bg = bg;
    finish();
  });

  function finish () {
    if (data.tab && data.bg) init(data);
  }

});

//
function init (data) {
  var tab = data.tab;
  var Tools = data.bg.Tools, Config = data.bg.Config;

  var host = Tools.fetchHost(tab.url);
  var config = Config.create(host);

  $_('refresh-trigger').forEach(function (el) {
    el.addEventListener('click', function (e) {
      // tab refresh
      chrome.runtime.sendMessage({
          type: 'refresh',
          tabId: tab.id,
          method: config.get('method')
        },
        function (response) {
          console.log(response || chrome.runtime.lastError);
        });
    });
  });

  $_('conf').forEach(function (el) {
    var name = el.getAttribute('name');
    inputs[name] = inputs[name] || [];
    inputs[name].push(el);
    switch (el.getAttribute('type')) {
      case 'checkbox':
        el.addEventListener('click', function (e) {
          config.set(el.getAttribute('name'), el.checked);
          config.store();
        });
        break;
      default:
        el.addEventListener('change', function (e) {
          var
            value = el.value,
            elType = el.getAttribute('type');
          if (['number', 'range'].indexOf(elType) !== -1) {
            value = Number(value);
          }
          if (el.dataset.type === 'interval') {
            value = Tools.normalizeInterval(value);
            el.value = value;
          }
          config.set(el.getAttribute('name'), value);
          config.store();
        });
        break;
    }
  });

  config.retrieve(function () {
    var value;
    for (var i in inputs) {
      value = config.get(i);
      //console.log(i, value);
      inputs[i].forEach(setValue, {value: value});
    }
    function setValue (el, k) {
      switch (el.getAttribute('type')) {
        case 'checkbox':
          el.checked = !!this.value;
          break;
        case 'radio':
          el.checked = el.value === this.value || (el.checked && !this.value);
          break;
        default:
          el.value = this.value;
          break;
      }
    }
    initConfig();
  });

  function initConfig () {
    $_('toggler').forEach(function (toggler) {
      toggler.addEventListener('click', tog);
      tog();
      function tog (e) {
        toggle(toggler.dataset.toggle, toggler.checked);
      }
    });
    function toggle (cls, show) {
      $_(cls).forEach(function (el) {
        el.style.display = show? 'block' : 'none';
      });
    }

    $_('range-value').forEach(function (el) {
      var drag = false;
      var forEl = $name(el.dataset.for);
      el.setAttribute('max', rangeValues[el.dataset.for].length - 1);
      el.addEventListener('mousedown', function (e) { drag = true; });
      el.addEventListener('mouseup',   function (e) { drag = false; });
      el.addEventListener('mousemove', function (e) { if (drag) upd(e); });
      el.addEventListener('change', function (e) {
        upd(e);
        var ee = new CustomEvent("change", e);
        forEl.dispatchEvent(ee);
      });
      function upd (e) {
        updRangeInput(el);
      }

      forEl.addEventListener('change', function (e) {
        updRangeSlider(el);
      });
      updRangeSlider(el);
    });
    function updRangeInput (el) {
      $name(el.dataset.for).value = rangeValues[el.dataset.for][el.value];
    }
    function updRangeSlider (el) {
      var forEl = $name(el.dataset.for);
      var secs, values, i;
      values = rangeValues[el.dataset.for];
      if (forEl.dataset.type === 'interval') {
        secs = Tools.interval2seconds(forEl.value);
        for (i = values.length - 1; i >= 1; i -= 1) {
          if (secs > Tools.interval2seconds(values[i - 1])) {
            break;
          }
        }
        el.value = i;
        return;
      }
      el.value = values.length - 1;
    }
  }

}
