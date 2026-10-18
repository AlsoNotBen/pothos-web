// Draws the roadmap list (platform.html) as a network graph:
// hub -> modules -> items. With no script, the list shows.
(function () {
  var box = document.querySelector('.roadmap');
  if (!box) return;

  var NS = 'http://www.w3.org/2000/svg';
  var R1 = 180, R2 = 300, SIZE = 420; // ring radii and half of the viewBox
  var LABEL = { done: 'Released', busy: 'In progress', planned: 'Planned' };
  var PILL = { done: 'status status--ok', busy: 'status status--busy', planned: 'status' };

  var modules = [].map.call(box.querySelectorAll('.roadmap__module'), function (m) {
    return {
      name: m.querySelector('h3').textContent,
      items: [].map.call(m.querySelectorAll('li'), function (li) {
        var p = li.querySelector('p');
        return {
          name: li.querySelector('strong').textContent,
          status: LABEL[li.dataset.status] ? li.dataset.status : 'planned',
          text: p ? p.textContent : ''
        };
      })
    };
  });

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var svg = el('svg', { class: 'graph', viewBox: [-SIZE, -SIZE, 2 * SIZE, 2 * SIZE].join(' '), role: 'group', 'aria-label': 'Roadmap graph' });
  var edges = el('g', {}, svg);
  var nodes = el('g', {}, svg);

  var detail = document.createElement('div');
  detail.className = 'graph__detail';
  detail.setAttribute('aria-live', 'polite');
  detail.innerHTML = '<p>Select an item to see its details.</p>';

  var active;
  function show(item, node) {
    if (active) active.classList.remove('is-active');
    active = node;
    node.classList.add('is-active');
    detail.innerHTML = '<h3></h3><p></p>';
    detail.querySelector('h3').textContent = item.name + ' ';
    var pill = document.createElement('span');
    pill.className = PILL[item.status];
    pill.textContent = LABEL[item.status];
    detail.querySelector('h3').appendChild(pill);
    detail.querySelector('p').textContent = item.text;
  }

  // Each module gets a slice of the circle. A module with more items gets a larger slice.
  var weight = modules.reduce(function (sum, m) { return sum + m.items.length + 1; }, 0);
  var angle = -Math.PI / 2;

  modules.forEach(function (m) {
    var slice = 2 * Math.PI * (m.items.length + 1) / weight;
    var mid = angle + slice / 2;
    var mx = R1 * Math.cos(mid), my = R1 * Math.sin(mid);
    el('line', { class: 'graph__edge', x1: 0, y1: 0, x2: mx, y2: my }, edges);

    m.items.forEach(function (item, i) {
      var a = angle + slice * (i + 1) / (m.items.length + 1);
      var deg = a * 180 / Math.PI;
      var left = Math.cos(a) < 0;
      el('line', { class: 'graph__edge graph__edge--' + item.status, x1: mx, y1: my, x2: R2 * Math.cos(a), y2: R2 * Math.sin(a) }, edges);

      var g = el('g', { class: 'graph__item graph__item--' + item.status, transform: 'rotate(' + deg + ') translate(' + R2 + ',0)', tabindex: 0, 'aria-label': item.name + ', ' + LABEL[item.status] }, nodes);
      el('circle', { r: 7 }, g);
      var t = el('text', left ? { x: -14, dy: '0.35em', 'text-anchor': 'end', transform: 'rotate(180)' } : { x: 14, dy: '0.35em' }, g);
      t.textContent = item.name;

      g.addEventListener('click', function () { show(item, g); });
      g.addEventListener('focus', function () { show(item, g); });
      g.addEventListener('mouseenter', function () { show(item, g); });
    });

    var w = m.name.length * 7.4 + 28;
    var mg = el('g', { class: 'graph__module', transform: 'translate(' + mx + ',' + my + ')' }, nodes);
    el('rect', { x: -w / 2, y: -15, width: w, height: 30, rx: 15 }, mg);
    el('text', { 'text-anchor': 'middle', dy: '0.35em' }, mg).textContent = m.name;

    angle += slice;
  });

  el('circle', { class: 'graph__hub', r: 44 }, nodes);
  var brand = document.querySelector('.brand__text');
  el('text', { class: 'graph__hub-text', 'text-anchor': 'middle', dy: '0.35em' }, nodes).textContent = brand ? brand.textContent : '';

  var legend = document.createElement('div');
  legend.className = 'graph__legend';
  legend.innerHTML = Object.keys(LABEL).map(function (k) { return '<span class="' + PILL[k] + '">' + LABEL[k] + '</span>'; }).join('');

  box.parentNode.classList.add('has-graph');
  box.parentNode.insertBefore(svg, box);
  box.parentNode.insertBefore(legend, box);
  box.parentNode.insertBefore(detail, box);
})();
