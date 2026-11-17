// Meniu mobil
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Galerie foto (lightbox simplu)
const galleries = document.querySelectorAll('.gallery a');
if (galleries.length) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const closeLabel = document.documentElement.lang === 'en' ? 'Close' : 'Închide';
  box.innerHTML = '<button type="button" aria-label="' + closeLabel + '">×</button><img alt="">';
  document.body.appendChild(box);
  const img = box.querySelector('img');
  const close = () => box.classList.remove('open');
  galleries.forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    img.src = a.href;
    img.alt = a.querySelector('img')?.alt || '';
    box.classList.add('open');
    box.querySelector('button').focus();
  }));
  box.addEventListener('click', e => { if (e.target !== img) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
