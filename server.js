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