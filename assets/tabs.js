/* Taburi simple: butoane [role=tab] în .dash-tabs, legate prin aria-controls de [role=tabpanel]; #hash alege tabul. */
(function () {
  const tabs = [...document.querySelectorAll('.dash-tabs [role="tab"]')];
  if (!tabs.length) return;
  function show(id, push) {
    tabs.forEach(t => {
      const on = t.id === 'tab-' + id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (push) { try { history.replaceState(null, '', '#' + id); } catch (e) {} }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.id.slice(4), true));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
    });
  });
  const fromHash = () => { const h = location.hash.slice(1); if (h && document.getElementById('tab-' + h)) show(h, false); };
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
