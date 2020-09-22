  const express = require('express');
  const metadata = express.Router();

  var config = require('./config');
  const pg = require('pg');
  console.log(config.user);

  var request = require('request');
  var pool = new pg.Pool(config);

  metadata.route('/testMetadata')
      .get(function (req, res) {
        res.json({message:req.originalUrl});
  });

  // get the initial details - extent and id - of the site
  // if you have the site name
  metadata.route('/getSiteDetails/:sitename').get(function (req,res) {
     // just make an internal call to the 
     // geoJSON functionality and 
     // return the site details as geoJSON
    config = require('./config');
    var database = config.database;

    /* replace next bit with forwarding method from here: https://stackoverflow.com/questions/39047270/express-call-get-method-within-route-from-another-route
    function home(req, res, next) {
   req.url = '/some/other/path'

   // below is the code to handle the "forward".
   // if we want to change the method: req.method = 'POST'        
   return app._router.handle(req, res, next)
}
    */

    var url = 'http://localhost:3000/geoJSON/'+database+'/metadata/sites/location/id';
    getURL(url,res);
  });

  function getURL(url, res) {
    request.get({
        url: url,
        json: true,
        headers: {'User-Agent': 'request'}
    }, (err, res1, data) => {
        if (err) {
          console.log('Error:', err);
        } else if (res.statusCode !== 200) {
          console.log('Status:', res.statusCode);
        } else {
          // data is geoJSON - just send to client
          console.log(data);
          res.send(data);
        }
    });
  }
  
  // if you have the site ID get the layer details
 /* metadata.route('getLayerListSiteID/:sitename').get(function (req,res) {
        //re-read the config file just in case the config has been altered
      config = require('./config');
      var schema = 'public';
      var database = config.database;
      var tablename = req.params.tablename;
      var geomcolumn = req.params.geomcolumn;
      var idcolumn = 'id';
      getGeoJSON(database,schema,tablename,geomcolumn,idcolumn,res);
  });
*/

 /* // if you have the site name, get the layer details
  metadata.route('/getLayerListSitename/:sitename/').get(function (req,res) {
      //re-read the config file just in case the config has been altered
      config = require('./config');
      var schema = 'public';
      var database = config.database;
      var tablename = req.params.tablename;
      var geomcolumn = req.params.geomcolumn;
      var idcolumn = 'id';
      getGeoJSON(database,schema,tablename,geomcolumn,idcolumn,res);
  });
*/

  // get details of a specific layer by id
//  metadata.route('getLayerDetails/:layerid').get(function (req,res) {
 // });

  module.exports = metadata;