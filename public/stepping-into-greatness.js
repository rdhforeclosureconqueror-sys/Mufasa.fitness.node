(() => {
  const links = document.querySelectorAll('[data-start-greatness]');
  const token = localStorage.getItem('maatAuthToken');
  links.forEach(link => link.setAttribute('href', '/login.html?returnTo=%2Fgreatness.html'));
  if (token) fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
    .then(response => { if (response.ok) links.forEach(link => link.setAttribute('href', '/greatness.html')); })
    .catch(() => {});

  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(item => observer.observe(item));
})();
