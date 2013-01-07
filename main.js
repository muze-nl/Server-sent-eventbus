var http = require('http');
var https = require('https');
var sys = require('util');
var fs = require('fs');

require('./Bus.js');

var busCounter = 1;

var eventUrl = '/event';
var postUrl = '/post';
var createUrl = '/create';
var host = "localhost";
var longPollTimeout = 5000;


var eventPort = 7000;
var adminPort = 7001;
var busses = {};

var httpsOptions = {
	key: fs.readFileSync('./key.pem'),
	cert: fs.readFileSync('./cert.pem')
};



//create the http server
var varEventServer = http.createServer(function(request, response) {
	//parse the requested url
	var requestUrl = parseRequestUrl(request.url);

	//ROUTING!
	//events
	if(requestUrl['location'] == eventUrl){
		//check if params received
		if(typeof requestUrl['params'] != 'undefined'){
			//check if ID was given
			if(typeof requestUrl['params']['id'] != 'undefined'){
				//if an eventstream was requested
				if (request.headers.accept && request.headers.accept == 'text/event-stream') {
					
					//longpolling
					if(typeof requestUrl['params']['longpoll'] != 'undefined'){
						if(requestUrl['params']['longpoll'] == 1){
							setTimeout(function(response){
								response.end();
							},longPollTimeout);
						}
					}

					handleEventRequest(requestUrl['params']['id'],request,response);
				} else {
					console.log('no proper headers received for eventstream request, not sending any events');
				}
			} else {
				console.log('no id received for a bus, not sending any events');
			}
		} else {
			console.log('no parameters received for an eventstream request');
		}
	}
	//test helpers
	if(request.url == '/test'){
		console.log('testUrl requested');
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write(fs.readFileSync(__dirname + '/sse-node.html'));
		console.log('sse-node sent to client');
		response.end();
	}
	if(request.url == '/testPost'){
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write(fs.readFileSync(__dirname + '/postform.html'));
		console.log('form sent to client');
		response.end();
	}
	if(request.url == '/testCreate'){
		console.log('createShow url requested');
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write(fs.readFileSync(__dirname + '/buscreate.html'));
		response.end();
	}
}).listen(eventPort, host);
	 
	var adminServer = https.createServer(httpsOptions,function(request,response){
			//everything that goes to the adminService should be a POST and use ssl
			//start receiving the post request
			var body = "";

			//data receival
			request.on('data', function (chunk){
				console.log('starting post receival');
				body += chunk;
			});
			//end of data receival start doing things
			request.on('end', function(){
				console.log('received a post');
				console.log('data: ' + body);

				//post has been done, run handlePost(request,response)
				if(request.url == postUrl){
					//if something is posted to me to send over the bus!
					console.log('posturl requested');
					console.log('posturl body: '+body);
					handlePost(postDataToAssocArray(body));
				}

				if(request.url == createUrl){
					//create a new bus!
					busId = handleCreate(postDataToAssocArray(body));

					response.writeHead(200,{'Content-Type': 'text/html'});
					response.write('ID: '+busId);
					response.end();
				}
			});



	response.writeHead(200);
	response.end();

}).listen(adminPort, host);

//translates a string like key1=value1&key2=value2 etc. to an associative array
function postDataToAssocArray(postData){
	console.log('translating: ' + postData);
	var returnValue = {};
	if(typeof postData != 'undefined'){
		
		var parts = [];

		if(postData.indexOf('&') != -1){
			parts = postData.split('&');

		} else {
			parts.push(postData);
		}
			
			for(var key in parts){
				keyValue = parts[key].split("=");
				//decode the html characters and replace the +'s with spaces
				returnValue[keyValue[0]] = keyValue[1].replace(/\+/gi,' ');
			}

		console.log(returnValue);

	
	} else {
		returnValue.push('');
	}

	return returnValue;
}

function handleCreate(postData){
	if(typeof(postData['password'] != 'undefined')){
		console.log('creating bus with pasword: ' + postData['password']);
		busId = createBus(postData['password']);
	} else {
		console.log('no password received, not creating a bus.');
	}

	return busId;
}

function handlePost(postData){
	//check for ID
	if(typeof postData['id'] != 'undefined'){
		//check if bus exists
		if(typeof busses[postData['id']] != 'undefined'){
			//check if the password is correct.
			if(postData['password'] == busses[postData['id']].password){
				console.log('correct password received! Sending message.');
				if(postData['message'] != 'undefined'){
					busses[postData['id']].writeToAllSockets(postData['message']);
				} else {
					console.log('No message received, not sending anything.');
				}
				
			} else {
				//incorrect password
				console.log('incorrect password received, not sending anything.');
			}
		} else {
				//invalid bus
				console.log('invalid ID received, bus does not exist.');
		}
	} else {
		//no id received
		console.log('no id received with the post request, specify which bus.');
	}
}

//add a new bus and return the Id
function createBus(password){
	busId = busCounter;
	var bus = new Bus(busId,password);

	busses[busId] = bus;

	busCounter++;
	return busId;
}

function handleEventRequest(id,request,response){
	console.log('eventRequest for id: ' + id);
	if(typeof busses[id] != 'undefined'){
		busses[id].addConnection(request,response);
	} else {
		//bus does not exist
		console.log('invalid bus requested');
	}
}

function parseRequestUrl(url){
	var returnValue = {};

	//break the url by ?
	if(url.indexOf('?') != -1){
		//there is a ? in the url, there are params

		var urlLocation = url.split('?')[0];
		var paramString = url.split('?')[1];
		var params = {};

		if(paramString.indexOf('&') != -1){
			//there is more then one param
			//split params by & to get the keyValue combinations
			var keyValueCombinations = paramString.split('&');
			
			//for every keyvalue combination add the key as a key in the array with the value as a value in the array
			//by splitting on the =

			for(var key in keyValueCombinations){
				params[keyValueCombinations[key].split('=')[0]] = keyValueCombinations[key].split('=')[1];
			}
		}
		else {
			//there is a single parameter
			params[paramString.split('=')[0]] = paramString.split('=')[1];
		}
	
		returnValue['location']  = urlLocation;
		returnValue['params'] = params;
	}
	else {
		returnValue['location'] = url;
	}

return returnValue;
}
