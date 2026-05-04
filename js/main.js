// IDs de los 30 Pokémon que vamos a mostrar
const POKEMON_IDS = [
  1,4,7,25,39,52,54,63,66,74,
  79,81,92,94,104,116,131,133,143,147,
  152,155,158,175,196,197,243,244,245,249
];

// Precio según el tipo de Pokémon
const TYPE_PRICES = {
  fire:4.99, water:3.99, grass:3.49, electric:5.99,
  psychic:6.99, dragon:9.99, ice:4.49, dark:5.49,
  fairy:4.99, ghost:6.49, steel:5.49, normal:2.99,
  fighting:3.99, poison:3.49, ground:3.99, flying:4.49,
  bug:2.49, rock:3.49
};

// Pokémon legendarios tienen precio especial
const LEGENDARY = [144,145,146,149,150,151,243,244,245,249,250];

// Estado global de la app
let allCards      = [];
let filteredCards = [];
let ownedIds      = new Set(JSON.parse(localStorage.getItem('pkm_owned') || '[]'));
let currentCard   = null;
let activeType    = 'all';
let searchTerm    = '';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getPrice(types, id) {
  if (LEGENDARY.includes(id)) return 14.99;
  const t = types[0]?.type?.name || 'normal';
  return TYPE_PRICES[t] || 2.99;
}

function typeClass(t) { return `t-${t}`; }

// Carga los 30 pokémon desde la PokéAPI
async function loadCards() {
  try {
    const results = await Promise.all(
      POKEMON_IDS.map(id =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
          .then(r => r.json())
          .catch(() => null)
      )
    );

    allCards = results.filter(Boolean).map(p => ({
      id:    p.id,
      name:  p.name,
      img:   p.sprites?.other?.['official-artwork']?.front_default
             || p.sprites?.front_default || '',
      types: p.types,
      stats: p.stats,
      price: getPrice(p.types, p.id),
      owned: ownedIds.has(p.id)
    }));

    buildTypeFilters();
    filteredCards = [...allCards];
    renderGrid();

    document.getElementById('market-loader').style.display = 'none';
    document.getElementById('cards-grid').style.display    = 'grid';
    updateOwnedCount();

  } catch (err) {
    console.error('Error cargando Pokémon:', err);
    document.getElementById('market-loader').innerHTML =
      '<p style="color:#e05555">❌ Error cargando cartas. Verifica tu conexión.</p>';
  }
}

// Genera los botones de filtro por tipo automáticamente
function buildTypeFilters() {
  const types = new Set();
  allCards.forEach(c => c.types.forEach(t => types.add(t.type.name)));

  const wrap   = document.getElementById('filters-wrap');
  const search = wrap.querySelector('.search-wrap');

  types.forEach(t => {
    const btn       = document.createElement('button');
    btn.className   = 'filter-btn';
    btn.textContent = capitalize(t);
    btn.onclick     = () => filterType(t, btn);
    wrap.insertBefore(btn, search);
  });
}

function filterType(type, btn) {
  activeType = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function filterSearch(val) {
  searchTerm = val.toLowerCase();
  applyFilters();
}

function applyFilters() {
  filteredCards = allCards.filter(c => {
    const matchType   = activeType === 'all' || c.types.some(t => t.type.name === activeType);
    const matchSearch = !searchTerm || c.name.includes(searchTerm);
    return matchType && matchSearch;
  });
  renderGrid();
}

// Dibuja las cartas en pantalla
function renderGrid() {
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';

  // Las cartas compradas aparecen primero
  const sorted = [...filteredCards].sort((a, b) => {
    return (ownedIds.has(a.id) ? 0 : 1) - (ownedIds.has(b.id) ? 0 : 1);
  });

  if (!sorted.length) {
    grid.innerHTML = '<p style="color:#8899bb;padding:2rem">No se encontraron cartas.</p>';
    return;
  }

  sorted.forEach(card => {
    const isOwned = ownedIds.has(card.id);
    const el      = document.createElement('div');
    el.className  = `poke-card ${isOwned ? 'owned' : 'locked'}`;
    el.innerHTML  = `
      ${isOwned ? '<span class="owned-badge">✓ Tuya</span>' : ''}
      <div class="card-img-wrap">
        <img src="${card.img}" alt="${card.name}" loading="lazy"/>
        <div class="lock-icon">🔒</div>
      </div>
      <div class="card-info">
        <div class="card-name">${capitalize(card.name)}</div>
        <div class="card-types">
          ${card.types.map(t => `<span class="type-badge ${typeClass(t.type.name)}">${t.type.name}</span>`).join('')}
        </div>
        <div class="card-price">
          <span class="price">$${card.price}</span>
          <button class="buy-btn"
            ${isOwned ? 'disabled' : ''}
            onclick="openModal(event, ${card.id})">
            ${isOwned ? '✅ Adquirida' : '🛒 Comprar'}
          </button>
        </div>
      </div>`;
    grid.appendChild(el);
  });
}

// Abre el modal con los detalles de la carta
function openModal(e, id) {
  e.stopPropagation();
  const card = allCards.find(c => c.id === id);
  if (!card || ownedIds.has(card.id)) return;

  currentCard = card;

  document.getElementById('m-img').src           = card.img;
  document.getElementById('m-name').textContent  = capitalize(card.name);
  document.getElementById('m-price').textContent = `$${card.price} USD`;

  document.getElementById('m-types').innerHTML = card.types
    .map(t => `<span class="type-badge ${typeClass(t.type.name)}">${t.type.name}</span>`)
    .join('');

  document.getElementById('m-stats').innerHTML =
    '<div class="stats-title">ESTADÍSTICAS</div>' +
    card.stats.slice(0, 4).map(s => `
      <div class="stat-row">
        <span class="stat-label">${s.stat.name.replace('-', ' ')}</span>
        <div class="stat-bar-wrap">
          <div class="stat-bar" style="width:${Math.min(s.base_stat, 150) / 150 * 100}%"></div>
        </div>
        <span class="stat-val">${s.base_stat}</span>
      </div>`).join('');

  document.getElementById('payment-status').innerHTML          = '';
  document.getElementById('paypal-button-container').innerHTML = '';
  document.getElementById('modal').style.display               = 'flex';

  initPayPal(card);
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentCard = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// Inicializa el botón de PayPal en el modal
function initPayPal(card) {
  if (typeof paypal === 'undefined') {
    document.getElementById('paypal-button-container').innerHTML =
      `<p class="paypal-error">⚠️ PayPal SDK no cargado. Asegúrate de correr el servidor.</p>`;
    return;
  }

  paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },

    createOrder: async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: card.price.toFixed(2),
          description: `PokéCard: ${capitalize(card.name)}`
        })
      });
      const order = await res.json();
      return order.id;
    },

    onApprove: async (data) => {
      setPaymentStatus('processing', '⏳ Procesando pago...');
      try {
        const res = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const details = await res.json();

        if (details.status === 'COMPLETED') {
          const name = details.payer?.name?.given_name || 'Entrenador';
          unlockCard(card, `✅ ¡Pago exitoso! Bienvenido ${name}, "${capitalize(card.name)}" es tuya.`);
        } else {
          setPaymentStatus('error', `❌ Estado inesperado: ${details.status}`);
        }
      } catch (err) {
        console.error(err);
        setPaymentStatus('error', '❌ Error al capturar el pago.');
      }
    },

    onError: (err) => {
      console.error('PayPal error:', err);
      setPaymentStatus('error', '❌ Error en el pago. La carta permanece bloqueada.');
    },

    onCancel: () => setPaymentStatus('error', '⚠️ Pago cancelado.')

  }).render('#paypal-button-container');
}

// Desbloquea la carta tras pago exitoso
function unlockCard(card, msg) {
  ownedIds.add(card.id);
  localStorage.setItem('pkm_owned', JSON.stringify([...ownedIds]));

  allCards      = allCards.map(c => c.id === card.id ? { ...c, owned: true } : c);
  filteredCards = filteredCards.map(c => c.id === card.id ? { ...c, owned: true } : c);

  setPaymentStatus('success', msg);
  document.getElementById('paypal-button-container').innerHTML = '';
  updateOwnedCount();
  renderGrid();
  showToast(msg, 'success');
  setTimeout(closeModal, 3000);
}

function setPaymentStatus(type, msg) {
  document.getElementById('payment-status').innerHTML =
    `<div class="payment-status status-${type}">${msg}</div>`;
}

function showToast(msg, type) {
  const toast     = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateOwnedCount() {
  const totalCards = POKEMON_IDS.length;
  const ownedTotal = ownedIds.size;

  // badge en pestaña "Mi colección"
  document.getElementById('owned-count').textContent = ownedTotal;

  // contador arriba tipo 0/30
  document.getElementById('cart-count').textContent = `${ownedTotal}/${totalCards}`;
}

// Cambia entre la vista de Mercado y Mis Compras
function showTab(tab) {
  document.getElementById('view-market').style.display      = tab === 'market'      ? 'block' : 'none';
  document.getElementById('view-mypurchases').style.display = tab === 'mypurchases' ? 'block' : 'none';
  document.getElementById('tab-market').classList.toggle('tab-active',      tab === 'market');
  document.getElementById('tab-mypurchases').classList.toggle('tab-active', tab === 'mypurchases');
  if (tab === 'mypurchases') renderPurchases();
}

// Muestra las cartas compradas
function renderPurchases() {
  const owned   = allCards.filter(c => ownedIds.has(c.id));
  const content = document.getElementById('purchases-content');

  if (!owned.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No has comprado ninguna carta aún.</p>
        <button class="btn btn-primary" onclick="showTab('market')">Explorar mercado</button>
      </div>`;
    return;
  }

  const total = owned.reduce((acc, c) => acc + c.price, 0);

  content.innerHTML = `
    <div class="purchases-summary">
      <div class="summary-card">
        <div class="summary-label">Cartas adquiridas</div>
        <div class="summary-val">${owned.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total invertido</div>
        <div class="summary-val">$${total.toFixed(2)}</div>
      </div>
    </div>
    <div class="grid">
      ${owned.map(card => `
        <div class="poke-card owned">
          <span class="owned-badge">✓ Tuya</span>
          <div class="card-img-wrap">
            <img src="${card.img}" alt="${card.name}" loading="lazy"/>
          </div>
          <div class="card-info">
            <div class="card-name">${capitalize(card.name)}</div>
            <div class="card-types">
              ${card.types.map(t => `<span class="type-badge ${typeClass(t.type.name)}">${t.type.name}</span>`).join('')}
            </div>
            <div class="card-price">
              <span class="price">$${card.price}</span>
              <button class="buy-btn" disabled>✅ Adquirida</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// Arranca la app
loadCards();