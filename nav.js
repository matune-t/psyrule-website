// Attribution forwarding. Captures utm_*/ref/referrer/landing_path on
// first visit into sessionStorage and stamps any outbound app.psyrule.app
// link on click so the signup form can persist the source across the
// origin boundary (sessionStorage is per-origin, the URL is the bridge).
(function () {
  var URL_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref']
  var STORAGE_KEY = 'psyrule_attribution'

  try {
    var params = new URLSearchParams(window.location.search)
    var existingRaw = sessionStorage.getItem(STORAGE_KEY)
    var existing = existingRaw ? JSON.parse(existingRaw) : null
    var fresh = existing || {}
    URL_KEYS.forEach(function (k) { if (params.has(k)) fresh[k] = params.get(k) })
    // referrer + landing_path are captured once, on first marketing-site
    // visit of the session. Subsequent internal navigations don't
    // overwrite them — that would clobber the original entry point.
    if (!existing) {
      if (document.referrer) fresh.referrer = document.referrer
      fresh.landing_path = window.location.pathname
    }
    if (Object.keys(fresh).length) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    }
  } catch (e) {}

  function getAttribution() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch (e) { return null }
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]')
    if (!a) return
    var href = a.getAttribute('href')
    if (!href || href.indexOf('app.psyrule.app') === -1) return
    var attribution = getAttribution()
    if (!attribution) return
    try {
      var url = new URL(href)
      Object.keys(attribution).forEach(function (k) {
        if (!url.searchParams.has(k)) url.searchParams.set(k, attribution[k])
      })
      a.setAttribute('href', url.toString())
    } catch (err) {}
  }, true)
})();

// Mobile nav drawer toggle. Loaded by every page; bails quietly if the
// nav markup isn't on the page.
(function () {
  var nav = document.querySelector('nav')
  var toggle = nav && nav.querySelector('.nav-toggle')
  if (!nav || !toggle) return

  function open() {
    nav.classList.add('nav-open')
    toggle.setAttribute('aria-expanded', 'true')
  }
  function close() {
    nav.classList.remove('nav-open')
    toggle.setAttribute('aria-expanded', 'false')
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation()
    if (nav.classList.contains('nav-open')) close()
    else open()
  })

  // Tap outside the nav shell to dismiss.
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('nav-open') && !nav.contains(e.target)) close()
  })

  // Escape closes — standard a11y for transient overlays.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close()
  })

  // Tapping a link inside the drawer should also dismiss (same-page anchors
  // wouldn't trigger a navigation otherwise).
  nav.querySelectorAll('.nav-r .nav-link').forEach(function (link) {
    link.addEventListener('click', close)
  })

  // If the viewport grows past the mobile breakpoint while open, snap shut.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 960) close()
  })
})();
