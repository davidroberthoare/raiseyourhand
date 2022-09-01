const config = require('./config')

const colyseus = require('colyseus')
// const nosync = require("colyseus").nosync;
// const jwt = require('jsonwebtoken');

// for storing room ownership
// const keyFileStorage = require("key-file-storage");
// const kfs = keyFileStorage.default('./cache', true);
const loki = require('lokijs')
var db = new loki('database.db', {
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 4000
})

var users = {}

// implement the autoloadback referenced in loki constructor
function databaseInitialize () {
  users = db.getCollection('users')
  if (users === null) {
    users = db.addCollection('users', {
      unique: ['userid', 'channel']
    })
  }

  // kick off any program logic or start listening to external events
  postDBInit()
}

function postDBInit () {
  console.log('DB Initialized')
  // DB TESTING
  // try{
  //     users.insert({
  //         userid: 'test1',
  //         room: 123
  //     });
  // }catch(e){
  //     console.log("error inserting", e)
  // }

  // // alternatively, insert array of documents
  // users.insert([{ name: 'Thor', age: 35}, { name: 'Loki', age: 30}]);

  // var results = users.find({ age: {'$gte': 35} });
  // var results = users;
  // var odin = users.findOne({ name:'Odin' });
  // console.log("RESULTS", results)
  // console.log("ODIN", odin)
}

exports.Room = class extends colyseus.Room {
  onCreate (options) {
    console.log('creating new Room', options)

    var defaultQuestion = {
      text: '',
      style: 'mult',
      chartType: 'pie',
      status: '',
      choices: {
        a: {
          text: 'A'
        },
        b: {
          text: 'B'
        }
      }
    }

    try {
      console.log('room initialized', options)
      //if it's passed roomId, then set the current room to that ID
      if (options.channel) {
        this.channel = options.channel
      }

      this.setPatchRate(200) //set a slower update rate... (update every 200 ms)
      this.question = defaultQuestion
      this.answers = {}
      this.setState({
        playerCount: 0,
        gameState: 'closed',
        question: JSON.stringify(this.question),
        answers: JSON.stringify({})
      })
      this.players = []

      this.manager = false

      this.onMessage('test', (client, message) => {
        console.log('testing...')
        // this.send(client, {type:"test", data: message });
        this.broadcast('test', 'testing 123')
      })

      

      this.onMessage('forceState', (client, message) => {
        // case "forceState":
        console.log('received new state...', message)
        if (message && message != '') {
          this.state.gameState = message
        }
      })

      this.onMessage('editQuestion', (client, message) => {
        console.log('received edited question...')
        // this.data = JSON.parse(message.data);
        if (message.question) {
          this.question = message.question
          this.state.question = JSON.stringify(this.question) //send it back out via a state update...
        }
        if (message.reset == true) {
          this.answers = {}
          this.state.answers = JSON.stringify(this.answers)
        }
      })

      this.onMessage('submitAnswer', (client, message) => {
        console.log('received player answer...')
        try {
          this.answers[client.sessionId] = message
          console.log("current 'answers':", this.answers)
          this.tabulateAnswers()

          //rebroadcast it for use in the manager's
          console.log('sending notice to manager', this.manager)
          // console.log("CLIENTS:", this.clients);

          for (let i = 0; i < this.clients.length; i++) {
            if (this.clients[i].id == this.manager) {
              // this.send(this.clients[i], { type: 'answerSubmitted' })
              this.clients[i].send('answerSubmitted')
              break
            }
          }
        } catch (err) {
          console.log('error submitting answer', err)
        }
      })


      this.onMessage('update_roomid', (client, roomid) => {
        console.log('update_roomid', roomid)
        if(roomid && roomid!="" && roomid!=null){
          try {
            console.log('trying to UPDATE ROOMID...')
            var doc = users.findOne({ userid: options.userid });
            doc.channel = roomid;
            users.update(doc);

            this.broadcast('new_roomid', roomid );
          }
          catch (e) {
            console.log('error inserting', e)
            this.broadcast('new_roomid_error', e);
          }
        }else{
          this.broadcast('new_roomid_error', "bad roomid");
        }
        
      })



    } catch (err) {
      console.log('init error', err)
      return false
    }
  }







  onAuth (client, options, request) {
    console.log('checking client authorization for managers', options)
    if (options.role == 'manager') {
      // check if there is a userid,
      var user = users.findOne({
        userid: options.userid,
        channel: options.channel
      })
      //and if it's in the DB with the corresponding room value then allow in as manager
      if (user != null) {
        console.log('find-user result?', user)
        return true
      }

      //if there's no corresponding existing manager user record, try to create it (ie. let th emanager create the room)...
      else {
        try {
          console.log('trying to create new room...')
          users.insert({
            userid: options.userid,
            channel: options.channel
          })
          return true
        } catch (e) {
          console.log('error inserting', e)
          return false
        }
        //    throw new ServerError(400, "bad access token");
      }
    } 
    
    
    else {
      console.log('non-manager, so letting them in...')
      // if there's a userid, then assign that as the sessionID
      if(options.userid && options.userid !=''){
        client.sessionId = options.userid;
      }
      return true //non-managers are all allowed
    }

    //  if (options.password === "secret") {
    //  return true;

    //  } else {
    //    throw new ServerError(400, "bad access token");
    //  }
  }








  onJoin (client, options) {
    console.log('joining: ', options)
    console.log('current num clients: ', this.clients.length)

    // var isManager = (options.role == 'manager');
    // if(this.clients.length==1 || isManager){

    //this is set in the php client now, based on cookies, and just passed in directly
    if(options.role == 'manager'){
      console.log("presto, you're the manager");
      this.manager = client.id;
      // this.send(client, {type:'setRole', data:"manager"});
    }else{
      console.log("added another player");
      this.players.push(client.id);
      // this.send(client, {type:'setRole', data:"player"});
      this.state.playerCount = this.clients.length -1;
    }

    // console.log("roomId:", this.roomId);
  }

  onLeave (client, consented) {
    console.log('client left', client.sessionId)
    try {
      // if (consented) {
      //     throw new Error("consented leave");
      // }
  
      // allow disconnected client to reconnect into this room until 20 seconds
      this.allowReconnection(client, 20);  
  
      // client returned! let's re-activate it.
      // this.state.players.get(client.sessionId).connected = true;
  
    } catch (e) {
  
      // 20 seconds expired. let's remove the client.
      // this.state.players.delete(client.sessionId);
    }
  }

  onDispose () {
    console.log('room disposed')
  }

  // ***** CUSTOM CLASS FUNCTIONS
  tabulateAnswers () {
    var totals = {}
    for (const prop in this.answers) {
      // console.log(`obj.${prop} = ${obj[prop]}`);
      var r = this.answers[prop]
      console.log('adding: ', r)
      totals[r] = typeof totals[r] == 'undefined' ? 1 : totals[r] + 1
    }
    this.state.answers = JSON.stringify(totals)
  }
}
//end of class
