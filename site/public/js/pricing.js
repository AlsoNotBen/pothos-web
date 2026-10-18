// Price calculator for pricing.html. Adds data-price of each switch that is on.
(function () {
  var inputs = [].slice.call(document.querySelectorAll('.toggles input'));

  function update() {
    var sum = { month: 0, once: 0 };
    inputs.forEach(function (i) { if (i.checked) sum[i.dataset.per] += Number(i.dataset.price); });
    document.getElementById('total-month').textContent = '$' + sum.month.toLocaleString();
    document.getElementById('total-once').textContent = '$' + sum.once.toLocaleString();
  }

  inputs.forEach(function (i) { i.addEventListener('change', update); });
  update();
})();
