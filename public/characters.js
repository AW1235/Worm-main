const input = document.getElementById('character-search-input');
const form = document.getElementById('character-search-form');
const hint = document.getElementById('search-hint');

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
