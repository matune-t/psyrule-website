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

// Moment scrubber. Drag the handle (or use arrow keys) to walk through a
// real session. The intervention card slides in at 9:50; past that point the
// ghost equity line peels off via SVG clip-path. Default state (no JS) is
// fully scrubbed so the section tells the story for every visitor.
(function () {
  var scenes = document.querySelectorAll('[data-scene]')
  if (!scenes.length) return

  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  Array.prototype.forEach.call(scenes, initScene)

  function initScene (scene) {
    var track = scene.querySelector('[data-scene-track]')
    var handle = scene.querySelector('[data-scene-handle]')
    var clock = scene.querySelector('[data-scene-clock]')
    var handleClock = scene.querySelector('[data-scene-handle-clock]')
    var iv = scene.querySelector('[data-scene-iv]')
    var svg = scene.querySelector('.scene-svg')
    if (!track || !handle || !svg) return

    var playhead = svg.querySelector('.scene-playhead')
    var ghostClip = svg.querySelector('.scene-ghost-clip')
    var stops = svg.querySelector('.scene-stops')

    // Session window: 9:30 → 11:00, 90 minutes.
    var INTERVENTION_T = 20 / 90   // 9:50
    var STOP1_T = 5 / 90           // 9:35

    var progress = 0
    var dragging = false

    function timeAt (p) {
      var mins = 9 * 60 + 30 + Math.round(p * 90)
      var h = Math.floor(mins / 60)
      var m = mins % 60
      return pad(h) + ':' + pad(m)
    }
    function pad (n) { return (n < 10 ? '0' : '') + n }

    function set (p) {
      if (p < 0) p = 0
      if (p > 1) p = 1
      progress = p

      var pct = (p * 100).toFixed(3) + '%'
      scene.style.setProperty('--scene-progress', pct)

      var t = timeAt(p)
      if (clock) clock.textContent = t
      if (handleClock) handleClock.textContent = t
      handle.setAttribute('aria-valuenow', Math.round(p * 90))
      handle.setAttribute('aria-valuetext', t)

      if (playhead) {
        var x = (p * 600).toFixed(2)
        playhead.setAttribute('x1', x)
        playhead.setAttribute('x2', x)
      }

      // Ghost line reveals from x=133 (9:50) rightward.
      if (ghostClip) {
        var w = p > INTERVENTION_T
          ? ((p - INTERVENTION_T) / (1 - INTERVENTION_T)) * (600 - 133)
          : 0
        ghostClip.setAttribute('width', w.toFixed(2))
      }

      if (stops) stops.classList.toggle('is-on', p >= STOP1_T)
      if (iv) iv.classList.toggle('is-on', p >= INTERVENTION_T)
    }

    scene.classList.add('is-live')
    set(0)

    // Auto-play once when the scene comes into view, then hand over.
    if (reduceMotion) {
      set(1)
    } else if ('IntersectionObserver' in window) {
      var played = false
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !played && !dragging) {
            played = true
            playFromTo(0, 1, 3400)
            io.disconnect()
          }
        })
      }, { threshold: 0.4 })
      io.observe(scene)
    } else {
      // Old browsers: just show the post-state.
      set(1)
    }

    function playFromTo (from, to, duration) {
      var start = null
      function step (now) {
        if (dragging) return
        if (start === null) start = now
        var t = Math.min(1, (now - start) / duration)
        // ease-out-quart — pronounced settle.
        var eased = 1 - Math.pow(1 - t, 4)
        set(from + (to - from) * eased)
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    function progressFromClientX (clientX) {
      var rect = track.getBoundingClientRect()
      return (clientX - rect.left) / rect.width
    }

    function onPointerDown (e) {
      // Ignore right-click and multi-touch beyond first.
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      dragging = true
      handle.classList.add('is-grabbing')
      try { if (e.pointerId !== undefined) handle.setPointerCapture(e.pointerId) } catch (_) {}
      set(progressFromClientX(e.clientX))
    }
    function onPointerMove (e) {
      if (!dragging) return
      set(progressFromClientX(e.clientX))
    }
    function onPointerUp () {
      if (!dragging) return
      dragging = false
      handle.classList.remove('is-grabbing')
    }

    if ('PointerEvent' in window) {
      track.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      document.addEventListener('pointercancel', onPointerUp)
    } else {
      // Fallback for older Safari without PointerEvents.
      track.addEventListener('mousedown', function (e) { onPointerDown({ button: 0, clientX: e.clientX, preventDefault: function () { e.preventDefault() } }) })
      document.addEventListener('mousemove', function (e) { onPointerMove({ clientX: e.clientX }) })
      document.addEventListener('mouseup', onPointerUp)
      track.addEventListener('touchstart', function (e) { onPointerDown({ button: 0, clientX: e.touches[0].clientX, preventDefault: function () { e.preventDefault() } }) }, { passive: false })
      document.addEventListener('touchmove', function (e) { onPointerMove({ clientX: e.touches[0].clientX }) }, { passive: true })
      document.addEventListener('touchend', onPointerUp)
    }

    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 0.1 : 0.02
      var key = e.key
      if (key === 'ArrowRight' || key === 'ArrowUp')      { e.preventDefault(); set(progress + step) }
      else if (key === 'ArrowLeft' || key === 'ArrowDown'){ e.preventDefault(); set(progress - step) }
      else if (key === 'Home')                            { e.preventDefault(); set(0) }
      else if (key === 'End')                             { e.preventDefault(); set(1) }
      else if (key === 'PageUp')                          { e.preventDefault(); set(progress + 0.1) }
      else if (key === 'PageDown')                        { e.preventDefault(); set(progress - 0.1) }
    })
  }
})();
