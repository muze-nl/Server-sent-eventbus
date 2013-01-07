require('./SSEConnection.js');

Bus = function(id,password) {
	var clients = {};
	this.id = id;
	this.messageId = '1';
	this.password = password;

	console.log('bus with password: \'' + this.password + '\' created');

	//adds a new connection to the clientlist
	this.addConnection = function(request,response){
		var uniqueId = this.socketUniqueIdentifier(request.connection);
		var connection = new SSEConnection(request,response);

		var onCloseHandler = function(){
			delete clients[uniqueId];
			console.log('client deleted with identifier: ' + uniqueId);
		};

		console.log('client added with identifier: '+ uniqueId);
		connection.request.connection.addListener('close',onCloseHandler);
		clients[uniqueId] = connection;
	};

	//writes to all connected sockets on the bus
	this.writeToAllSockets = function (data){
		console.log('writing data: ' + decodeURIComponent(data));

		var dataArray = [];
		//check if the data was split up in multiple parts
		if(data.indexOf('%0D%0A')){
			dataArray = data.split('%0D%0A');
		} else {
			dataArray.push(data);
		}

		//add a newline to every line
		for(var dataKey in dataArray){
			dataArray[dataKey] += '\n';
		}

		//add a second newline to the last line
		dataArray[dataArray.length-1] += '\n';

		for(var key in clients){
			clients[key].writeOut(this.messageId,dataArray);
		}
		this.messageId++;
	};

	//returns an identifier based on the socket,
	//a concatination of the localaddress, port, remote address and that port.
	this.socketUniqueIdentifier = function(socket){
		var localAddress = socket.address().address;
		var localPort = socket.address().port;
		var remoteAddress = socket.remoteAddress;
		var remotePort = socket.remotePort;

		return localAddress + '-' + localPort + '-' + remoteAddress + '-' + remotePort;
	};

	return this;
};