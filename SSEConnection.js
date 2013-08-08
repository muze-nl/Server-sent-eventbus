SSEConnection = function(request,response,fs,longPoll){
	this.request = request;
	this.response = response;
	this.fs = fs;
	this.longPoll = longPoll;

	//initialize the connection
	this.response.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
	});

	//the data is fed as an array of lines
	this.writeOut = function(id, dataArray){
		this.response.write('id: ' + id + '\n');

		console.log('dataArray length: ' + dataArray.length);

		for(var dataArrayKey in dataArray){
			console.log('writing line: ' + 'data:  '+ decodeURIComponent(dataArray[dataArrayKey]));
			this.response.write("data: " + decodeURIComponent(dataArray[dataArrayKey]));
		}
		if ( this.longPoll ) {
			console.log('longPoll connection closing from SSEConnetion side...');
			this.response.end();
		}
	};

	return this;
};
