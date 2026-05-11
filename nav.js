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
})()
