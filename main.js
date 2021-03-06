var http = require('http');
var https = require('https');
var sys = require('util');
var fs = require('fs');

require('./bus.js');

var busCounter = 1;

var eventUrl = '/event';
var postUrl = '/post';
var busExistsUrl = '/exists' ;
var createUrl = '/create';
var host = "event.ris.dev.muze.nl";
var longPollTimeout = 5000;


var securePassword = 'paashaas';
var eventPort = 7000;
var adminPort = 7001;
var busses = {};

var httpsOptions = {
	key: fs.readFileSync('./key.pem'),
	cert: fs.readFileSync('./cert.pem')
};



//create the http server
var varEventServer = http.createServer(function(request, response) {
	console.log( 'listen:'+request.url );
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
				//if (request.headers.accept && request.headers.accept == 'text/event-stream') {
					response.writeHead(200, {
						'Content-Type' : 'text/event-stream',
						'Access-Control-Allow-Origin': '*'
					});
					//longpolling
					var longPoll = false;
					if(typeof requestUrl['params']['longpoll'] != 'undefined'){
						if(requestUrl['params']['longpoll'] == 1){
							longPoll = true;
							console.log('request received with longpoll enabled...');
							setTimeout(function(){
								console.log('setTimeout function called, longPollTimeout has probably been reached....');
								response.end();
							},longPollTimeout);
						}
					}
					console.log('client event stream request initiated');
					handleEventRequest(requestUrl['params']['id'],request,response,longPoll);
				//} else {
				//	console.log('no proper headers received for eventstream request, not sending any events');
				//}
			} else {
				console.log('no id received for a bus, not sending any events');
			}
		} else {
			console.log('no parameters received for an eventstream request');
		}
	}
	if(requestUrl['location'] == busExistsUrl){
		console.log('busExists received');
		if(typeof requestUrl['params'] != 'undefined'){
			console.log(requestUrl);
			if(typeof requestUrl['params']['id'] != 'undefined'){
				if(typeof busses[requestUrl['params']['id']] != 'undefined'){
					var busExistsResponse = {
						id: requestUrl['params']['id'], 
						exists: true
					};
					response.write(JSON.stringify(busExistsResponse));
					response.end();
				} else {
					var busExistsResponse = { 
						id: requestUrl['params']['id'],
						exists: false
					};
					response.write(JSON.stringify(busExistsResponse));
					response.end();

				}
			} else {
				console.log('no id received as param');
			}
		} else {
			console.log('no params given');
		}
	}
	//tempshiturl
	if(request.url == '/test'){
		console.log('testUrl requested');
		//dostuff return the testpage to show the correct bus
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
	 
	var adminServer = http.createServer(function(request,response){
			console.log('admin:'+request.url);
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
				console.log(request.url);
				console.log('received a post');
				console.log('data: ' + body);

				//post has been done, run handlePost(request,response)
				if(request.url == postUrl){
					//if something is posted to me to send over the bus!
					console.log('posturl requested');
					console.log('posturl body: '+body);
					handlePost(postDataToAssocArray(body),response);
					response.writeHead(200);
					response.end(JSON.stringify(['ok']));
				}

				if(request.url == createUrl){
					//create a new bus!
					busId = handleCreate(postDataToAssocArray(body));
					
					var returnValue = { id: busId };
//					returnValue["id"] = busId;
					

					//response.writeHead(200,{'Content-Type': 'text/html', 'z-test-header' : busId });
					response.write(JSON.stringify(returnValue));
					console.log('ID: '+busId);
					//response.end('ID: '+busId+"\n");
					response.end();
				}
			});



	//response.writeHead(200);
	//response.end();

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
				var keyValue = parts[key].split("=");
				if ( keyValue[1] ) {
					//decode the html characters and replace the +'s with spaces
					returnValue[keyValue[0]] = keyValue[1].replace(/\+/gi,' ');
				}
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

function handlePost(postData,response){
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
				response.write(JSON.stringify({error: { code: 1, message: 'Invalid id received, bus does not exist.'}}));
				response.end();
				
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

var longPollConnections = [];

function handleEventRequest(id,request,response, longPoll){
	console.log('eventRequest for id: ' + id);
	if(typeof busses[id] != 'undefined'){
		busses[id].addConnection(request,response,longPoll);
			
	} else {
		//bus does not exist
		console.log('invalid bus requested');
		errorResponse = {
			error: { 
				code: 1, 
				message: 'Invalid bus requested, bus does not exist (yet).'
			}
		};
		response.write(JSON.stringify(errorResponse));
		if (longPoll) {
			console.log('handleEventRequest received longpoll and the bus does not exist...');
			response.end();
		}
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
				var keyValue = keyValueCombinations[key].split('=');
				if ( keyValue[1] ) {
					params[keyValue[0]] = keyValue[1];
				}
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
