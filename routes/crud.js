	const express = require('express');
	var crud = require('express').Router();
	var qs = require('querystring');

	const config = require('./config');
    const pg = require('pg');
    var pool = new pg.Pool(config);


	crud.route('/testCRUD')
    	.get(function (req, res) {
        res.json({message:req.originalUrl});
    });

    crud.route('/insert/:schema/:tablename/:geomcolumn?/:geometrytype?/:geometrySRID?').post(function (req,res) {
           	var schema = req.params.schema;
            var tablename = req.params.tablename;
        	var geomcolumn = req.params.geomcolumn;
        	var schema = req.params.schema;
        	console.log(schema);
        	console.log(tablename);
            console.log("srid "+ req.params.geometrySRID);

	        var data =	getData(req,res,"insert");

        });

    crud.route('/delete/:schema/:tablename/:idcolumn/:id').get(function (req,res) {
    	pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
            var tablename = req.params.tablename;
        	var schema = req.params.schema;
        	var id = req.params.id;
            var idcolumn = req.params.idcolum;
            var sql = "delete from "+schema+"."+JSON.stringify(tablename)+" where "+idcolumn +" = "+id;
            client.query(sql,function(err,result) {
              done(); 
              if(err){
                   console.log(err);
                   res.send("Query error "+err);
                }
              res.send("Data deleted succesfully");
            }); 

        });
    });

    crud.route('/update/:schema/:tablename/:geomcolumn/:id').get(function (req,res) {
    	pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
            var tablename = req.params.tablename;
        	var geomcolumn = req.params.geomcolumn;
        	var schema = req.params.schema;
        	var id = req.params.id;
        });
    });


    crud.route('/retrieve/:schema/:tablename/:geomcolumn/:id').get(function (req,res) {
    	pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
            var tablename = req.params.tablename;
        	var geomcolumn = req.params.geomcolumn;
        	var schema = req.params.schema;
        	var id = req.params.id;
        });
    });

    function getData(req,res,task) {
    	    var postdata = '';
    
	        // receiving data
	        req.on('data', function(chunk) {
	            postdata += chunk;                                                                 
	            // Avoid too much POST data                                                        
	            if (postdata.length > 1e6)
	                request.connection.destroy();
	        });

	        // received all data
	        req.on('end', function() {
	            var post = postdata;
	            console.log(post);
	            processData(req,res,postdata, task);
	        });

   			
    }	

    function processData(req,res,postdata,task){
    	if (task == "insert") {
    		insertData(req,res,postdata);
    	}

    }
    function insertData(req,res,postdata){
    	console.log("insert data");
    	// convert the posted data string back to json
    	console.log("postdata" + postdata);
    	var json = JSON.parse(postdata);
    	console.log(json);
    	
    	// now get the list of field names
    	// NB use ? to prevent injection
    	var fields = "";
    	var values = [];
    	var questions = "";
    	var j =0;
    	var height = 0;
    	var coordinates = "";
    	for(var attributename in json){
    		// make sure we ignore the height and coordinates attributes
    		if (attributename !== "geomheight" && attributename !== "coordinates") {
	    		j= j+1;
	    		fields = fields + attributename +",";
	    		questions = questions +  "$"+j +",";
	    		values.push(json[attributename]);
			    console.log(attributename+"::: "+json[attributename]);
		    }
		    else {
		    	if (attributename == "geomheight"){
		    		height = json[attributename];

		    	}
		    	if (attributename == "coordinates"){
		    		coordinates = json[attributename];
		    		console.log(coordinates);
		    	}

		    }
		}
		// remove the last , for both lists
		fields = fields.substring(0,fields.length -1);
		questions = questions.substring(0,questions.length -1);

		console.log (fields);
		console.log(questions);
    	console.log(JSON.parse(postdata).name);

    	// check for geometry
    	console.log(req.params.geomcolumn);
    	console.log(req.params.geometrytype);


    	if ((!req.params.geomcolumn) || (req.params.geomcolumn == 'undefined')) {
            console.log("no geometry");
    	}
    	else {
	    	if (req.params.geomcolumn.length > 0 && req.params.geometrytype.length > 0) {
	    		var geom =   processGeometry(req,coordinates,height);
	    		console.log("geom is "+geom);
		    	questions += ","+ geom;
		    	fields += "," + req.params.geomcolumn;
	    	}
	    }	
    	var query = "insert into " + req.params.schema+"."+JSON.stringify(req.params.tablename);
    	query += "("+fields+") values";
    	query += "("+ questions+") returning * ";

    	console.log(query);
    	console.log(values);
    	runquery(res,query,values);
    }

    function runquery(res,query,values){
    	pool.connect(function(err,client,done) {
       		if(err){
          		console.log("not able to get connection "+ err);
                res.send("Not able to connect to the database");
           	}
	    	client.query(query,values,function(err,result) {
    	      done(); 
        	  if(err){
            	   console.log(err);
                   res.send("Query error "+err);
          		}
	          console.log("inserted2222");
              res.send("Data inserted succesfully " + JSON.stringify(result.rows[0]));
       		});	

       	});
    }

    function processGeometry(req,coordinates,height) {
    	// create the string to insert the geometry
    	var geomtype = req.params.geometrytype;
    	// depending on the geometry type process the geometry differently
    	// assume that the coordinates are presented as a string that is ready to go
    	// assume that the coordinate system is epsg 4326
        if (req.params.geometrySRID) {
                coordsystem = req.params.geometrySRID
        }
        else {
    	   var coordsystem = "3003";
        }
    	var geom ="";
    	switch (geomtype.toLowerCase()) {
    		case "point":
    			geom = "st_geomfromtext('"+geomtype +"("+coordinates+")',"+coordsystem+")";
    			break;
    		case "linestring":
    			geom = "st_geomfromtext('"+geomtype +"("+coordinates+")',"+coordsystem+")";
    			break;
    		case "polygon":
    			geom = "st_geomfromtext('"+geomtype +"(("+coordinates+"))',"+coordsystem+")";
    			break;

    		case "multipolygon":
    			geom = "st_geomfromtext('"+geomtype +"((("+coordinates+")))',"+coordsystem+")";
    			break;

    		case "extrudedpolygon":
    			geom = "st_extrude(st_geomfromtext('POLYGON(("+coordinates+"))',"+coordsystem+"),0,0,"+height+")";
    			break;
            case "3dmultipolygon":
                geom = "(select st_multi(st_collect(geom)) from ";
                geom += "(select (ST_Dump(geom)).geom AS geom ";
                geom += " from (select st_extrude( ";
                geom += " st_geomfromtext('POLYGON(("+coordinates+"))',"+coordsystem+"),0,0,"+height+") as geom) as a) b)";
    
            break;

    		default:
    			console.log("incorrect geometry type");		

    	}
    	return geom;
    }

    module.exports = crud;
