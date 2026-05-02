(function() {
  var MANUAL_KEY = 'shainc-site-language';
  var COUNTRY_KEY = 'shainc-site-country';
  var COUNTRY_TS_KEY = 'shainc-site-country-ts';
  var COUNTRY_TTL_MS = 24 * 60 * 60 * 1000;

  function parseLanguage(value) {
    if (!value) {
      return null;
    }

    var normalized = String(value).toLowerCase().trim();

    if (normalized.indexOf('ru') === 0) {
      return 'ru';
    }
    if (normalized.indexOf('en') === 0) {
      return 'en';
    }

    return null;
  }

  function getStoredValue(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function setStoredValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      return null;
    }
    return value;
  }

  function getSearchLanguage() {
    var params = new URLSearchParams(window.location.search);
    return parseLanguage(params.get('lang'));
  }

  function getManualLanguage() {
    return parseLanguage(getStoredValue(MANUAL_KEY));
  }

  function setManualLanguage(language) {
    var normalized = parseLanguage(language);

    if (normalized) {
      setStoredValue(MANUAL_KEY, normalized);
    }
  }

  function getCachedCountryCode() {
    var code = getStoredValue(COUNTRY_KEY);
    var timestamp = Number(getStoredValue(COUNTRY_TS_KEY));

    if (!code || !timestamp || Number.isNaN(timestamp)) {
      return null;
    }

    if (Date.now() - timestamp > COUNTRY_TTL_MS) {
      return null;
    }

    return String(code).toUpperCase();
  }

  function setCachedCountryCode(code) {
    if (!code) {
      return;
    }

    setStoredValue(COUNTRY_KEY, String(code).toUpperCase());
    setStoredValue(COUNTRY_TS_KEY, String(Date.now()));
  }

  function getNavigatorLanguage() {
    return parseLanguage(window.navigator.language || window.navigator.userLanguage || '');
  }

  function stripLanguageParam() {
    var params = new URLSearchParams(window.location.search);
    params.delete('lang');

    var serialized = params.toString();
    return serialized ? '?' + serialized : '';
  }

  function buildTargetUrl(path) {
    return path + stripLanguageParam() + window.location.hash;
  }

  function redirectTo(path) {
    if (!path) {
      return;
    }

    var target = buildTargetUrl(path);
    var current = window.location.pathname + window.location.search + window.location.hash;

    if (target !== current) {
      window.location.replace(target);
    }
  }

  function fetchCountryCode() {
    var cached = getCachedCountryCode();

    if (cached) {
      return Promise.resolve(cached);
    }

    if (!window.fetch) {
      return Promise.resolve(null);
    }

    return window.fetch('https://ipapi.co/json/', {
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Geo lookup failed with status ' + response.status);
        }

        return response.json();
      })
      .then(function(payload) {
        var code = payload && payload.country_code ? String(payload.country_code).toUpperCase() : null;

        if (code) {
          setCachedCountryCode(code);
        }

        return code;
      })
      .catch(function() {
        return null;
      });
  }

  function detectPreferredLanguage() {
    return fetchCountryCode().then(function(code) {
      if (code) {
        return code === 'RU' ? 'ru' : 'en';
      }

      return getNavigatorLanguage() || 'en';
    });
  }

  function updateSwitchers(currentLanguage) {
    var switchers = document.querySelectorAll('[data-lang-switch]');

    switchers.forEach(function(node) {
      var language = parseLanguage(node.getAttribute('data-lang-switch'));
      var isActive = language === currentLanguage;

      node.classList.toggle('is-active', isActive);

      if (isActive) {
        node.setAttribute('aria-current', 'true');
      } else {
        node.removeAttribute('aria-current');
      }
    });
  }

  function bindSwitchers() {
    var switchers = document.querySelectorAll('[data-lang-switch]');

    switchers.forEach(function(node) {
      node.addEventListener('click', function(event) {
        var language = parseLanguage(node.getAttribute('data-lang-switch'));
        var href = node.getAttribute('href');

        if (!language || !href) {
          return;
        }

        event.preventDefault();
        setManualLanguage(language);
        redirectTo(href);
      });
    });
  }

  function initPage(config) {
    var currentLanguage = parseLanguage(config && config.currentLanguage);
    var targets = config && config.targets ? config.targets : {};
    var disableAutoRedirect = Boolean(config && config.disableAutoRedirect);
    var queryLanguage = getSearchLanguage();
    var manualLanguage;

    if (!currentLanguage) {
      return Promise.resolve(null);
    }

    updateSwitchers(currentLanguage);
    bindSwitchers();

    if (disableAutoRedirect) {
      if (queryLanguage) {
        setManualLanguage(queryLanguage);
      }

      return Promise.resolve(currentLanguage);
    }

    if (queryLanguage) {
      setManualLanguage(queryLanguage);

      if (queryLanguage !== currentLanguage && targets[queryLanguage]) {
        redirectTo(targets[queryLanguage]);
      }

      return Promise.resolve(queryLanguage);
    }

    manualLanguage = getManualLanguage();
    if (manualLanguage) {
      if (manualLanguage !== currentLanguage && targets[manualLanguage]) {
        redirectTo(targets[manualLanguage]);
      }

      return Promise.resolve(manualLanguage);
    }

    return detectPreferredLanguage().then(function(detectedLanguage) {
      if (detectedLanguage && detectedLanguage !== currentLanguage && targets[detectedLanguage]) {
        redirectTo(targets[detectedLanguage]);
      }

      return detectedLanguage || currentLanguage;
    });
  }

  window.SiteLocale = {
    getManualLanguage: getManualLanguage,
    initPage: initPage,
    setManualLanguage: setManualLanguage
  };
})();
