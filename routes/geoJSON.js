	const express = require('express');
	var geoJSON = require('express').Router();
	
	var config = require('./config');
    const pg = require('pg');
    console.log(config.user);

    var pool = new pg.Pool(config);


	geoJSON.route('/testGeoJSON').get(function (req,res) {
        res.json({message:req.originalUrl});
    });

    // this route assumes that the default database is used
    // and that the schema is the public schema
    // and that the table has a column called id
    geoJSON.route('/projectExtents/:projectname').get(function (req,res) {
        //re-read the config file just in case the config has been altered
        // hard code the rest for now
        config = require('./config');
        var schema = 'polimi';
        var database = config.database;
        var tablename = 'projects';
        var geomcolumn = 'location';
        var idcolumn = 'id';
        var whereclause = "where project_name = '" + req.params.projectname+"'";
        getGeoJSON(database,schema,tablename,geomcolumn,idcolumn,res,whereclause);
    });

    geoJSON.route('/geoJSONDefault/:tablename/:geomcolumn').get(function (req,res) {
        //re-read the config file just in case the config has been altered
        config = require('./config');
        var schema = 'public';
        var database = config.database;
        var tablename = req.params.tablename;
        var geomcolumn = req.params.geomcolumn;
        var idcolumn = 'id';
        getGeoJSON(database,schema,tablename,geomcolumn,idcolumn,res);
    });
    geoJSON.route('/geoJSON/:database/:schema/:tablename/:geomcolumn/:idcolumn').get(function (req,res) {
                var database = req.params.database;
                var schema = req.params.schema;
                var tablename = req.params.tablename;
                var geomcolumn = req.params.geomcolumn;
                var idcolumn = req.params.idcolumn;      
                getGeoJSON(database,schema,tablename,geomcolumn,idcolumn,res);
            });

function getGeoJSON (database, schema, tablename,geomcolumn, idcolumn,res, whereclause) {
        console.log(config);
        pool = new pg.Pool(config);
        pool.connect(function(err,client,done) {
           if(err){
               res.status(400).send(err);
           } 
           //client.query('SELECT name FROM united_kingdom_counties' ,function(err,result) {
            // use the inbuilt geoJSON functionality
        var querystring = "select string_agg(colname,',') from ( select column_name as colname ";
        querystring = querystring + " FROM information_schema.columns as colname ";
        querystring = querystring + " where table_name   =$1";
        querystring = querystring + " and table_schema = $2";
        querystring = querystring + " and column_name <> $3 and data_type <> 'USER-DEFINED') as cols ";

        console.log(querystring);
        console.log(schema);
        console.log(tablename);
        console.log(geomcolumn);
            
            // now run the query
            client.query(querystring,[tablename,schema,geomcolumn], function(err,result){
                //done(); 
                if(err){
                    res.status(400).send(err);
                }
                var thecolnames = result.rows[0].string_agg;
                var colnames = thecolnames;
                console.log("the colnames "+thecolnames);
                if (thecolnames === null) {
                    res.send();
                }
                else {
                        // now go through each column and surround it with
                        // quote marks just in case it has any upper case letters in the name
                        // which postgres doesn't understand unless they are in double quotes
                        var cols = colnames.split(",");
                        var colString="";
                        for (var i =0; i< cols.length;i++){
                            console.log(cols[i]);
                            colString = colString + JSON.stringify(cols[i]) + ",";
                        }
                        console.log(colString);

                        //remove the extra comma
                        colString = colString.substring(0,colString.length -1);

                        // to overcome the polyhedral surface issue, convert them to simple geometries
                        // assume that all tables have an id field for now - to do add the name of the id field as a parameter
                        querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
                        querystring += "(select 'Feature' as type, x.properties,st_asgeojson(y.geometry)::json as geometry from ";
                        querystring +=" (select "+idcolumn+", row_to_json((SELECT l FROM (SELECT "+colString + ") As l )) as properties   FROM "+schema+"."+JSON.stringify(tablename) + " ";

                        // if there is a whereclause then it needs to go here
                        if (whereclause){
                            querystring += whereclause;
                        }
                        querystring += " ) x";
                        querystring +=" inner join (SELECT "+idcolumn+", c.geom as geometry";
                        
                        querystring +=" FROM ( SELECT "+idcolumn+", (ST_Dump(st_transform("+JSON.stringify(geomcolumn)+",4326))).geom AS geom ";
                        
                        querystring +=" FROM "+schema+"."+JSON.stringify(tablename)+") c) y  on y."+idcolumn+" = x."+idcolumn+") f";
                        console.log(querystring);
                        // run the second query
                        client.query(querystring,function(err,result){
                          //call `done()` to release the client back to the pool
                            done(); 
                            if(err){    
                                res.status(400).send(err);
                            }
                            
                            // postgres puts an extra set of [ ] on the data so these need to be removed first
                            // do this by selecting the first row
                            // adapted from: https://stackoverflow.com/questions/19699452/how-to-remove-square-bracket-from-json  11th September 2019
                            var data = result.rows[0];
                            res.status(200).send(data);
                       });
                }
    });

});


}

module.exports = geoJSON;