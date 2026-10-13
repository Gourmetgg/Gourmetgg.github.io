const storageKey = 'margin-favorites';
const initialFavorites = [];
let favorites;
function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    favorites = new Set(Array.isArray(saved) ? saved : initialFavorites);
  } catch {
    favorites = new Set(initialFavorites);
  }
}
loadFavorites();

const filterButtons = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('[data-post]')];
let typingTimer;
function describe(text, animate = true) {
  const description = document.querySelector('#filter-description');
  if (!description) return;
  clearInterval(typingTimer);
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    description.textContent = text;
    return;
  }
  description.textContent = '';
  let i = 0;
  typingTimer = setInterval(() => {
    description.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typingTimer);
  }, 30);
}

function filterPosts(filter, animate = true) {
  let count = 0;
  cards.forEach(card => {
    const visible = filter === 'all' || (filter === 'fav' ? favorites.has(card.dataset.post) : card.dataset.year === filter);
    card.hidden = !visible;
    if (visible) count++;
  });
  filterButtons.forEach(button => {
    const selected = button.dataset.filter === filter;
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? `[${filter}]` : button.dataset.filter;
  });
  describe(filter === 'all' ? 'all posts' : filter === 'fav' ? 'favorite posts' : `posts from 20${filter}`, animate);
  const empty = document.querySelector('#empty-state');
  if (empty) empty.hidden = count > 0;
  const countOutput = document.querySelector('#post-count');
  if (countOutput) countOutput.textContent = `${count} ${count === 1 ? 'post' : 'posts'}`;
}

function currentFilter() {
  const value = new URLSearchParams(location.search).get('filter');
  return filterButtons.some(button => button.dataset.filter === value) ? value : (filterButtons[0]?.dataset.filter || 'all');
}
if (filterButtons.length) {
  filterPosts(currentFilter(), false);
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.filter;
    const url = new URL(location.href);
    url.searchParams.set('filter', value);
    history.pushState({}, '', url);
    filterPosts(value);
  }));
  addEventListener('popstate', () => filterPosts(currentFilter(), false));
  addEventListener('pageshow', () => {
    loadFavorites();
    filterPosts(currentFilter(), false);
  });
  document.querySelector('#show-all')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('filter', 'all');
    history.pushState({}, '', url);
    filterPosts('all');
  });
}

const favoriteButton = document.querySelector('#favorite-button');
function updateFavoriteButton() {
  if (!favoriteButton) return;
  const saved = favorites.has(favoriteButton.dataset.slug);
  favoriteButton.textContent = saved ? '[saved to favorites]' : '[save to favorites]';
  favoriteButton.setAttribute('aria-pressed', String(saved));
}
if (favoriteButton) {
  updateFavoriteButton();
  addEventListener('pageshow', () => {
    loadFavorites();
    updateFavoriteButton();
  });
  favoriteButton.addEventListener('click', () => {
    const slug = favoriteButton.dataset.slug;
    if (favorites.has(slug)) favorites.delete(slug); else favorites.add(slug);
    updateFavoriteButton();
    const feedback = document.querySelector('#favorite-feedback');
    try {
      localStorage.setItem(storageKey, JSON.stringify([...favorites]));
      feedback.textContent = favorites.has(slug) ? 'Saved in this browser.' : 'Removed from favorites.';
    } catch {
      feedback.textContent = 'Updated for this page. Browser storage is unavailable.';
    }
  });
}
addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  loadFavorites();
  if (filterButtons.length) filterPosts(currentFilter(), false);
  updateFavoriteButton();
});
