Node.js Server-sent Eventbus

Version: 0.1

Author Jonah Meijers for Muze (www.muze.nl)

Email: jonah@muze.nl

Nodejs version:
	Tested on: v0.8.15

Introduction
================
A simple implementation of Server-sent events. With this you can create 'busses' for clients to subscribe to.

Usage
===============
	GET-Request:
		/event with accept headers: 'text/event-stream' (with http, default port 7000)
		Parameters: 
			id -> Which bus to subscribe to, is usually returned when a bus is created.
			longpoll -> if set to 1, the bus automatically disconnects after a specific timeout.
				(default set to 5 seconds).
		Returns: 
			On message it returns the message that was sent via the post function.
	POST-Request: 
		/post (with https, default port 7001)
		Parameters:
			id-> Which bus to post to, is usually returned when a bus is created.
			password -> Password for the selected bus, it is set when the bus is created.
			message-> The specific message to send over the bus.

		/create (with https, default port 7001)
		Parameters:
			password -> Password for posting data to the bus.
		Returns: ID that can be subscribed to, for the specific bus.

Configuration
===============
Currently there is no real configuration file (yet).
At the beginning of main.js some options can be configured such as
the urls for the actions, the ports the services are run on and where to find the key- and certificate file for the https server.

Installation
================
Because this bus uses https for the creation of busses and the posting of data, a key and certificate file must be generated. 
To generate these:

	openssl genrsa -out key.pem 1024 
	openssl req -new -key key.pem -out certrequest.csr 
	openssl x509 -req -in certrequest.csr -signkey key.pem -out cert.pem

Make sure the paths in main.js actually point to these files.


(NOTE: This is a self-signed certificate, for actual usage a real certificate should be used.)

Usage
==============
simply run main.js by running node {path to main.js}
