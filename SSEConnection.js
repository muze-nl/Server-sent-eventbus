SSEConnection = function(request,response,fs){
	this.request = request;
	this.response = response;
	this.fs = fs;


	//initialize the connection
	this.response.writeHead(200, {
			'Content-Type': 'text/event-stream',
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
	};

	return this;
};
