	const express = require('express');
	var getJSON = require('express').Router();
	
	var config = require('./config');
    const pg = require('pg');
    console.log(config.user);

    var pool = new pg.Pool(config);

    // get data that doesn't have any geometry


	getJSON.route('/testGetJSON')
    	.get(function (req, res) {
        res.json({message:req.originalUrl});
    });

    getJSON.route('/lists/:schemaname/:listname/:project').get(function (req,res) {
        var schema = req.params.schemaname;
        config = require('./config');
        var database = config.database;
        var tablename = 'lists';
        var idcolumn = 'id';
        var whereclause = " listname = '"+ req.params.listname+"'";
        whereclause += " and project_id = (select id from polimi.projects where project_name ='"+req.params.project+"')";
        getGetJSON(database,schema,tablename,idcolumn,res,whereclause);
    });

        
    // this route assumes that the default database is used
    // and that the schema is the public schema
    // and that the table has a column called id
    getJSON.route('/getJSONDefault/:tablename/').get(function (req,res) {
        //re-read the config file just in case the config has been altered
        config = require('./config');
        var schema = 'public';
        var database = config.database;
        var tablename = req.params.tablename;
        var idcolumn = 'id';
        getGetJSON(database,schema,tablename,idcolumn,res);
    });

    

    getJSON.route('/layerlistJSON/:project').get(function (req,res) {
        config = require('./config');
        var schema = 'polimi';
        var database = config.database;
        var tablename = 'projectlayersview';
        var idcolumn = 'id';
        var whereclause = " project_name = '" + req.params.project+"'";
        // can't use the usual getJSON call as that doesn't work for views
        getGetJSON(database,schema,tablename,idcolumn,res,whereclause);


     });   

    getJSON.route('/getJSON/:database/:schema/:tablename/:idcolumn').get(function (req,res) {
                var database = req.params.database;
                var schema = req.params.schema;
                var tablename = req.params.tablename;
                var geomcolumn = req.params.geomcolumn;
                var idcolumn = req.params.idcolumn;    
                var whereclause = req.params.whereclause;  
                getGetJSON(database,schema,tablename,idcolumn,res);
            });

function getGetJSON (database, schema, tablename,idcolumn,res,whereclause) {
        console.log(config);
        pool = new pg.Pool(config);
        pool.connect(function(err,client,done) {
           if(err){
               res.status(400).send(err);
           } 
           
        querystring = "select string_agg(colname,',') from ( select column_name as colname ";
        querystring = querystring + " FROM information_schema.columns as colname ";
        querystring = querystring + " where table_name   =$1";
        querystring = querystring + " and table_schema = $2";
        querystring = querystring + "  and data_type <> 'USER-DEFINED') as cols ";

        console.log(querystring);
        console.log(schema);
        console.log(tablename);
            
            // now run the query
            client.query(querystring,[tablename,schema], function(err,result){
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
                    querystring +="(select 'Feature' as type, x.properties from  ";
                    if (whereclause) {
                        querystring +=" (select "+idcolumn +", row_to_json((SELECT l FROM (SELECT "+colString+") As l )) as properties   FROM "+schema+"."+JSON.stringify(tablename)+" where "+whereclause +")  x )";
                    }
                    else {
                        querystring +=" (select "+idcolumn +", row_to_json((SELECT l FROM (SELECT "+colString+") As l )) as properties   FROM "+schema+"."+JSON.stringify(tablename)+")  x )";
                    }
                    querystring +=" f ";

                    /*querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
                    querystring += "(select 'Feature' as type, x.properties from ";
                    querystring +=" (select "+idcolumn+", row_to_json((SELECT l FROM (SELECT "+colString + ") As l )) as properties   FROM "+schema+"."+tablename+" ) x";
                    querystring +=" FROM "+schema+"."+tablename+") c) y  on y."+idcolumn+" = x."+idcolumn+") f";*/
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


module.exports = getJSON;