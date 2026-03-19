const input = document.getElementById('character-search-input');
const form = document.getElementById('character-search-form');
const hint = document.getElementById('search-hint');
const grid = document.getElementById('character-grid');
const genderSelect = document.getElementById('filter-gender');
const classificationSelect = document.getElementById('filter-classification');
const affiliationSelect = document.getElementById('filter-affiliation');
const clearFiltersButton = document.getElementById('clear-filters');

let characterNames = [];
let fetchTimeout = null;

function setHint(message) {
  if (!hint) return;
  hint.textContent = message || '';
}

function fetchCharacters(search) {
  const query = encodeURIComponent(search || '');
  return fetch(`/api/characters?search=${query}`)
    .then((res) => res.json())
    .catch(() => []);
}

function fetchCharacterList(filters) {
  const params = new URLSearchParams();
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.powerClassification) params.set('powerClassification', filters.powerClassification);
  if (filters.affiliation) params.set('affiliation', filters.affiliation);
  const query = params.toString();
  return fetch(`/api/characters/list${query ? `?${query}` : ''}`)
    .then((res) => res.json())
    .catch(() => []);
}

function fetchFilterOptions() {
  return fetch('/api/characters/filters')
    .then((res) => res.json())
    .catch(() => ({
      genders: [],
      powerClassifications: [],
      affiliations: [],
    }));
}

function renderCharacterGrid(rows) {
  if (!grid) return;
  grid.innerHTML = '';
  if (!rows || rows.length === 0) {
    grid.innerHTML = '<p>No characters match these filters.</p>';
    return;
  }
  rows.forEach((row) => {
    const link = document.createElement('a');
    link.className = 'character-tile';
    link.href = `character.html?name=${encodeURIComponent(row.name)}`;
    link.textContent = row.name;
    grid.appendChild(link);
  });
}

function populateSelect(select, values) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">All</option>';
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = current;
}

function getFilters() {
  return {
    gender: genderSelect ? genderSelect.value : '',
    powerClassification: classificationSelect ? classificationSelect.value : '',
    affiliation: affiliationSelect ? affiliationSelect.value : '',
  };
}

function refreshCharacterList() {
  return fetchCharacterList(getFilters()).then((rows) => {
    renderCharacterGrid(rows);
  });
}

function refreshNames(search) {
  return fetchCharacters(search).then((rows) => {
    characterNames.length = 0;
    rows.forEach((row) => characterNames.push(row.name));
    if (rows.length === 0 && search) {
      setHint('No matching characters found.');
    } else {
      setHint('');
    }
  });
}

function autocomplete(inp, arrRef) {
  let currentFocus;

  inp.addEventListener('input', function () {
    const val = this.value;
    closeAllLists();

    if (!val) return false;

    currentFocus = -1;
    const list = document.createElement('div');
    list.setAttribute('id', this.id + 'autocomplete-list');
    list.setAttribute('class', 'autocomplete-items');
    this.parentNode.appendChild(list);

    arrRef.forEach((name) => {
      if (name.substr(0, val.length).toUpperCase() === val.toUpperCase()) {
        const item = document.createElement('div');
        item.innerHTML = '<strong>' + name.substr(0, val.length) + '</strong>';
        item.innerHTML += name.substr(val.length);
        item.innerHTML += "<input type='hidden' value='" + name + "'>";
        item.addEventListener('click', function () {
          inp.value = this.getElementsByTagName('input')[0].value;
          closeAllLists();
        });
        list.appendChild(item);
      }
    });
  });

  inp.addEventListener('keydown', function (e) {
    let x = document.getElementById(this.id + 'autocomplete-list');
    if (x) x = x.getElementsByTagName('div');

    if (e.keyCode === 40) {
      currentFocus++;
      addActive(x);
    } else if (e.keyCode === 38) {
      currentFocus--;
      addActive(x);
    } else if (e.keyCode === 13) {
      e.preventDefault();
      if (currentFocus > -1 && x) {
        x[currentFocus].click();
      }
    }
  });

  function addActive(x) {
    if (!x) return false;
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    x[currentFocus].classList.add('autocomplete-active');
  }

  function removeActive(x) {
    for (let i = 0; i < x.length; i++) {
      x[i].classList.remove('autocomplete-active');
    }
  }

  function closeAllLists(elmnt) {
    const x = document.getElementsByClassName('autocomplete-items');
    for (let i = 0; i < x.length; i++) {
      if (elmnt !== x[i] && elmnt !== inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }

  document.addEventListener('click', function (e) {
    closeAllLists(e.target);
  });
}

autocomplete(input, characterNames);

input.addEventListener('input', () => {
  const search = input.value.trim();
  if (fetchTimeout) clearTimeout(fetchTimeout);
  fetchTimeout = setTimeout(() => refreshNames(search), 150);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const search = input.value.trim();
  if (!search) {
    setHint('Type a character name to search.');
    return;
  }
  window.location.href = `character.html?name=${encodeURIComponent(search)}`;
});

refreshNames('');

if (genderSelect || classificationSelect || affiliationSelect) {
  fetchFilterOptions().then((data) => {
    populateSelect(genderSelect, data.genders || []);
    populateSelect(classificationSelect, data.powerClassifications || []);
    populateSelect(affiliationSelect, data.affiliations || []);
  });

  if (genderSelect) genderSelect.addEventListener('change', refreshCharacterList);
  if (classificationSelect) classificationSelect.addEventListener('change', refreshCharacterList);
  if (affiliationSelect) affiliationSelect.addEventListener('change', refreshCharacterList);
  if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', () => {
      if (genderSelect) genderSelect.value = '';
      if (classificationSelect) classificationSelect.value = '';
      if (affiliationSelect) affiliationSelect.value = '';
      refreshCharacterList();
    });
  }
  refreshCharacterList();
}
