// Tabs for platform.html. With no script, all panels show.
// The URL hash selects a tab: /platform#roadmap
(function () {
  var list = document.querySelector('.tabs__list');
  if (!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    history.replaceState(null, '', '#' + tab.dataset.id);
  }

  list.hidden = false;
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });

  var start = tabs.filter(function (t) { return '#' + t.dataset.id === location.hash; })[0];
  select(start || tabs[0]);
})();
