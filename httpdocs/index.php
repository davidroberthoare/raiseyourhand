<?PHP 
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    $original_url = $_SERVER['REQUEST_URI'];
    $original_url = str_replace("/","",$original_url);
    
    $url = str_replace("%20","_",$original_url);
    $url = str_replace("-","_",$url);
    $url = strtolower($url);
    $url = preg_replace("/[^a-z0-9\-_]/", '', $url);
    
    //if it's been changed, then redirect to the new address for bookmarking...
	if($url!=$original_url) {
		header("location: /$url");
	}

    define("CHANNEL", $url!="" ? $url : false); 
    $role = 'player'; //default
    
    if(CHANNEL){
    	
    	//if there's no browser cookie token, set one...
    	if(isset($_COOKIE['token_'.CHANNEL])){
    		$token = $_COOKIE['token_'.CHANNEL];	
    	}else{
	    	$token = uniqid("", true);
	    	setcookie('token_'.CHANNEL, $token, time()+3600 * 48); 
    	}
    		
    	//then check if there's a file named for this channel...
    	$filename = "channels/".CHANNEL;
		if(file_exists($filename)){
	    	// if there is, then check how old it is... 

			if (time()-filemtime($filename) > 48 * 3600) {
    		  //if it's more than 48 hrs, then recreate it with this user's token, and make them a manager
			  file_put_contents($filename, $token, LOCK_EX);
			  $role = 'manager';
			  
			} else {// file younger than 48 hours
			  
	    			// check if the value is equal to this user's token
    				$file_token = file_get_contents($filename);
	    			if($file_token == $token){
	    				//if it is, this is the manager
	    				$role = 'manager';
	    				//also, update the timestamp on it by rewriting it back
						file_put_contents($filename, $token, LOCK_EX);
	    				
	    			}else{
	    				//else, this is a player
	    				$role = 'player';
	    			}
			}
			
		}
		else{//if there's no file, then this is the manager and create a new file with their token
			file_put_contents($filename, $token, LOCK_EX);
			$role='manager';
		}
    	
    }
    // die("done - role/channel: $role / " . CHANNEL);
?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8"/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title><?PHP echo CHANNEL;?> | Raise-Your-Hand</title>
	<link rel="canonical" href="https://raiseyourhand.app">
	
    <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5">
    <meta name="apple-mobile-web-app-title" content="Raise Your Hand">
    <meta name="application-name" content="Raise Your Hand">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#ffffff">
    
    
    <!-- Global site tag (gtag.js) - Google Analytics -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-133464589-2"></script>
	<script>
	  window.dataLayer = window.dataLayer || [];
	  function gtag(){dataLayer.push(arguments);}
	  gtag('js', new Date());
	
	  gtag('config', 'UA-133464589-2');
	</script>

    
    
    <link rel="stylesheet" href="/css/bulma.css" />
    <link rel="stylesheet" href="/css/fontawesome.css">
    <link rel="stylesheet" href="/css/anicollection.css">
    <link rel="stylesheet" href="/css/chartjs.css">
    
    <link rel="stylesheet" href="/css/custom.css">

	
</head>

<body>


<div id='body_bg' class='rotator'>
	<div class="bg bg1"></div>
	<div class="bg bg2"></div>
	<div class="bg bg3"></div>
</div>



<section class="hero is-info">
  <div class="hero-body">
    <div class="columns is-mobile">
		<!-- <div class='column'>
			<button id='test1' class='button'>test1</button>
			<button id='test2' class='button'>test2</button>
			<button id='test3' class='button'>test3</button>
		</div> -->

		<!-- HIDDEN ON MOBILE, SHOW ON EVERYTHING ELSE -->
		<div class='column is-hidden-mobile'>
			<span class="title"><?PHP echo CHANNEL;?><span class='heroTitle'></span></span>
		</div>
		<div class='column has-text-centered role-manager is-hidden-mobile'>
			<span class='subtitle' style='line-height: 2em;'> Responses: <span class='answerCount'>0</span> / <span class='playerCount'>0</span></span>
		</div>

		<!-- SHOW ON MOBILE ONLY-->
		<div class='column is-hidden-tablet role-player'>
			<span class="title "><?PHP echo CHANNEL;?><span class='heroTitle'></span></span>
		</div>
		<div class='column has-text-center is-hidden-tablet'>
			<span class='subtitle' style='line-height: 2em;'><span class='answerCount'>0</span> / <span class='playerCount'>0</span></span>
		</div>





		<div class='column is-narrow'>

			<div class='role-manager is-pulled-right'>
				<span id='m_stateBtns'>
					<button data-state='closed' class='button is-hidden-mobile'>Edit (closed)</button>
					<button data-state='question' class='button is-hidden-mobile'>Show Choices</button>
					<button data-state='results' class='button is-hidden-mobile' disabled="disabled">Show Results</button>

					<button data-state='closed' class='button is-hidden-tablet'>Edit</button>
					<button data-state='question' class='button is-hidden-tablet'>Choices</button>
					<button data-state='results' class='button is-hidden-tablet' disabled="disabled">Results</button>
				</span>
			</div>		

			<!-- <div class='role-player is-pulled-right'>
				<button id='p_showChoices' class='button is-primary'>Choices</button>
				<button id='p_showResults' class='button' disabled='disabled'>Results</button>
			</div>	 -->	
			
		</div>
		


    </div>
  </div>
</section>




<!-- ******************** -->
<!-- DEFAULT -->
<!-- ******************** -->
<section class='has-text-centered roleSection role-none'>
	<!--<div class='title'>Welcome :-)</div>-->
	<div class='box'>
		<?PHP if(CHANNEL==false){ ?>
		<div class='subtitle'>Welcome :-) Please enter a Room Code:</div>
		<form id='codeInput'>
			<input type='text' class='input is-large has-text-centered' id='codeInputTxt' placeholder="eg. 'myroom'">
			<input type='submit' class='button is-large is-info' value="Join that room!" style='margin-top:1em;'>
		</form>
		
			
				<div class="section columns">
				  <div class="column is-8 is-offset-2">
					  <div class="box">
						<div class="columns">
							<div class="column is-narrow">
								<img src='images/hand_512.png' style='max-width:200px;'/>
							</div>
							
							<div class="column has-text-left">
								<p class='title'>Raise-Your-Hand</p> 
								<p class='subtitle'>is a simple tool to collect live feedback.</p>
								<div class='content'>
									<ol>
										<li>Enter a code to create a room.</li>
										<li>Users join the same room on their own devices.</li>
										<li>Send them the question, and view live responses.</li>
									</ol>
								</div>
						  </div>
				  	</div>
				</div>
			</div>
		</div>
		
		<?PHP }else{ ?>
			<div class='subtitle'>Connecting to your room: <?PHP echo CHANNEL;?> <br>
			please stand by...</div>
			<div><i class="fas fa-sync fa-5x fa-spin"></i></div>
		
		<?PHP } ?>
	</div>
</section>






<!-- ******************** -->
<!-- MANAGER -->
<!-- ******************** -->

<section class='has-text-centered roleSection role-manager' style="display:none;">
	<div class='state-closed state-question'>
		<div class='subtitle'>Question and Choices: <span id='questionMode'></span></div>
		<div class='box'>
			<form id='questionForm'>


				<div class="field is-horizontal">
				  <div class="field-label is-normal">
				    <label class="label">Question:</label>
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='inputQuestion' class="input" type="text" placeholder="Question...">
				      </div>
				    </div>
				  </div>
				</div>

				<div class="answer_container field is-horizontal" data-choice='a'>
				  <div class="field-label is-normal">
				    <label class="label">Choice A:</label>
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='inputChoiceA' class="input" type="text" placeholder="A" data-def="A" data-choice='a'>
				      </div>
				    </div>
				  </div>
				</div>

				<div class="answer_container field is-horizontal" data-choice='b'>
				  <div class="field-label is-normal">
				    <label class="label">Choice B:</label>
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='inputChoiceB' class="input" type="text" placeholder="B" data-def="B" data-choice='b'>
				      </div>
				    </div>
				  </div>
				</div>

				<div class="answer_container optional field is-horizontal" data-choice='c'>
				  <div class="field-label is-normal">
				    <label class="label">Choice C:</label>
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='inputChoiceC' class="input" type="text" placeholder="C" data-def="C" data-choice='c'>
				      </div>
				    </div>
				  </div>
				</div>

				<div class="answer_container optional field is-horizontal" data-choice='d'>
				  <div class="field-label is-normal">
				    <label class="label">Choice D:</label>
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='inputChoiceD' class="input" type="text" placeholder="D" data-def="D" data-choice='d'>
				      </div>
				    </div>
				  </div>
				</div>

				<div class="answer_container optional field is-horizontal" data-choice='e'>
				  <div class="field-label is-normal">
				    <label class="label">Choice E:</label>
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='inputChoiceE' class="input" type="text" placeholder="E" data-def="E" data-choice='e'>
				      </div>
				    </div>
				  </div>
				</div>

				<div class="field is-horizontal">
				  <div class="field-label">
				    <!-- Left empty for spacing -->
				    <i id='delete_one' class='state-closed fas fa-minus-circle fa-2x' style="display:none;"></i>
				    <i id='add_one' class='state-closed fas fa-plus-circle fa-2x'></i> 
				  </div>
				  <div class="field-body">
				    <div class="field">
				      <div class="control">
				        <input id='questionUpdateBtn' type='submit' class="button is-primary" value="UPDATE" />
				    	<button type="button" id='questionResetBtn' class="button is-warning">RESET</button>
				      </div>
				    </div>
				  </div>
				</div>

			</form>
		</div>
	</div>

	<div class='section state-closed'>
		<button id='sendQuestionBtn' class='button is-large is-fullwidth is-info is-shadow'>SEND THIS QUESTION</button>
	</div>

	<div id='progressbarContainer' class='state-question'>
		<span class='title is-hidden-mobile'>Visit: <span class='has-text-danger'><b>raiseyourhand.app/<?PHP echo CHANNEL;?></b></span> to enter your response...</span>
		<div id='progressbar'></div>
	</div>

	<div id='m_ResultsContainer' style='display: none;' class='state-results'>
		<canvas id="m_ResultsChart"></canvas>
	</div>
</section>







<!-- ******************** -->
<!-- PLAYER -->
<!-- ******************** -->

<section class='has-text-centered roleSection role-player' style="position:relative;display:none;">

	<div id='closedBox' class='box state-closed'>
		<div class='title'>Waiting for a Question</div>
		<div class='subtitle'>Please stand by...</div>
		<div><i class="far fa-question-circle fa-5x fa-spin"></i></div>
	</div>

	<div id='p_QuestionContainer' class='state-question'>
		<div id='p_QuestionText' class='subtitle'></div>
		<div class='style-mult'>
			<div class='p_AnswerContainer'>
				<div id="answerBtn_mult_a" class='answerBtn button box' data-id='a' style='background-color:red;'><span>A</span></div>
				<div id="answerBtn_mult_b" class='answerBtn button box' data-id='b' style='background-color:blue;'><span>B</span></div>
				<div id="answerBtn_mult_c" class='answerBtn button box' data-id='c' style='background-color:green;'><span>C</span></div>
				<div id="answerBtn_mult_d" class='answerBtn button box' data-id='d' style='background-color:yellow;'><span>D</span></div>
				<div id="answerBtn_mult_e" class='answerBtn button box' data-id='e' style='background-color:purple;'><span>E</span></div>
			</div>
		</div>
	</div>

	<div id='p_ResultsContainer' style='display: none;' class='state-results'>
		<canvas id="p_ResultsChart"></canvas>
	</div>
</section>









<!-- **********  -->
<!-- ********** SCRIPTS ************ -->
<!-- **********  -->
<script type="text/javascript" src="/js/colyseus.js"></script>
<script type="text/javascript" src="/js/jquery.js"></script>
<script type="text/javascript" src="/js/chart.js"></script>
<script type="text/javascript" src="/js/chartjs_pielabels.js"></script>
<script type="text/javascript" src="/js/textfill.js"></script>
<script type="text/javascript" src="/js/progressbar.js"></script>
<script type="text/javascript" src="/js/howler.js"></script>
<!-- main js file -->
<script>
	var CHANNEL = <?PHP echo json_encode(CHANNEL);?>;
	var ROLE = <?PHP echo json_encode($role);?>;
</script>
<script type="text/javascript" src="/js/index.js"></script>
</body>
</html>