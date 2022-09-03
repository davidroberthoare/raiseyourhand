"use strict";
var __importDefault = (this && this.__importDefault) || function(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });
const http = __importDefault(require("http"));
const path = __importDefault(require("path"));
const express = __importDefault(require("express"));
const cors = __importDefault(require("cors"));
const colyseus = require("colyseus");
// const monitor = require("@colyseus/monitor");

const myParser = require("body-parser"); //for 'posts'
const cookieParser = require('cookie-parser');




// IMPORT GAME ROOMS
const room = require("./room"); // basic starter code



const port = Number(process.env.PORT || 80);    //live
// const port = Number(1234);   //local testing
const app = express.default();


var engine = require('consolidate');

app.set('views', __dirname + '/views');
app.engine('html', engine.mustache);
app.set('view engine', 'html');


app.use(cors.default());
app.use(cookieParser());



// default static public route
app.use(express.default.static(path.default.resolve(__dirname, "public")));

app.get('/:roomid/manage', function(req, res){
    //    if(req.cookies['user']){
        //        var userdata = JSON.parse(req.cookies['user']);
        
        //        var is_owner = false;
    //     //   if there's a room with this id
    //         if(kfs[req.params.roomid]){
    //             // are we the owner?
    //             if(kfs[req.params.roomid]==userdata.id){
    //                 is_owner = true;
    //             }
    //         }
    //         else{   //otherwise, set us as the new owner
    //           kfs[req.params.roomid]=userdata.id;
    //           is_owner = true;
    //         }
    
    //        console.log("got cookie, so showing room page. Userdata", userdata );
           res.render('manage.html',  { 
                roomid:req.params.roomid, 
                // userid: userdata.id, 
                // username: userdata.name , 
                // is_owner:is_owner
            });
    //    }else{
    //        console.log("no g_state cookie, so redirecting to login page...")
    //        res.redirect('/index.html');
    //    }
});

app.get('/:roomid', function(req, res){
    //    console.log("google cookies?", req.cookies['g_state']);
    res.render('player.html',  { 
        roomid:req.params.roomid, 
        // userid: userdata.id, 
        // username: userdata.name , 
        // is_owner:is_owner
    });
});




// define the server
const server = http.default.createServer(app);
const gameServer = new colyseus.Server({
    server,
});


// TEST STARTER GAME
gameServer
    .define('room', room.Room, {
        // maxPlayers: 8 
    })
    .filterBy(['channel'])


gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
