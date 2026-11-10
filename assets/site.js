document.querySelectorAll('.nav-toggle').forEach((button) => {
  const nav = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
    button.querySelector('.nav-toggle-text').textContent = open ? 'Close' : 'Menu';
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open menu');
    nav.classList.remove('open');
    button.querySelector('.nav-toggle-text').textContent = 'Menu';
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      button.click();
      button.focus();
    }
  });
});
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
