const express = require('express');
const path = require('path');


// set up database connection parameters and export
// them for reuse by other modules
const config = require('./config.json');
const defaultConfig = config.development;
exports.defaultConfig = defaultConfig;

// the custom code for this site
const routes = require('./routes/index');
const geoJSON = require('./routes/geoJSON');
const getJSON = require('./routes/getJSON');
const crud = require('./routes/crud');
const metadata = require('./routes/metadata');

const bodyParser = require('body-parser');

const app = express();
// adding functionality to allow cross-domain queries when PhoneGap is running a server
app.use(function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
	res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	next();
});

// get the tiles
var tilePath = path.join(__dirname, 'tiles');
console.log(tilePath);
app.use('/tiles', express.static(tilePath));

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// the custom code for this site
app.use('/', routes);
app.use('/', geoJSON);
app.use('/', getJSON);
app.use('/', crud);
app.use('/', metadata);
module.exports = app;