class Player{
	//this is the main object we see on the canvas, initialised with a position, size, streaming audio location and assets location
	constructor(posX,posY,width,height,audioFileName,assetsLocation){

		this.posX=posX;
		this.posY=posY;
		this.width=width;
		this.height=height;

		//load big audio file
		this.audio=new Audio();
		this.audio.crossOrigin = 'anonymous';   //default 'anonymous' or "", alt 'use-credentials'
		this.audio.src = audioFileName;
		this.audio.preload = 'auto';  //'auto' is default

		//load other sounds
		this.clickSound=new Audio(assetsLocation + "click.mp3");
		this.rewindSound=new Audio(assetsLocation + "rewind.mp3"); 

		//create an audiocontext for an analyser node. gain node is final routing point for adjusting volume
		this.audioContext=new (window.AudioContext || window.webkitAudioContext)({sampleRate: 44100, latencyHint: "playback"});	//samplerate should be the same as original file
    	this.audioContext.suspend();
    	this.audioNode = this.audioContext.createMediaElementSource(this.audio);  
    	this.gain=this.audioContext.createGain();

    	//create an analyser node
    	this.analyser = this.audioContext.createAnalyser();					
		this.analyser.smoothingTimeConstant = 0;						
		this.analyser.fftSize=1024;		  //need to rework audio for faster (smaller) FFT size
		this.analyser.minDecibels=-90;
		
		//connect audioNode->analyserNode & audioNode->gain->output
    	this.audioNode.connect(this.analyser);								
    	this.audioNode.connect(this.gain);									
    	this.gain.connect(this.audioContext.destination);			

    	//ensure audio is at beginning
    	this.audio.currentTime=0;

    	//load an image for the counter numbers
    	let counterStrip = loadImage(assetsLocation + "number strip.jpg");

    	//create 5 wheels for a tape system
    	this.reel1 = new Wheel(posX+width*.2,posY+height*.2,height*.04);
    	this.reel2 = new Wheel(posX+width*.8,posY+height*.2,height*.04);
    	this.guide1 = new Wheel(posX+width*.3,posY+height*.425,height*.025);
    	this.guide2 = new Wheel(posX+width*.7,posY+height*.425,height*.025);
    	this.capstan = new Wheel(posX+width*.5,posY+height*.45,height*.04);

    	//connect them all with tape
    	this.t=new TapeSystem(25000,this.reel1,this.guide1,this.capstan,this.guide2,this.reel2);

    	//create two mechanical counter objects for current and target position
    	this.counter= new MechanicalCounter(counterStrip,4,posX+width*.4,posY+height*.17,width*.2,height*.06);
    	this.target=new MechanicalCounter(counterStrip,4,posX+width*.575,posY+height*.82,width*.2,height*.06);

    	//create a spectrum and waveform canvas that will read data from the analyser node
    	this.spectrum=new Spectrum(this.analyser,posX+width*.05,posY+height*.55,width*.425,height*.225);				//set up our spectrum and waveform viewers
		this.waveform=new Waveform(this.analyser,posX+width*.525,posY+height*.55,width*.425,height*.225);

		//this.spectrum.offscreen._renderer.canvas.mozOpaque=true;

		//some other variables for managing rewinding
    	this.rewinding=false;
    	this.rewindAcc=5;
    	this.rewindSpeed=0;
    	this.rewindDamping=0.8;
    	this.rewindPosition=0;
    	this.targetTime=0;

    	//images (note & button graphics)
		this.stickyNote=loadImage(assetsLocation + "note.png");
    	this.reelCover=loadImage(assetsLocation + "reel.png");

		this.play=loadImage(assetsLocation + "play.png");
		this.ff10=loadImage(assetsLocation + "ff10.png");
		this.rw10=loadImage(assetsLocation + "rw10.png");
		this.plus=loadImage(assetsLocation + "plus.png");
		this.go=loadImage(assetsLocation + "go.png");

		this.buttons=[
			new ImageButton(this.posX+this.width*0.1,	this.posY+height*.825,	this.width*0.1,	this.height*.1,	this.rw10,	this.cueDiff.bind(this,-10)),
			new ImageButton(this.posX+this.width*0.2125,this.posY+height*.825,	this.width*0.1,	this.height*.1,	this.play,	this.togglePlayPause.bind(this)),
			new ImageButton(this.posX+this.width*0.325,	this.posY+height*.825,	this.width*0.1,	this.height*.1,	this.ff10,	this.cueDiff.bind(this,10)),
			new ImageButton(this.posX+this.width*0.8,	this.posY+height*.825,	this.width*0.1,	this.height*.1,	this.go,	this.cueToTarget.bind(this)),
			new ImageButton(this.posX+this.width*0.575,	this.posY+height*.89,	this.width*0.05,this.height*.05,this.plus,	this.addToTargetDigit.bind(this,3,1)),
			new ImageButton(this.posX+this.width*0.625,	this.posY+height*.89,	this.width*0.05,this.height*.05,this.plus,	this.addToTargetDigit.bind(this,2,1)),
			new ImageButton(this.posX+this.width*0.675,	this.posY+height*.89,	this.width*0.05,this.height*.05,this.plus,	this.addToTargetDigit.bind(this,1,1)),
			new ImageButton(this.posX+this.width*0.725,	this.posY+height*.89,	this.width*0.05,this.height*.05,this.plus,	this.addToTargetDigit.bind(this,0,1))
		];


    }

    draw(){
    	//main background rectangle, rounded edges
    	fill(240,235,200);
    	noStroke();
    	rect(this.posX,this.posY,this.width,this.height,this.width*.1);
    	stroke(0);
    	noFill();
    	rect(this.posX+this.width*0.01, this.posY+this.height*0.01, this.width*0.98, this.height*0.98, this.width*.09);

    	//some rewinding stuff
    	let timeRatio=this.audio.currentTime/9999;  //whole animation won't work if this isn't a constant...?
    	if(this.rewinding){
    		this.rewindSpeed+=constrain(this.targetTime-this.rewindPosition,-this.rewindAcc,this.rewindAcc);
    		this.rewindSpeed*=this.rewindDamping;
    		this.rewindPosition+=this.rewindSpeed;

    		if(abs(this.rewindPosition-this.targetTime)<5){
    			this.rewinding=false;
    			this.rewindSound.pause();
    			this.rewindSound.currentTime=0;
    			this.clickSound.play();
    			this.audio.play();  //auto play after cueing
    		}

    		this.counter.draw(this.rewindPosition);
    		this.target.draw(this.targetTime);
    		timeRatio=this.rewindPosition/this.audio.duration;
    	}else{
    		this.counter.draw(this.audio.currentTime);
    		this.target.draw(this.targetTime);
    	}

    	this.spectrum.draw(!this.audio.paused);
    	this.waveform.draw(!this.audio.paused);

    	stroke(0);
    	strokeWeight(1);
    	fill(200);
    	ellipse(this.reel1.x,this.reel1.y,this.width*.375,this.width*.375);
    	ellipse(this.reel2.x,this.reel2.y,this.width*.375,this.width*.375);

    	this.t.draw(timeRatio);

    	noStroke();
    	fill(127);
    	rect(this.posX+this.width*.45,this.posY+this.height*.475,this.width*.1,this.height*.05,this.width*.01);

		this.buttons.forEach(element => element.draw());


    	push();
		translate(this.posX+this.width*.45,this.posY);
		rotate(0.1);
		image(this.stickyNote,0,0,this.width*.15,this.width*.15);
		pop();
    }

    togglePlayPause(){
    	if(!this.rewinding){
    		if(this.audio.paused){
    			if(this.audio.readyState==HTMLMediaElement.HAVE_ENOUGH_DATA){
    				this.audio.play();  
    				this.clickSound.play();
    			}
    		}else{
    			this.audio.pause();
    			this.clickSound.play();
    		}
    	}
    }

    keyPressed(){
    	if (keyCode === LEFT_ARROW) {
    		this.audio.currentTime-=10;
    	} else if (keyCode === RIGHT_ARROW) {
    		this.audio.currentTime+=10;
    	}else if(key==' '){
    		this.togglePlayPause();
    	}
    }

    addToTargetDigit(digit,amount){ //will change the value in target by the specified amount
    	this.clickSound.currentTime=0;
    	this.clickSound.play();
    	this.targetTime=round(this.targetTime);
		if(this.getDecimal(this.targetTime,digit)==9){
			this.targetTime-=pow(10,digit)*9;
		}else{
			this.targetTime+=pow(10,digit);
		}
    }

    getDecimal(input,digit){
    	return floor((input/pow(10,digit))%10);
    }

    mousePressed(){
    	this.buttons.forEach(element => element.pressed());
    }

    cueToTarget(){
    	this.cueTo(this.targetTime);
    }

    cueTo(time){
    	if(!this.rewinding){
	    	this.audio.pause(); //stop the audio
	    	this.rewindPosition=this.audio.currentTime;
	    	this.audio.currentTime=time;
	    	this.targetTime=time;
	    	this.rewindSpeed=0; //reset the rewind speed
	    	this.clickSound.play(); //play a click
	    	this.rewindSound.play() //and the rewind sound
	    	this.rewinding=true; 
	    }
    }

    cueDiff(time){
	    this.clickSound.play(); //play a click
    	this.audio.currentTime=constrain(this.audio.currentTime+time,0,9999);
    }
}


class Spectrum{
	constructor(analyserNode,x,y,width,height){
		this.analyser=analyserNode;	
		this.bins=new Uint8Array(this.analyser.frequencyBinCount);		//faster fft if byte
		this.x=x;
		this.y=y;
		this.width=width;
		this.height=height;
		this.divider=8;
		this.offscreen=createGraphics(this.bins.length/2,this.bins.length/this.divider);
		this.offscreen.background(0);
		this.offscreen.strokeWeight(1);
	}

	draw(update){
		noFill();
		stroke(50);
		strokeWeight(1);
		rect(this.x-2,this.y-2,this.width+3,this.height+3,2); //outline rectangle
		if(update){		
			this.analyser.getByteFrequencyData(this.bins);
			this.offscreen.image(this.offscreen.get(),-1,0);  //behaves differently on different hardware(?!) - https://stackoverflow.com/questions/23497925/how-can-i-stop-the-alpha-premultiplication-with-canvas-imagedata
			//this.slideImage();  //using this instead
			for(let i=0;i<this.offscreen.height;i++){
				this.offscreen.stroke(this.bins[i*this.divider]);
				this.offscreen.point(this.offscreen.width-1 ,this.offscreen.height-i);
			}
		}

		image(this.offscreen.get(),this.x,this.y,this.width,this.height);
	}

	slideImage(){
		this.offscreen.loadPixels();
		for(let i=0;i<this.offscreen.pixels.length-4;i++){
			this.offscreen.pixels[i]=this.offscreen.pixels[i+4];
		}
		this.offscreen.updatePixels();
	}
}	


class Waveform{
	constructor(analyserNode,x,y,width,height){
		this.analyser=analyserNode;	
		this.bins=new Uint8Array(this.analyser.frequencyBinCount/2);		//shorten fft
		this.x=x;
		this.y=y;
		this.width=width;
		this.height=height;
		this.divider=1;
		this.offscreen=createGraphics(this.bins.length/this.divider,256,P2D);
		this.offscreen.background(0);
	}

	draw(update){
		noFill();
		stroke(50);
		strokeWeight(1);
		rect(this.x-2,this.y-2,this.width+3,this.height+3,2);

		this.analyser.getByteTimeDomainData(this.bins);

		if(update){
			this.offscreen.background(0);
			this.offscreen.stroke(255);
			this.offscreen.strokeWeight(4);
			for(let i=0;i<this.offscreen.width-1;i++){
				this.offscreen.line(i,this.bins[i],i+1,this.bins[i+1]);
			}
		}

		image(this.offscreen.get(),this.x,this.y,this.width,this.height);
	}
}


class MechanicalCounter{
	//displayStrip = an image representing the numbers on the counter. should be 11 "units" tall, and contain the digits 0,1,2,3....9,0
	//digits = an integer representing how many numbers to display (and therefore how high we can count)
	//x,y,width,height
	constructor(displayStrip,digits,x,y,width,height){
		this.img=displayStrip;
		this.digits=digits;
		this.x=x;
		this.y=y;
		this.width=width;
		this.height=height;
	}

	draw(number){  //number=float value to display on counter
		noFill();
		stroke(50);
		strokeWeight(1);
		rect(this.x-2,this.y-2,this.width+3,this.height+3,2);

		let latched=true;
		for(let i=this.digits-1;i>=0;i--){
			let num=floor((number/Math.pow(10,this.digits-i-1))%10);
			if(latched){
				num+=number%1;
			}
			if(floor(num)<9){
				latched=false;   
			}

			image(this.img, 
				0,num*this.img.height/11,0,this.img.height/11, 
				this.x+i*this.width/this.digits, this.y, this.width/this.digits, this.height
				);

		}
	}
}


class TapeSystem{
	constructor(){  
		//first argument is area of tape, remaining arguments are a list of wheels the tape will travel around.
		//first and last wheel will have tape "wrapped" around
		this.totalTapeArea=arguments[0];

		this.a=arguments[1];  					//first wheel
		this.b=arguments[arguments.length-1];   //last wheel
		this.c=new Wheel(this.a.x,this.a.y,this.a.radius);		//Wheels objects with which the tape radius will be represented
		this.d=new Wheel(this.b.x,this.b.y,this.b.radius);
		this.c.colour=color(50);
		this.d.colour=color(50);
		this.c.drawLines=false;
		this.d.drawLines=false;

		this.tape=new TapeConnection();
		this.rotationRate=10;
		this.pProgress=0;

		this.tape.addWheel(this.c);
		for (let i = 2; i < arguments.length-1; i++) {
			this.tape.addWheel(arguments[i]);
  		}
  		this.tape.addWheel(this.d);
	}

	draw(progress){  //pass a number between 0 and 1
		progress=constrain(progress,0,1);
		let areaReel1=(1-progress)*this.totalTapeArea;
    	let areaReel2=progress*this.totalTapeArea;
    	this.c.radius=sqrt((areaReel1/PI)+pow(this.a.radius, 2));
    	this.d.radius=sqrt((areaReel2/PI)+pow(this.b.radius, 2));
    	this.tape.draw();

    	for (let i=0;i<this.tape.wheels.length;i++) {
    		//this.tape.wheels[i].rotation=1;
      		this.tape.wheels[i].rotation+=this.totalTapeArea*this.rotationRate*(this.pProgress-progress)/this.tape.wheels[i].radius;
      		this.tape.wheels[i].draw();
    	}

    	this.a.rotation=this.c.rotation;
    	this.b.rotation=this.d.rotation;

    	this.a.draw();
    	this.b.draw();
    	this.pProgress=progress;
	}
}


class TapeConnection{
	constructor(wheels){  //pass an array of wheels to make a tape connection between
		this.wheels=[]; 
		this.tapeThickness=0.5;
		this.colour=color(50);
	} 
	addWheel(wheel){
		this.wheels.push(wheel);
	}
	draw() {
		noFill();
		strokeWeight(this.tapeThickness);
		stroke(this.colour);

		for (let i=0; i<this.wheels.length-1; i++) {
			var angle=acos((this.wheels[i+1].radius-this.wheels[i].radius)/dist(this.wheels[i].x, this.wheels[i].y, this.wheels[i+1].x, this.wheels[i+1].y));  //get the angle of the tangent to the other circle
			var angleBetween=atan2(this.wheels[i].y-this.wheels[i+1].y, this.wheels[i].x-this.wheels[i+1].x);  //angle to the other circle in cartesian space
			var it=angleBetween-angle;
			line(this.wheels[i].x+this.wheels[i].radius*cos(it), this.wheels[i].y+this.wheels[i].radius*sin(it), this.wheels[i+1].x+this.wheels[i+1].radius*cos(it), this.wheels[i+1].y+this.wheels[i+1].radius*sin(it));
  		}
	}
}


class Wheel{
	constructor(x,y,radius){
		this.x=x;
		this.y=y;
		this.radius=radius;
		this.rotation=0;
		this.colour=color(180);
		this.drawLines=true;
	}

	draw(){
		noStroke();
		fill(this.colour);
		ellipse(this.x,this.y,this.radius*2,this.radius*2);

		if(this.drawLines){
			strokeWeight(this.radius*.05);
			stroke(0);
			line(this.x,this.y,this.x+this.radius*cos(this.rotation),this.y+this.radius*sin(this.rotation));
			line(this.x,this.y,this.x+this.radius*cos(this.rotation+TWO_PI/3),this.y+this.radius*sin(this.rotation+TWO_PI/3));
			line(this.x,this.y,this.x+this.radius*cos(this.rotation+4*PI/3),this.y+this.radius*sin(this.rotation+4*PI/3));
		}
	}
}


class ImageButton{
	constructor(x,y,width,height,img,pressMethod,releaseMethod){
		this.x=x;
		this.y=y;
		this.width=width;
		this.height=height;
		this.img=img;
		this.pressMethod=pressMethod;
		this.releaseMethod=releaseMethod;
	}
	pressed(){
		if(this.mouseIsOver()){
			this.pressMethod();
		}
	}
	released(){
		this.releaseMethod();	
	}
	mouseIsOver(){
		return (mouseX>this.x && mouseX<this.x+this.width && mouseY>this.y && mouseY< this.y+this.height);
	}

	draw(){
		image(this.img,this.x,this.y,this.width,this.height);
	}
}
