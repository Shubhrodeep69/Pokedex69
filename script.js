const grid = document.getElementById("pokemonGrid");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const regionFilter = document.getElementById("regionFilter");
const favoritesOnlyCheckbox = document.getElementById("favoritesOnly");

const modal = document.getElementById("detailsModal");
const modalName = document.getElementById("modalName");
const modalImage = document.getElementById("modalImage");
const baseStats = document.getElementById("baseStats");
const modalMoves = document.getElementById("modalMoves");
const closeModal = document.getElementById("closeModal");
const statsChartCanvas = document.getElementById("statsChart");
const evolutionChainContainer = document.getElementById("evolutionChainContainer");

let statsChart;
let allPokemon = [];
let filteredPokemon = [];
let currentPage = 1;
const itemsPerPage = 20;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

const regionRanges = {
  kanto: [1, 151], johto: [152, 251], hoenn: [252, 386],
  sinnoh: [387, 493], unova: [494, 649], kalos: [650, 721],
  alola: [722, 809], galar: [810, 905], paldea: [906, 1025]
};

function createCard(pokemon) {
  const card = document.createElement("div");
  card.className = "card";
  const isFavorite = favorites.includes(pokemon.id);
  const typesHTML = pokemon.types.map(t =>
    `<span class="card-type type-${t.type.name}">${t.type.name}</span>`
  ).join('');
  card.innerHTML = `
    <span class="favorite-icon ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${pokemon.id})">
      ${isFavorite ? '❤️' : '🤍'}
    </span>
    <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}" />
    <h3>${pokemon.name}</h3>
    <div class="card-types">${typesHTML}</div>
  `;
  card.onclick = () => showDetails(pokemon);
  grid.appendChild(card);
}

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(favId => favId !== id);
  } else {
    favorites.push(id);
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
  filterPokemons();
}

function filterPokemons() {
  let filtered = allPokemon;
  const searchValue = searchInput.value.toLowerCase();
  const typeValue = typeFilter.value;
  const regionValue = regionFilter.value;
  const showFavoritesOnly = favoritesOnlyCheckbox.checked;

  if (searchValue) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchValue));
  }
  if (typeValue) {
    filtered = filtered.filter(p => p.types.some(t => t.type.name === typeValue));
  }
  if (regionValue) {
    const [start, end] = regionRanges[regionValue];
    filtered = filtered.filter(p => p.id >= start && p.id <= end);
  }
  if (showFavoritesOnly) {
    filtered = filtered.filter(p => favorites.includes(p.id));
  }

  filteredPokemon = filtered;
  renderPage();
}

function renderPage() {
  grid.innerHTML = "";
  pagination.innerHTML = "";
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  filteredPokemon.slice(start, end).forEach(createCard);
  const totalPages = Math.ceil(filteredPokemon.length / itemsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => { currentPage = i; renderPage(); };
    pagination.appendChild(btn);
  }
}

async function showDetails(pokemon) {
  modal.classList.remove("hidden");
  modalName.textContent = pokemon.name;
  modalImage.src = pokemon.sprites.other['official-artwork'].front_default;

  if (statsChart) statsChart.destroy();
  statsChart = new Chart(statsChartCanvas, {
    type: 'radar',
    data: {
      labels: pokemon.stats.map(s => s.stat.name),
      datasets: [{
        label: 'Base Stats',
        data: pokemon.stats.map(s => s.base_stat),
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)'
      }]
    }
  });

  baseStats.innerHTML = pokemon.stats.map(s => `<li>${s.stat.name}: ${s.base_stat}</li>`).join('');
  modalMoves.innerHTML = pokemon.moves.slice(0, 10).map(m => `<li>${m.move.name}</li>`).join('');

  const speciesRes = await fetch(pokemon.species.url);
  const speciesData = await speciesRes.json();
  const evoRes = await fetch(speciesData.evolution_chain.url);
  const evoData = await evoRes.json();

  evolutionChainContainer.innerHTML = "";
  let evo = evoData.chain;
  while (evo) {
    const evoName = evo.species.name;
    const evoDetails = await fetch(`https://pokeapi.co/api/v2/pokemon/${evoName}`).then(res => res.json());
    const evoStage = document.createElement("div");
    evoStage.className = "evo-stage";
    evoStage.innerHTML = `<img src="${evoDetails.sprites.other['official-artwork'].front_default}" alt="${evoName}"><p>${evoName}</p>`;
    evoStage.onclick = () => showDetails(evoDetails);
    evolutionChainContainer.appendChild(evoStage);
    evo = evo.evolves_to[0];
  }
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

closeModal.onclick = () => modal.classList.add("hidden");

async function fetchPokemonData() {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
  const data = await res.json();
  const promises = data.results.map(p => fetch(p.url).then(res => res.json()));
  allPokemon = await Promise.all(promises);
  filterPokemons();
}

searchInput.addEventListener("input", filterPokemons);
typeFilter.addEventListener("change", filterPokemons);
regionFilter.addEventListener("change", filterPokemons);
favoritesOnlyCheckbox.addEventListener("change", filterPokemons);

fetchPokemonData();
