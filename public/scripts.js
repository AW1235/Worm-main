function getNameParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('name');
}

function renderCharacter(character) {
  const result = document.getElementById('result');
  if (!result) return;

  result.innerHTML = `
    <div class="character-card">
      <h2>${character.name}</h2>
      <div class="character-grid">
        <div><strong>Age</strong><span>${character.age ?? 'Unknown'}</span></div>
        <div><strong>Affiliation</strong><span>${character.affiliation ?? 'Unknown'}</span></div>
        <div><strong>Power</strong><span>${character.power ?? 'Unknown'}</span></div>
        <div><strong>Classification</strong><span>${character.powerClassification ?? 'Unknown'}</span></div>
        <div><strong>First Appearance</strong><span>${character.firstAppearance ?? 'Unknown'}</span></div>
        <div><strong>Gender</strong><span>${character.gender ?? 'Unknown'}</span></div>
      </div>
    </div>
  `;
}

function renderError(message) {
  const result = document.getElementById('result');
  if (!result) return;
  result.innerHTML = `<p>${message}</p>`;
}

function displayCharacter() {
  const name = getNameParam();
  if (!name) {
    renderError('Missing character name.');
    return;
  }

  fetch(`/api/characters/by-name?name=${encodeURIComponent(name)}`)
    .then((res) => {
      if (!res.ok) throw new Error('Character not found.');
      return res.json();
    })
    .then((character) => renderCharacter(character))
    .catch(() => renderError('Character not found.'));
}

displayCharacter();
