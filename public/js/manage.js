var CLIENT;
var ROOM;
// var ROLE = "none";	//default viewer role...
var GAME_STATE = ""; //default state...
var QUESTION = {}; //default state...
var ANSWERS = {}; //default state...
var NUM_RESPONSES = 0;
var NUM_PLAYERS = 0;
var SOUNDS = {};

const MULTS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t"];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = MULTS.length;
// ********** STARTUP:
//  deal with authentication
var USERID = false;
var ROLE = "manager"; //<?PHP echo json_encode($role);?>;

//   do google auth
window.onload = function () {
	if (getCookie("userid")) {
		USERID = getCookie("userid");
		console.log("Already got USERID", USERID);
		// goAuthorized()	//this will be called AFTER the room connection
		initRoom();
	} else {
		doGoogleAuth();
	}
};

function doGoogleAuth() {
	google.accounts.id.initialize({
		client_id: "243845994317-jfn5k215frni7svon27uc4jjnrmsl4vq.apps.googleusercontent.com",
		callback: handleCredentialResponse,
	});
	google.accounts.id.renderButton(
		document.getElementById("buttonDiv"),
		{ theme: "outline", size: "large" } // customization attributes
	);
	google.accounts.id.prompt(); // also display the One Tap dialog
}

function handleCredentialResponse(response) {
	// console.log("Encoded JWT ID token: ", response.credential);
	let credentials = parseJwt(response.credential);
	// console.log("credentials", credentials);
	if (credentials.sub) {
		USERID = credentials.sub;
		setCookie("userid", USERID, 365);
		console.log("SET new USERID", USERID);
		//   goAuthorized();	//this will be called AFTER the room connection
		initRoom();
	} else {
		alert("Whoops - problem signin into Google. Please refresh and try again.");
		goUnAuthorized();
	}
}

function goAuthorized() {
	$(".auth-only").show();
	$(".no-auth").hide();
}

function goUnAuthorized(msg) {
	$(".auth-only").hide();
	$(".no-auth").show();
	if (msg) {
		alert(msg);
	}
}

// **** end of starup routines

// init the chart
var M_RESULTSCHART;
var defaultSettings = {
	type: "pie",
	data: {
		labels: Object.keys(ANSWERS),
		datasets: [
			{
				data: Object.values(ANSWERS),
				borderColor: "transparent",
				backgroundColor: ["red", "blue", "green", "yellow", "purple"],
			},
		],
	},
	options: {
		animation: {
			easing: "easeInOutQuad",
			duration: 1000,
		},
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 1,
		tooltips: { enabled: false },
		plugins: {
			labels: {
				// render 'label', 'value', 'percentage', 'image' or custom function, default is 'percentage'
				render: function (args) {
					// { label: 'Label', value: 123, percentage: 50, index: 0, dataset: {...} }
					return args.label + ": " + args.value + " (" + args.percentage + "%)";
				},

				fontSize: 18,
				fontColor: "#fff",
				fontStyle: "bold",
				fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
				textShadow: true,
				shadowBlur: 4,
				shadowOffsetX: 2,
				shadowOffsetY: 2,
				shadowColor: "rgba(0,0,0,0.75)",
				textShadow: true,
				overlap: true,
			},
		},
	},
};
M_RESULTSCHART = new Chart($("#m_ResultsChart"), defaultSettings);
// END CHART INIT

//   START THE ROOM CONNECTION
initRoom = () => {
	console.log("starting connections...");
	if (CHANNEL && USERID) {
		// CLIENT = new Colyseus.Client('wss://'+location.hostname+':8443');
		CLIENT = new Colyseus.Client("wss://" + location.hostname);

		CLIENT.joinOrCreate("room", {
			channel: CHANNEL,
			userid: USERID,
			role: ROLE,
		})
			.then((myroom) => {
				ROOM = myroom;
				console.log(ROOM.sessionId, "joined", ROOM.name);

				goAuthorized(); //UPDATE the UI to show elements

				// *** LISTEN FOR VARIOUS MESSAGES ***
				ROOM.onMessage((message) => {
					console.log("got message", message);
					switch (message) {
						case "test":
							console.log("heard 'test' message", message);
							break;

						case "setRole":
							// setRole(message.data);
							break;

						case "answerSubmitted":
							SOUNDS.answer.play();
							break;

						default:
							console.log("nothing to do with this message type...", message.type);
					}
				});

				ROOM.listen(
					"gameState",
					(change) => {
						console.log("gameState", change.value);
						if (change.value && change.value != "") {
							GAME_STATE = change.value;
							updateState();
						}
					},
					true
				);

				ROOM.listen(
					"playerCount",
					(change) => {
						console.log("playerCount", change.value);
						if (change.value && change.value != "") {
							NUM_PLAYERS = Number(change.value);
							$(".playerCount").text(NUM_PLAYERS);
							updateProgressBar();
						}
					},
					true
				);

				ROOM.listen(
					"question",
					(change) => {
						console.log("question change", change);
						if (change.value) {
							QUESTION = JSON.parse(change.value) ? JSON.parse(change.value) : {};
							// QUESTION = change.value ? change.value : {};
							updateQuestion();
						}
					},
					true
				);

				ROOM.listen(
					"answers",
					(change) => {
						console.log("answers changed", change);
						if (change.value) {
							ANSWERS = JSON.parse(change.value) ? JSON.parse(change.value) : {};
							// ANSWERS = change.value ? change.value : {};
							updateAnswers();
						}
					},
					true
				);
			})
			.catch((e) => {
				console.log("JOIN ERROR", e);
				goUnAuthorized(
					"Sorry - you are not authorized to manage this room. Please check the URL and try again."
				); //lock out if they're not authorized for this room
			});
	} else {
		alert("Missing channel info, so not connecting... please check the URL and try again.");
	}
};

//*********
//jquery listeners
//*********
$("#test1").click(function () {
	console.log("test1 clicked");
	CLIENT.getAvailableRooms("my_room", (rooms, err) => {
		console.log("results for 'my_room'");
		if (err) console.error(err);
		rooms.forEach((room) => {
			console.log(room.roomId);
			console.log(room.clients);
			console.log(room.maxClients);
			console.log(room.metadata);
			console.log("channel", room.channel);
		});
	});
});

$("#test2").click(function () {
	console.log("test2 clicked");
	ROOM.send("test", "testing 123");
});

$("#test3").click(function () {
	console.log("test3 clicked");
});

$("#codeInput").submit(function (event) {
	var channel = $("#codeInputTxt").val();
	channel = channel.replace(/ /g, "_");
	channel = channel.replace("-", "_");
	channel = channel.replace(/\W/g, "");
	channel = channel.toLowerCase();
	window.location.href = "/" + channel;
	event.preventDefault();
});

// *** MANAGER SIDE LISTENERS
$("#m_stateBtns button").click(function () {
	var newState = $(this).data("state");
	console.log("sending new state, ", newState);
	ROOM.send("forceState", newState);
});

$("#questionForm").submit(function () {
	console.log("submitting question form");
	editQuestion();
	event.preventDefault();
});

$("#delete_one").click(function () {
	console.log("deleting last one...");
	var oldRow = $(".answer_container.optional:visible").last();
	oldRow.find("input").val("");
	oldRow.hide();
	if ($(".answer_container:visible").length == MIN_OPTIONS) {
		$(this).hide();
	} else {
		$("#add_one").show();
	}
	editQuestion(true); //edit and reset
});

$("#add_one").click(function () {
	console.log("adding new last one...");
	var newRow = $(".answer_container:visible").last().next();
	newRow.css("display", "flex");
	newRow.find("input").val("");
	if ($(".answer_container:visible").length == MAX_OPTIONS) {
		$(this).hide();
	} else {
		$("#delete_one").show();
	}
	editQuestion(true); //edit and reset
});

$("#sendQuestionBtn").click(function () {
	console.log("sending question");
	$("#questionUpdateBtn").trigger("click");
	$("#m_stateBtns button[data-state='question']").trigger("click");
});

$("#questionResetBtn").click(function () {
	console.log("resetting question to simple A-B...");

	$(".answer_container input, #inputQuestion").val("");
	$(".answer_container.optional").hide();
	// $("#delete_one").hide();
	// $("#add_one").show();
	$("#m_stateBtns button[data-state='closed']").trigger("click");
	editQuestion(true); //edit and reset
});

//***** DOCUMENT READY
$(document).ready(function () {
	setupBlankAnswers();
	SOUNDS.answer = new Howl({ src: ["sounds/sfx2.mp3"], volume: 0.1 });
});
//***** END DOC READY

//*********
//CUSTOM FUNCTIONS
//*********
// function setRole(role){
// 	ROLE = role;	//set global
// 	$(".roleSection").hide();	//hide everything
// 	$(".role-"+role).show(); //show the appropriate one...

// 	switch(role) {
// 		case "none":
// 			$(".heroTitle").text(" ~ iChoose");
// 		break;

// 		case "manager":
// 			$(".heroTitle").text(" ~ Manager");
// 		break;

// 		case "player":
// 			$(".heroTitle").text("");
// 		break;

// 		default:
// 			console.log("nothing to do with this role type");
// 	}
// }

function setupBlankAnswers() {
  var counter = 0;
	MULTS.forEach((letter) => {
		console.log(letter);
		var LETTER = letter.toUpperCase();
    var isOptional = (counter>=2) ? "optional" : "";
		var str = "";
		str += '<div class="answer_container '+isOptional+' field is-horizontal" data-choice="' + letter + '">';
		str += '	<div class="field-label is-normal">';
		str += '		<label class="label">Choice ' + LETTER + ":</label>";
		str += "	</div>";
		str += '	<div class="field-body">';
		str += '		<div class="field">';
		str += '			<div class="control">';
		str +=
			'				<input id="inputChoice' +
			LETTER +
			'" class="input" type="text" placeholder="' +
			LETTER +
			'" data-def="' +
			LETTER +
			'" data-choice="' +
			letter +
			'">';
		str += "			</div>";
		str += "		</div>";
		str += "	</div>";
		str += "</div>";

		$("#answers").append(str);
    counter += 1;
	});
}

function editQuestion(reset) {
	reset = reset === true; //make it true or false

	console.log("sending edited question");
	QUESTION.text = $("#inputQuestion").val();
	//reset it...
	QUESTION.choices = {
		a: { text: "A" },
		b: { text: "B" },
	};

  $(".answer_container:visible").each(function(){
    var letter = $(this).data('choice');
    // var LETTER = letter.toUpperCase();
    var input = $(this).find('input').first();

		var newAnswer = input.val() != "" ? input.val() : input.data("def");
		QUESTION.choices[letter] = { text: newAnswer };

	});

	// QUESTION.choices["a"].text =
	// 	$("#inputChoiceA").val() != "" ? $("#inputChoiceA").val() : $("#inputChoiceA").data("def");
	// QUESTION.choices["b"].text =
	// 	$("#inputChoiceB").val() != "" ? $("#inputChoiceB").val() : $("#inputChoiceB").data("def");

	// if ($("#inputChoiceC").closest(".answer_container").is(":visible")) {
	// 	var newAnswer = $("#inputChoiceC").val() != "" ? $("#inputChoiceC").val() : $("#inputChoiceC").data("def");
	// 	QUESTION.choices["c"] = { text: newAnswer };
	// }

	// if ($("#inputChoiceD").closest(".answer_container").is(":visible")) {
	// 	var newAnswer = $("#inputChoiceD").val() != "" ? $("#inputChoiceD").val() : $("#inputChoiceD").data("def");
	// 	QUESTION.choices["d"] = { text: newAnswer };
	// }

	// if ($("#inputChoiceE").closest(".answer_container").is(":visible")) {
	// 	var newAnswer = $("#inputChoiceE").val() != "" ? $("#inputChoiceE").val() : $("#inputChoiceE").data("def");
	// 	QUESTION.choices["e"] = { text: newAnswer };
	// }

	// if(($("#inputChoiceD").val()!="")) QUESTION.choices['d'] = {text: $("#inputChoiceD").val() };
	// if(($("#inputChoiceE").val()!="")) QUESTION.choices['e'] = {text: $("#inputChoiceE").val() };

	ROOM.send("editQuestion", { question: QUESTION, reset: reset });
}

function updateQuestion() {
	//update for both manager and players
	//player
	if (QUESTION) {
		if (QUESTION.text != "") {
			$("#p_QuestionText").text(QUESTION.text).show();
		} else {
			$("#p_QuestionText").hide();
		}

		switch (QUESTION.style) {
			case "mult":
				$("#answer_container.optional").hide();
				$(".answerBtn").hide();

				$("#inputQuestion").val(QUESTION.text);

				MULTS.forEach(function (letter) {
					// console.log("letter: ", letter);
					if (QUESTION.choices[letter]) {
						console.log("found a choice for this letter:", QUESTION.choices[letter]);
						//manager
						$(".answer_container[data-choice='" + letter + "']")
							.css("display", "flex")
							.find("input")
							.val(QUESTION.choices[letter].text);

						//player
						$(".answerBtn[data-id='" + letter + "']")
							.show()
							.find("span")
							.text(QUESTION.choices[letter].text);
					}
				});

				autoSize();

				break;

			default:
		}
	}
}

function updateAnswers() {
	console.log("updating display with new 'answers'", ANSWERS);
	switch (QUESTION.chartType) {
		case "pie":
			if (ANSWERS && Object.keys(ANSWERS).length > 0) {
				console.log("drawing PIE chart with these answers...", ANSWERS);
				var keys = Object.keys(QUESTION.choices);
				var newLabels = [];
				var newAnswers = [];
				keys.forEach(function (item) {
					newLabels.push(QUESTION.choices[item].text);
					newAnswers.push(ANSWERS[item] ? ANSWERS[item] : 0);
				});

				M_RESULTSCHART.data.labels = newLabels;
				// M_RESULTSCHART.data.datasets[0].data = Object.values(ANSWERS);
				M_RESULTSCHART.data.datasets[0].data = newAnswers;
				M_RESULTSCHART.update();

				NUM_RESPONSES = Object.values(ANSWERS).reduce(getSum);
				console.log("NUM_RESPONSES", NUM_RESPONSES);
				if (NUM_RESPONSES > 0) {
					$(".answerCount").text(NUM_RESPONSES);
					$("#m_stateBtns button[data-state='results']").prop("disabled", false);
				}
			} else {
				console.log("no current answers");
				//if it's empty or 0

				M_RESULTSCHART.data.labels = [];
				M_RESULTSCHART.data.datasets[0].data = [];
				M_RESULTSCHART.update();

				NUM_RESPONSES = 0;
				$(".answerCount").text(NUM_RESPONSES);
				$("#m_stateBtns button[data-state='results']").prop("disabled", true);
			}

			break;

		default:
	}
	updateProgressBar();
}

function updateState() {
	$(".state-closed, .state-question, .state-results").hide();
	$(".state-" + GAME_STATE).show();

	$("#m_stateBtns button").removeClass("is-primary");
	$("#m_stateBtns button[data-state='" + GAME_STATE + "']").addClass("is-primary");

	// $(".currentState").removeClass (function (index, className) {
	//     return (className.match (/(^|\s)state-\S+/g) || []).join(' ');
	// 	});
	// $(".currentState").text(GAME_STATE.toUpperCase()).addClass('state-' + GAME_STATE);

	switch (GAME_STATE) {
		case "closed":
			$("#questionMode").text("EDIT").removeClass("has-text-success").addClass("has-text-warning");
			break;

		case "question":
			$("#questionMode").text("LIVE").removeClass("has-text-warning").addClass("has-text-success");
			p_showChoices();
			break;

		case "results":
			p_showResults();
			break;

		default:
			console.log("nothing to do with this gamestate type");
	}
}

function p_showChoices() {
	$("#p_ResultsContainer").hide();
	$("#p_QuestionContainer").show();
	autoSize();
	updateProgressBar();
}

function p_showResults() {
	$("#p_QuestionContainer").hide();
	$("#p_ResultsContainer").show();
}

function autoSize() {
	$("#p_QuestionContainer").addClass("invisible");
	setTimeout(function () {
		console.log("trying to autosize answers");
		$("#p_QuestionContainer .answerBtn").textfill({
			minFontPixels: 8,
			maxFontPixels: 200,
			allowOverflow: true,
		});
		$("#p_QuestionContainer").removeClass("invisible");
	}, 500);
}

//GENERIC UTILITY FUNCTIONS
function getSum(total, num) {
	return total + num;
}

// progressbar.js@1.0.0 version is used
// Docs: http://progressbarjs.readthedocs.org/en/1.0.0/
var progressbar = new ProgressBar.Circle("#progressbar", {
	color: "#209cee",
	// This has to be the same size as the maximum width to
	// prevent clipping
	strokeWidth: 20,
	trailWidth: 1,
	easing: "easeInOut",
	duration: 1400,
	text: {
		autoStyleContainer: false,
	},
	from: { color: "#ffbe57", width: 5 },
	to: { color: "#209cee", width: 20 },
	// to: { color: '#23d160', width: 20 },
	// Set default step function for all animate calls
	step: function (state, circle) {
		circle.path.setAttribute("stroke", state.color);
		circle.path.setAttribute("stroke-width", state.width);

		var value = Math.round(circle.value() * 100);
		if (value === 0) {
			circle.setText("");
		} else {
			// circle.setText((value*-1) + "%");
			circle.setText(NUM_RESPONSES + " / " + NUM_PLAYERS);
		}
	},
});
// bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
progressbar.text.style.fontSize = "1.5rem";

// progressbar.animate(-1.0);  // Number from 0.0 to 1.0
function updateProgressBar() {
	console.log("updating Progressbar", NUM_RESPONSES, NUM_PLAYERS);
	if (typeof NUM_RESPONSES != "undefined" && NUM_PLAYERS && NUM_PLAYERS > 0) {
		var newVal = NUM_RESPONSES / NUM_PLAYERS;
		if (newVal < 0) newVal = 0;
		if (newVal > 1) newVal = 1;
		console.log("new progress value:", newVal);
		progressbar.animate(newVal);
	}
}

// UTILITIES
function parseJwt(token) {
	var base64Url = token.split(".")[1];
	var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	var jsonPayload = decodeURIComponent(
		atob(base64)
			.split("")
			.map(function (c) {
				return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join("")
	);

	return JSON.parse(jsonPayload);
}

function setCookie(cname, cvalue, exdays) {
	const d = new Date();
	d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
	let expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return false;
}
