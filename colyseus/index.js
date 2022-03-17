//main NODE server file. works in conjunction with apache on port 30443


//include the config vars 
const config = require("./config").config;
// console.log("config vars:", config);


const https = require('https');
// const http = require('http');
const express = require('express');
const colyseus = require('colyseus');
const fs = require('fs');

const myRoom = require('./myroom').myRoom;

const port = config.serverPort;
const app = express()

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/raiseyourhand.app/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/raiseyourhand.app/fullchain.pem')
};
const server = https.createServer(options, app);
// const server = http.createServer(app);
const gameServer = new colyseus.Server({ server });

// register your room handlers
gameServer.register('my_room', myRoom);
colyseus.serialize(colyseus.FossilDeltaSerializer)(myRoom);

// app.use(express.static('public'));

gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)



/// **** TEMP STUFF TO GENERATAE TOKENS...

// var actualTimeInSeconds = new Date().getTime()/1000;
// // var calculatedExpiresIn = (((d.getTime()) + (60 * 60 * 1000)) - (d.getTime() - d.getMilliseconds()) / 1000);

// const jwt = require('jsonwebtoken');
// var token = jwt.sign({ 
//   userid: 'game_player', 
//   role:'player',
//   phone:'1231231234',
//   nickname:'testplayer',
//   avatar:'_default_2.png',
//   iat:actualTimeInSeconds
// }, 'secret', { expiresIn: "3000d" });
// console.log("token", token);

// jwt.verify(token, 'secret', function(err, decoded) {
//   if (err) {
//   	console.log("error", err);
//     /*
//       err = {
//         name: 'TokenExpiredError',
//         message: 'jwt expired',
//         expiredAt: 1408621000
//       }
//     */
//   }else{
//   	console.log(decoded) // bar
//   }
// });

// get the decoded payload and header
// var decoded = jwt.decode(token, {complete: true});
// console.log(decoded.header);
// console.log(decoded.payload)

//** END TOKEN STUFF
