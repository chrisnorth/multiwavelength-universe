/*!
	Messier Bingo - Javascript Version
	(c) Stuart Lowe/LCOGT
*/
/*
	TODO:
	Add a hand to the pantograph

	USAGE:
		<script src="js/jquery-1.10.0.min.js" type="text/javascript"></script>
		<script src="js/messier.min.js" type="text/javascript"></script>
		<script type="text/javascript">
		<!--
			$(document).ready(function(){
				bingo = $.messierbingo({id:'starmapper'});
			});
		// -->
		</script>
		
	OPTIONS (default values in brackets):
*/

// plugin
(function() {


	// Full Screen API - http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
	var fullScreenApi = {
		supportsFullScreen: false,
		isFullScreen: function() { return false; },
		requestFullScreen: function() {},
		cancelFullScreen: function() {},
		fullScreenEventName: '',
		prefix: ''
	},
	browserPrefixes = 'webkit moz o ms khtml'.split(' ');
	// check for native support
	if (typeof document.cancelFullScreen != 'undefined') {
		fullScreenApi.supportsFullScreen = true;
	} else {
		// check for fullscreen support by vendor prefix
		for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
			fullScreenApi.prefix = browserPrefixes[i];
			if (typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
				fullScreenApi.supportsFullScreen = true;
				break;
			}
		}
	}
	// update methods to do something useful
	if (fullScreenApi.supportsFullScreen) {
		fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';
		fullScreenApi.isFullScreen = function() {
			switch (this.prefix) {
				case '':
					return document.fullScreen;
				case 'webkit':
					return document.webkitIsFullScreen;
				default:
					return document[this.prefix + 'FullScreen'];
			}
		}
		fullScreenApi.requestFullScreen = function(el) {
			return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
		}
		fullScreenApi.cancelFullScreen = function(el) {
			return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
		}
	}
	// jQuery plugin
	if (typeof jQuery != 'undefined') {
		jQuery.fn.requestFullScreen = function() {
			return this.each(function() {
				if (fullScreenApi.supportsFullScreen) fullScreenApi.requestFullScreen(this);
			});
		};
	}
	// export api
	window.fullScreenApi = fullScreenApi;
	// End of Full Screen API

	// Get the URL query string and parse it
	jQuery.query = function() {
			var r = {length:0};
			var q = location.search;
		if(q && q != '#'){
			// remove the leading ? and trailing &
			q = q.replace(/^\?/,'').replace(/\&$/,'');
			jQuery.each(q.split('&'), function(){
				var key = this.split('=')[0];
				var val = this.split('=')[1];
				if(/^[0-9.]+$/.test(val)) val = parseFloat(val);	// convert floats
				r[key] = val;
				r['length']++;
			});
		}
		return r;
	};


	function Activity(inp){

		this.q = $.query();

		// Language support
		this.lang = (navigator) ? (navigator.userLanguage||navigator.systemLanguage||navigator.language||browser.language) : "";			// Set the user language
		// Over-ride with query string set value
		if(typeof this.q.lang=="string") this.lang = this.q.lang;
		this.langshort = (this.lang.indexOf('-') > 0 ? this.lang.substring(0,this.lang.indexOf('-')) : this.lang.substring(0,2));

		this.langs = (inp && inp.langs) ? inp.langs : { 'en': 'English' };

		this.dataurl = "js/data_%LANG%.json";
		this.image = "images/image.png";
		this.id = -1;
		this.key = "";

		return this;
	}

	Activity.prototype.init = function(){
		var _obj = this;
		$(window).resize({me:this},function(e){ _obj.resize(); });
		this.load(this.lang,this.config);
		return this;
	}
	
	Activity.prototype.resize = function(){
		var rc = $('.comparison .rightcol');
		var padd = rc.outerWidth()-rc.width();
		var w = 1;
		var o = (this.data.language.alignment=="left") ? $('.comparison .leftcol').position().left : $('body').outerWidth() - ($('.comparison .leftcol').position().left+$('.comparison .leftcol').outerWidth());
		if($('.comparison .leftcol').css('display')=="block") w = $(window).width() - padd - o*2;		
		else w = $(window).width() - $('.comparison .leftcol').outerWidth() - o*2 - padd;
		
		// Fix language menu position
		$('#languageswitch').css((this.data.language.alignment=="right" ? {'left':($('#menu .langbtn').position().left-$('#menu .langbtn').outerWidth()*0.25)+'px','right':'auto'} : {'right':($('body').width()-$('#menu .langbtn').position().left-$('#menu .langbtn').outerWidth()*1.75)+'px','left':'auto'}));
		

		$('.comparison .rightcol ul').css('max-width',w);
		$('.comparison .rightcol ul li:last-child').css('margin-'+(this.data.language.alignment=="left" ? "right" : "left"),w-$('.comparison .rightcol ul li:last-child').width());
		return this;
	}

	// Load the specified language
	// If it fails and this was the long variation of the language (e.g. "en-gb" or "zh-yue"), try the short version (e.g. "en" or "zh")
	Activity.prototype.load = function(l,fn){
		if(!l) l = this.langshort;
		var url = this.dataurl.replace('%LANG%',l);
		$.ajax({
			url: url,
			method: 'GET',
			dataType: 'json',
			context: this,
			error: function(){
				console.log('Error loading '+l);
				if(url.indexOf(this.lang) > 0){
					console.log('Attempting to load '+this.langshort+' instead');
					this.load(this.langshort,fn);
				}
			},
			success: function(data){
				this.langshort = l;
				this.lang = l;
				// Store the data
				this.data = data;
				if(typeof fn==="function") fn.call(this);
			}
		});
		return this;
	}

	// Update the page using the JSON response
	Activity.prototype.config = function(){

		d = this.data;

		// Update title
		$('#titlebar h1').replaceWith('<div class="title">'+d.title+'<\/div>');
		
		// Update the help text
		$('#menu a.helpbtn').on('click',function(e){
			e.preventDefault();
			$(this).toggleClass('on');
			$('#help').slideToggle();
		}).addClass('item').before('<a href="#" class="langbtn item">'+this.langshort+'</a>');

		// Build language selector
		var html = "";
		for(l in this.langs) html += '<li><a href="?lang='+l+'">'+this.langs[l]+' ['+l+']</a></li>';
		$('#help').before('<div id="languageswitch"><ul dir="ltr">'+html+'</ul></div>');
		$('#languageswitch ul li a').on('click',{me:this},function(e){
			e.preventDefault();
			var l = $(this).attr('href');
			if(l.indexOf("lang=") >= 0) l = l.substr(l.indexOf("lang=")+5);
			e.data.me.load(l,e.data.me.updateLanguage);
			$('#languageswitch').hide();
		});
		$('.langbtn').on('click',function(){ $('#languageswitch').toggle(); });

		// Pick a random banner
		var b = d.banners[Math.round((d.banners.length-1)*Math.random())];
		$('#help').html('<div id="banner" style="background-image:url(\''+b.file+'\')"><h1>'+d.help.title+'<\/h1><p class="attribution">'+b.credit+'<\/p><\/div><div class="helpinner">'+d.help.html+'<\/div>');
		if(fullScreenApi.supportsFullScreen){
			$('#menu .helpbtn').after('<img src="images/fullscreen.png" class="fullscreenbtn" />');
			// Bind the fullscreen function to the double-click event if the browser supports fullscreen
			$('.fullscreenbtn').on('click', {me:this}, function(e){
				e.data.me.toggleFullScreen();
			});
		}

		// Update the select object text
		$('#objects h2').before('<div class="opener"><\/div>');
		$('#objects h2, #objects .opener').on('click',{me:this},function(e){
			e.data.me.toggleObjects();
		})


		// Update the objects
		var html = "";
		for(var o = 0 ; o < d.objects.length ; o++){
			html += '<li data="'+o+'"><div class="object"><div class="thumb"><img src="images/visible/'+d.objects[o].images.visible.file+'" /></div><span>'+d.objects[o].name+'<\/span> <div class="score" data="0"><\/div></div>';
		}
		$('#objects ul').html(html);
		$('#objects ul li').on('click',{me:this},function(e){
			e.data.me.changeObject($(this).attr('data'));
			$('#objects ul li').removeClass('selected');
			$(this).addClass('selected');
			$('#objects h2').trigger('click');
		});

		$('#tools .btn-check').on('click',{me:this},function(e){
			e.preventDefault();
			if(!$(this).attr('disabled')) e.data.me.check();
		});
		$('#tools .btn-info').on('click',{me:this},function(e){
			if(!$(this).attr('disabled')) e.data.me.toggleInfo();
		});

		this.updateTotal(0);

		this.updateLanguage();

		this.resize();

		return this;
	}
	
	Activity.prototype.updateLanguage = function(){

		// Set language direction via attribute and a CSS class
		$('#container').attr('dir',(this.data.language.alignment=="right" ? 'rtl' : 'ltr')).removeClass('ltr rtl').addClass((this.data.language.alignment=="right" ? 'rtl' : 'ltr'));

		// Update title
		$('#titlebar .title').html(this.data.title);
		
		// Update the help text
		$('#menu .helpbtn').html(this.data.help.label);
		$('#menu .langbtn').html('['+this.langshort+']');
		
		// Pick a random banner
		var b = this.data.banners[Math.round((this.data.banners.length-1)*Math.random())];
		$('#help').html('<div id="banner" style="background-image:url(\''+b.file+'\')"><h1>'+this.data.help.title+'<\/h1><p class="attribution">'+b.credit+'<\/p><\/div><div class="helpinner">'+this.data.help.html+'<\/div>');

		
		// Update the objects
		$('#objects h2').html(this.data.selectobject.title);
		var html = "";
		for(var o = 0 ; o < this.data.objects.length ; o++){
			html += '<li data="'+o+'"><div class="object"><div class="thumb"><img src="images/visible/'+this.data.objects[o].images.visible.file+'" /></div><span>'+this.data.objects[o].name+'<\/span> <div class="score" data="0"><\/div></div>';
		}
		$('#objects ul').html(html);
		$('#objects ul li').off('click').on('click',{me:this},function(e){
			e.data.me.changeObject($(this).attr('data'));
			$('#objects ul li').removeClass('selected');
			$(this).addClass('selected');
			$('#objects h2').trigger('click');
		});

		$('#tools .btn-check').html(this.data.check.button);
	
		$('#tools .btn-info').html(this.data.info.button);


		for(w = 0 ; w < this.data.wavelengths.length; w++){
			key = this.data.wavelengths[w].dir;
			$('.wavelength.'+key+' .label').html(this.data.wavelengths[w].title);
		}

		this.resize();
		
		return this;
	}
	
	Activity.prototype.toggleFullScreen = function(){
		// Get the container
		this.elem = document.getElementById("container");
		if(fullScreenApi.isFullScreen()){
			fullScreenApi.cancelFullScreen(this.elem);
			this.fullscreen = false;
			$('#container').removeClass('fullscreen');
		}else{
			fullScreenApi.requestFullScreen(this.elem);
			this.fullscreen = true;
			$('#container').addClass('fullscreen');
		}
		this.resize();
	}


	Activity.prototype.changeObject = function(i){

		if(this.data.objects[i].images['visible']){

			if($('#help').is(':visible')) $('#menu a.helpbtn').trigger('click');

			var html = "";
			var im, w, key, extra, src;

			this.id = i;

			// Update the select object text
			$('#objects h2').html(this.data.selectobject.withobject.replace('%OBJECT%',this.data.objects[i].name));

			// Update the wavelength list
			for(w = 0 ; w < this.data.wavelengths.length; w++){
				key = this.data.wavelengths[w].dir;
				im = this.data.objects[i].images[key];
				if(key!="visible" && im){
					extra = "";
					src = this.image;
					if(this.score && this.score[this.id] && this.score[this.id].answers && this.score[this.id].answers[key]){
						extra = " "+(this.score[this.id].answers[key].result ? "correct" : "wrong");
						src = (typeof this.score[this.id].answers[key].src==="string") ? this.score[this.id].answers[key].src : "";
					}
					html += '<div class="'+key+' wavelength'+extra+'" data="'+key+'"><a href="#'+key+'" class="label">'+this.data.wavelengths[w].title+'<\/a><img src="'+src+'" \/><\/div>';
				}
			}

			$('#selector .row.comparison .leftcol ul').html('<li class="image"><img src="" /></li>');

			// Add the second row of the selector

			// Left column
			$('#selector .row.answers .leftcol').html('<div class="'+this.data.wavelengths[0].dir+' wavelength selected"><span class="label">'+this.data.wavelengths[0].title+'</span></div>');

			// Right column
			if($('.wavelengths').length == 0) $('.answers .rightcol').html('<div class="wavelengths"></div>');
			$('.wavelengths').html(html);
			$('.wavelengths .wavelength').off('click').on('click',{me:this},function(e){
				e.preventDefault();
				e.data.me.setWavelength($(this).attr('data'));
			});
	
			w = this.getWavelength('visible');
			src = 'images/'+w.dir+'/'+this.data.objects[i].images['visible'].file;
			$('.comparison .leftcol li.image img').attr({'src':src,'alt':this.data.objects[i].name});


			// Update the current wavelength
			if(this.key && this.data.objects[i].images[this.key]){
				key = this.key;
			}else{
				w = 0;
				for(im in this.data.objects[i].images){
					if(w==1) key = im;
					w++;
				}
			}
			this.setWavelength(key);
			
			// Update the info area
			$('#info').html('<div class="illustration"><img src="'+src+'" alt="'+this.data.objects[i].name+'" /><\/div><div class="about">'+this.data.objects[i].info+'<\/div><div class="extrainfo"><strong>View object with<\/strong>: <a href="http://www.google.com/sky/#longitude='+(this.data.objects[i].coord.ra-180)+'&latitude='+this.data.objects[i].coord.dec+'&zoom=8" target="_sky">Google Sky<\/a> or <a href="http://www.chromoscope.net/?ra='+this.data.objects[i].coord.ra+'&dec='+this.data.objects[i].coord.dec+'&z=6" target="_chromoscope">Chromoscope<\/a><br /><strong>Coordinates:<\/strong> RA: '+this.data.objects[i].coord.ra+', Dec: '+this.data.objects[i].coord.dec+'<\/div><div class="clear"><\/div>').hide();
			
			// Make the buttons inactive
			$('#tools .btn').addClass('disabled');

			$('#result').html('');

			this.resize();
		}
		
		return this;
	}

	Activity.prototype.getWavelength = function(key){
		for(var i = 0 ; i < this.data.wavelengths.length; i++){
			if(this.data.wavelengths[i].dir == key) return this.data.wavelengths[i];
		}
		return {};
	}

	Activity.prototype.setWavelength = function(w){
		if(typeof w==="string"){

			var i;
			var html = "";
			var li = [];
			for(i = 0; i < this.data.objects.length; i++){
				if(typeof this.data.objects[i].images[w]==="object" && this.data.objects[i].images[w].src!=""){
					li.push('<li class="image"><img src="images/'+w+'/'+this.data.objects[i].images[w].file+'" title="'+this.data.objects[i].images[w].credit+'" \/><\/li>');
					this.key = w;

					$('.wavelengths .wavelength').removeClass('selected');
					$('.wavelengths .wavelength.'+w).addClass('selected');
					$('#selector').removeClass().addClass(w);
				}
			}

			if(li.length > 0){
				
				// Add titles to each side
				if($('.comparison .leftcol h2').length==0) $('.comparison .leftcol').prepend('<h2>'+this.data.instructions.visible+'<\/h2>');
				if($('.comparison .rightcol h2').length==0) $('.comparison .rightcol').prepend('<h2>'+this.data.instructions.select+'<\/h2>');

				// Update title
				var wv = this.getWavelength(this.key);
				$('.comparison .rightcol h2').html(this.data.instructions.select.replace('%WAVELENGTH%', wv.title).replace('%OBJECT%',this.data.objects[this.id].name));
	
				// Randomize the order of the images list items
				while(li.length > 0){
					i = Math.round((li.length-1)*Math.random());
					html += li[i];
					li.splice(i,1);
				}

				$('.comparison .rightcol ul').html(html);
				$('.comparison .rightcol ul li').off('click').on('click',{me:this},function(e){
					e.data.me.setImage($(this).find('img').attr('src'));
				});
				this.resize();
			}
		}

		return this;
	}

	Activity.prototype.setImage = function(src){

		$('.wavelengths .wavelength.'+this.key).removeClass('correct wrong');
		$('.wavelengths .wavelength.'+this.key+' img').attr('src',(src ? src : this.image));
		
		// Check if the check button can be enabled
		var ws = $('.wavelengths .wavelength img');
		var n = 0;
		for(var i = 0; i < ws.length ; i++){
			if($(ws[i]).attr('src')!=this.image) n++;
		}
		$('#tools button.btn-primary').attr("disabled", !(n==ws.length)).removeClass('disabled');
		return this;
	}

	Activity.prototype.toggleObjects = function(){
		$('#objects').toggleClass('closed')
		$('#objects ul').slideToggle();
		
		return this;
	}

	Activity.prototype.toggleInfo = function(){
	
		// Update the info area
		$('#info').toggle();

		return this;
	}

	Activity.prototype.check = function(){
	
		// Check if the check button can be enabled
		var ws = $('.wavelengths .wavelength');
		var n = 0;
		var key = "";

		if(!this.score) this.score = new Array(this.data.objects.length);
		if(typeof this.score[this.id]!=="object") this.score[this.id] = {};
		if(!this.score[this.id].answers) this.score[this.id].answers = {};

		for(var i = 0; i < ws.length ; i++){
			key = $(ws[i]).attr('data');
			if($(ws[i]).find('img').attr('src')=='images/'+key+'/'+this.data.objects[this.id].images[key].file){
				n++;
				$(ws[i]).addClass('correct');
				this.score[this.id].answers[key] = { 'result': true };
			}else{
				$(ws[i]).addClass('wrong');
				this.score[this.id].answers[key] = { 'result' : false };
			}
			this.score[this.id].answers[key].src = $(ws[i]).find('img').attr('src');
		}

		// Make the 'more info' button active
		$('#tools .btn.disabled').removeClass('disabled');

		this.setScore(n,ws.length);

		return this;
	}

	Activity.prototype.setScore = function(n,t){

		if(!this.score) this.score = new Array(this.data.objects.length);
		if(typeof this.score[this.id]!=="object") this.score[this.id] = {};
		this.score[this.id].n = n;
		this.score[this.id].t = t;

		$('#result').html(this.data.check.result.replace('%PERCENT%', Math.round(100*n/t)+"%").replace('%CORRECT%',n).replace('%TOTAL%',t));
		$('#objects ul li').eq(this.id).find('.score').html(Math.round(100*n/t)+"%");

		var n = 0;
		var t = 0;
		for(var i = 0; i < this.score.length; i++){
			if(typeof this.score[i]==="object" && typeof this.score[i].t==="number" && typeof this.score[i].n==="number"){
				t += this.score[i].t;
				n += this.score[i].n;
			}
		}
		if(t > 0) this.updateTotal(n,t);

		return this;
	}

	Activity.prototype.updateTotal = function(n,t){
		var r = (t > 0) ? Math.round(100*n/t) : 0;
		if(typeof n==="number" && typeof t==="number") $('#average .label').html(this.data.check.average.replace('%PERCENT%',r+"%").replace('%CORRECT%',n).replace('%TOTAL%',t)).data('score',Math.round(100*t));
		return this;
	}


	$.multiwavelength = function(placeholder,input) {
		if(typeof input=="object") input.container = placeholder;
		else {
			if(placeholder){
				if(typeof placeholder=="string") input = { container: placeholder };
				else input = placeholder;
			}else{
				input = {};
			}
		}
		input.plugins = $.multiwavelength.plugins;
		return new Activity(input);
	};

	$.multiwavelength.plugins = [];

})(jQuery);

