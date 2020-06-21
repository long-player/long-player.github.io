let audio;
let audioContext;
let audioNode;
let gain,analyser;
let spectrum,waveform,counter;
let img;

function setup(){
	createCanvas(windowWidth,windowHeight);
	audio = new Audio('assets/2451.mp3');   					//load the audio file
	audio.preload = 'auto';  //this is the default
	audioContext=new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive"});	//create an audio context
    audioNode = audioContext.createMediaElementSource(audio);   //create an audio node from the audio file
    gain=audioContext.createGain();								//create a volume node

	analyser = audioContext.createAnalyser();					//create an audio analyser node	
	analyser.smoothingTimeConstant = 0;							//set analyser node smoothing to 0
	analyser.fftSize=1024;	

    spectrum=new Spectrum(analyser,0,0,512,256);				//set up our spectrum and waveform viewers
    waveform=new Waveform(analyser,0,257,512,256);

    audioNode.connect(analyser);								//connect them all together: source->analyser
    audioNode.connect(gain);									//source->volume
    gain.connect(audioContext.destination);						//volume->output

    audio.fastSeek(8779);

    
    img = loadImage('assets/number strip.jpg');
    counter= new MechanicalCounter(img,4,600,300,100,25);
}

function draw(){
	background(127);

	counter.draw(audio.currentTime);
	spectrum.draw();
	waveform.draw();
}

function mousePressed() {
	audio.fastSeek(9999*mouseX/width);
}

function keyPressed(){
	if (keyCode === LEFT_ARROW) {
		audio.fastSeek(audio.currentTime-10);
	} else if (keyCode === RIGHT_ARROW) {
		audio.fastSeek(audio.currentTime+10);
	}else if(key==' '){
		togglePlayPause();
	}
}

function togglePlayPause(){
	if(audio.paused){
		if(audio.readyState==HTMLMediaElement.HAVE_ENOUGH_DATA){
			audio.play();  
		}
	}else{
		audio.pause();
	}
}

class Spectrum{
	constructor(analyserNode,x,y,width,height){
		this.analyser=analyserNode;	
		this.bins=new Uint8Array(this.analyser.frequencyBinCount);		//shorten fft
		this.x=x;
		this.y=y;
		this.width=width;
		this.height=height;
		this.divider=1;
		this.offscreen=createGraphics(this.bins.length/this.divider,this.bins.length/this.divider)
		this.offscreen.background(0);
	}

	draw(){
		this.analyser.getByteFrequencyData(this.bins);
		this.offscreen.image(this.offscreen,-1,0 );

		for(let i=0;i<this.offscreen.height;i++){
			this.offscreen.stroke(this.bins[i*this.divider]);
			this.offscreen.point(this.offscreen.width-1 ,this.offscreen.height-i);
		}
		image(this.offscreen,this.x,this.y,this.width,this.height);
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
		this.offscreen=createGraphics(this.bins.length/this.divider,256)
		this.offscreen.background(0);
	}

	draw(){
		this.analyser.getByteTimeDomainData(this.bins);
		this.offscreen.background(0);
		this.offscreen.stroke(255);
		for(let i=0;i<this.offscreen.width-1;i++){
			this.offscreen.line(i,this.bins[i],i+1,this.bins[i+1]);
		}
		image(this.offscreen,this.x,this.y,this.width,this.height);
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
		rect(this.x,this.y,this.width,this.height);
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
