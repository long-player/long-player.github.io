"use strict";

//You won't find any help for the puzzle in here! 
//but maybe fix my inefficient code while you're looking around?

var tapePlayer;
var inited=false;

//accessing the soundcloud api where the file is hosted
//this will probably break if this client_id is ever revoked.
//if you can host a large mp3, let me know!
var fileLocation="https://api.soundcloud.com/tracks/852098338/stream?client_id=17a992358db64d99e492326797fff3e8";
var assetsLocation="assets/";

function setup(){ 
	let canvas=createCanvas(500,500);
	canvas.parent("flex");
	tapePlayer=new Player(0,0,500,500,fileLocation,assetsLocation);  //created with audioContext suspended
}

function draw(){
	background(0);
	if(inited){
		tapePlayer.draw();
	}else{
		textAlign(CENTER,CENTER);
    	textFont("courier");
		textSize(height*.04)
		fill(255);
		text("UPDATE: SOUNDCLOUD UPDATED THEIR API.",width*.5,height*.1);
		text("THIS NO LONGER WORKS :(",width*.5,height*.1);
		text("Follow the clues.",width*.5,height*.3);
		text("Note any numbers and letters you find,",width*.5,height*.4);
		text("you may need them again.",width*.5,height*.5);
		text("You may wish to time yourself.",width*.5,height*.6);
		text("Click anywhere to start.",width*.5,height*.7);
	}
}

function keyPressed(){
	if(inited){
		tapePlayer.keyPressed();
	}else{
		initAudio();
  	}
}

var released = true;  //this handling to fix issue with p5 touch start/end
function mouseReleased(){
	released = true;
	return false;
}

function mousePressed() {
	//if (event.type != 'touchstart') return true  fixes on mobile, not on PC
	if(!released){
		return;
	}
	released = false;


  	if(inited){
		tapePlayer.mousePressed();	
	}else{
		initAudio();
  	}
}

function initAudio(){
	tapePlayer.audioContext.resume();
	if(tapePlayer.audioContext.state==="running"){
		inited=true;
	}
}
