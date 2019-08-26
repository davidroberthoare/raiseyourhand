const config = require("./config").config;

const colyseus = require('colyseus');
const nosync = require("colyseus").nosync;
const jwt = require('jsonwebtoken');


exports.myRoom = class extends colyseus.Room {

  onInit (options) {
    
    var defaultQuestion = {
      text:"",
      style:"mult",
      chartType:"pie",
      status:"",
      choices:{
        a:{
          text:"A"
        },
        b:{
          text:"B"
        }
      }
    }


    
    try {
    	console.log("room initialized", options);
    	//if it's passed roomId, then set the current room to that ID
    	if(options.channel){
    	  this.channel = options.channel;
    	}
    	
    	this.setPatchRate(200); //set a slower update rate... (update every 200 ms)
      this.question = defaultQuestion;
      this.answers = {};
      this.setState({
        playerCount:0,
        gameState: 'closed',
        question:JSON.stringify(this.question),
        answers:JSON.stringify( {} )
      });
      this.players = [];
      
      this.manager = false;
    } catch(err) {
      console.log("init error", err);
      return false;
    }
  }

  
  requestJoin (options) {
    console.log("requestJoin", options);
    return options.channel === this.channel;
  }

  onJoin (client, options) {
    console.log("joining: ", options);
    console.log("current num clients: ", this.clients.length);
    
    // var isManager = (options.role == 'manager'); 
    // if(this.clients.length==1 || isManager){

    //this is set in the php client now, based on cookies, and just passed in directly
    if(options.role == 'manager'){
      console.log("presto, you're the manager");
      this.manager = client.id;
      this.send(client, {type:'setRole', data:"manager"});
    }else{
      console.log("added another player");
      this.players.push(client.id);
      this.send(client, {type:'setRole', data:"player"});
      this.state.playerCount = this.clients.length -1;
    }

    
    console.log("roomId:", this.roomId);
  }




  onMessage (client, message) {
  	console.log("client messaged", client.id, message);

    switch(message.type) {

      case "test":
        console.log("testing...");
        // this.send(client, {type:"test", data: message.data });
        this.broadcast({type:"test", data: "testing 123" });
        break;


      case "forceState":
        console.log("received new state...");
        if(message.data && message.data!=""){
          this.state.gameState = message.data;
        }
        break;

        

      case "editQuestion":
        console.log("received edited question...");
        // this.data = JSON.parse(message.data);
        if(message.data.question) {
          this.question = message.data.question
          this.state.question = JSON.stringify(this.question);  //send it back out via a state update...
        }
        if(message.data.reset == true) {
          this.answers = {};
          this.state.answers = JSON.stringify( this.answers );
        }
        break;
        


      case "submitAnswer":
        console.log("received player answer...");
        try{
          this.answers[client.id] = message.data;
          console.log("current 'answers':", this.answers);
          this.tabulateAnswers();

          //rebroadcast it for use in the manager's
          console.log("sending notice to manager", this.manager);
          // console.log("CLIENTS:", this.clients);

          for (let i = 0; i < this.clients.length; i++) {
              if (this.clients[i].id == this.manager) {
                  this.send(this.clients[i], {type:"answerSubmitted"});
                  break;
              }
          }

        }catch(err){
          console.log("error submitting answer", err);
        }
        break;

      default:
        console.log("nothing to do with this message type...", message.type);
    } 

  }



  onLeave (client, consented) {
  	console.log("client left", client.id);
  }

  onDispose() {
  	console.log("room disposed");
  }


  // ***** CUSTOM CLASS FUNCTIONS
  tabulateAnswers(){
    var totals = {};
    for (const prop in this.answers) {
      // console.log(`obj.${prop} = ${obj[prop]}`);
      var r = this.answers[prop];
      console.log('adding: ', r);
      totals[r] = (typeof(totals[r])=='undefined') ? 1 : totals[r]+1;

    }
    this.state.answers = JSON.stringify(totals);

  }


}
//end of class