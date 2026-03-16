// server.js
const express = require('express');

const app = express();
const serveStatic = require('serve-static')
const PORT = 3000;
app.use(express.static('public'));

app.use(serveStatic('public/ftp', { index: ['index.html', 'style.css', 'powers.html', ] }))

// HTML form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

function sum(a, b) {
  return a+ b;
}

module.exports = sum;

// Server Listen to this PORT
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

let mysql = require('mysql');

let con = mysql.createConnection({
  host: "localhost",
  port: '3306',
  user: "root",
  password: "$i11yGoofyC@t$"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

async function loadCharacters() {

    const response = await fetch("characters.json");
    const characters = await response.json();

    let names = characters.map(c => c.name);

    autocomplete(document.getElementById("myInput"), names);

}

loadCharacters();
function showCharacter(name, characters) {

    let character = characters.find(c => c.name === name);

    if (!character) return;

    document.getElementById("result").innerHTML = `
        <h3>${character.name}</h3>
        <p><b>Age:</b> ${character.age}</p>
        <p><b>Affiliation:</b> ${character.affiliation}</p>
        <p><b>Power:</b> ${character.power}</p>
        <p><b>Classification:</b> ${character.powerClassification}</p>
        <p><b>First Appearance:</b> ${character.firstAppearance}</p>
    `;
}
