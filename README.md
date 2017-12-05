Website performance monitoring tool
==

This website performance monitoring CLI tool enables multiple websites monitoring with different check intervals. Domain names or complete urls can be used.

<div align="center">
<img src="main-picture.png" alt="screen app" style="width: 600px;">
</div>

### Prerequisities
This program is written in javascript and will run using NodeJS. Please make sure npm and NodeJS are installed on your device.
However, it is recommended to update NodeJS first.
<pre>npm install -g n</pre>

### Installing
Simply run this command in a console interpreter to install all dependencies
<pre>npm install</pre>

### Features
+ Monitor any number of websites by precising either domain names or website urls
+ Monitor websites using HTTP or HTTPS protocol (depending on url precised or server redirection url)
+ Script handles 301 and 302 status code when server tries to redirect the request
+ DNS lookup delays, TCP connection delays, TLS handshake delays (for HTTPS protocol), TTFB (Time To First Byte) and TTLB (Time To Last Byte) will be measured
+ Algorithm keeps track of status codes emitted by the server
+ Every 10 seconds, analytics of the last ten minutes are displayed
+ Every minute, additional analytics about the whole last hour are published

### Running

To start using this CLI tool, you just have to run
<pre>npm start</pre>

### Internet connection exceptions
When internet connection is lost, user is asked to reconnect his internet connection to keep on monitoring websites.
<div align="center">
<img src="internet-exception.png" alt="screen app" style="width: 600px;">
</div>

### Design enhancement
Small modifications in this project (using Express.js for example) would make this code a backend server on which anyone could plug his own frontend application. Using libraries such as D3.js and implementing a websocket connection could make this app a real-time monitoring visualization application.
