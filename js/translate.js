/*
	Translation library
*/
// Extend jQuery
(function ($) {


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

	function Translator(inp){

		this.q = $.query();

		this.id = (inp && typeof inp.id==="string") ? inp.id : 'form';
		this.master = (inp && typeof inp.master==="string") ? inp.master : '';
		this.json = (inp && typeof inp.json==="string") ? inp.json : '';
		this.langs = (inp && typeof inp.langs==="object") ? inp.langs : { 'en':'English' };

		// Load the master language config file
		this.setLanguage()

		this.lang = this.q.lang;
		if(!this.lang) this.lang = "en";

		this.page = $('#'+this.id);

		html = "<form id=\"langchoice\"><label>Select language (not all are complete):</label><select name=\"lang\">"
		for(var l in this.langs) html += '<option name="'+l+'" value="'+l+'"'+(this.lang==l ? " selected" : "")+'>'+this.langs[l]+'</option>';
		html += "</select></form>";

		if($('#translate_chooser').length == 0) this.page.prepend('<div id="translate_chooser"></div>');
		if($('#translation').length == 0) this.page.append('<div id="translation"></div>')
		$('#translate_chooser').html(html).find('#langchoice select').bind('change',{me:this},function(e){ e.data.me.setLanguage($(this).find("option:selected").val()); });

		this.setLanguage(this.lang);

		return this;
	}

	Translator.prototype.setLanguage = function(lang){
		if(lang) this.lang = lang;
		this.loadLanguage(this.lang,function(e){
			if(e.lang){
				this.lang = e.lang;
				this.phrasebook = (e.data) ? e.data : { 'language': {'name':'','code':e.lang } };
			}else{
				this.masterbook = e.data;
			}
			this.rebuildForm();
			if(e.lang){
				var href = $('a.langlink').attr('href');
				$('a.langlink').attr('href',href.substring(0,href.indexOf('?'))+'?lang='+this.lang);
				$('.langname').html(this.phrasebook.language.name);
			}
		});
		return this;
	}

	Translator.prototype.loadLanguage = function(lang,callback,langdummy){
		var url = (lang) ? this.json.replace('%LANG%',lang) : this.master;
		if(typeof langdummy=="string") lang = langdummy;
		if(lang) this.lang = lang;
		$.ajax({
			url: url,
			method: 'GET',
			dataType: 'json',
			context: this,
			error: function(){
				// We couldn't find this language so load the English version
				// so there is something to work from.
				if(lang != "en") this.loadLanguage('en',callback,lang);
			},
			success: function(data){
				// Update the language code and name
				if(data && data.language && typeof data.language.code==="string") data.language.code = lang;
				if(data && data.language && typeof data.language.code==="string") data.language.name = this.langs[lang];
				if(typeof callback==="function") callback.call(this,{data:data,lang:lang});
			}
		});
	
	}

	Translator.prototype.rebuildForm = function(){

		var html = "<form id=\"language\">";
		html += this.buildForm(this.masterbook,this.phrasebook,"");
		html += "</form>";

		$('#translation').html(html);

		$('#translation input, #translation textarea, #translation select').attr('dir',(this.phrasebook && this.phrasebook.language && this.phrasebook.language.alignment=="right" ? "rtl" : "ltr")).unbind().bind('change',{me:this},function(e){
			e.data.me.getOutput();
			e.data.me.percentComplete();
		});

		// Update the text direction when the appropriate select box changes
		$('#translation select[name=".language.alignment"]').on('change',function(e){
			$('#translation input, #translation textarea, #translation select').attr('dir',($(this).val()=="right" ? "rtl" : "ltr" ));
		});
		
		this.getOutput();
		this.percentComplete();

		return this;

	}


	Translator.prototype.buildForm = function(m,p,k){

		var html = "";
		var newk = "";
		var inp = "";
		var arr = false;
		var n;
		
		if(!k) k = "";

		for(key in m){
			n = parseInt(key);
		
			newk = (n >= 0)	? k+"["+key+"]" : k+"."+key;

			if(typeof m[key]==="object"){

				if(n >= 0 && this.previousgroup != n) html += '</div>';

				if(m[key]._text && m[key]._type){
					inp = "";
					if(m[key]._type=="textarea"){
						inp = '<textarea name="'+newk+'">'+sanitize((p ? p[key] : ""))+'</textarea>';
					}else if(m[key]._type=="noedit"){
						inp = '<input type="hidden" name="'+newk+'" value="'+sanitize((p ? p[key] : ""))+'" />'+sanitize((p ? p[key] : ""));
					}else if(m[key]._type=="select"){
						inp = '<select name="'+newk+'">';
						for(var o = 0; o < m[key]._options.length ; o++){
							var sel = (p && m[key]._options[o].value==p[key]) ? ' selected="selected"' : '';
							inp += '<option value="'+m[key]._options[o].value+'"'+sel+'>'+m[key]._options[o].name+'</option>'
						}
						inp += '</select>';
					}else if(m[key]._type=="string"){
						inp = '<input type="text" name="'+newk+'" value="'+sanitize((p && p[key] ? p[key] : ""))+'" />';
					}
					html += this.row((m[key]._title ? m[key]._title : key),m[key]._text,inp);
				}else{

					// If this section has a title
					if(m[key]._title) html += '<h2>'+m[key]._title+'</h2>';
					if(n >= 0) html += '<div class="group">';

					html += this.buildForm(m[key],(p) ? p[key] : {}, newk);
					this.previousgroup = n;
				}
			}
		}

		return html;
	}

	Translator.prototype.percentComplete = function(){
		var percent = 100;
		if(this.lang!="en"){
			var total = 0;
			var diff = 0;
/*
			for(var i = 0 in this.chromo.phrasebook){
				if(i!="alignment" && i!="code" && i != "lang" && i!="helpmenu" && i!="gal" && i!="eq" && i!="version"){
					total++;
					var val = converter($("#"+i).val()).replace(/&amp;/g,"&");
					if(this.q.debug) console.log(i,val,this.english[i])
					if(val && val != this.english[i]){
						diff++;
//						$("#fs_"+i).removeClass('same');
					}else{
//						$("#fs_"+i).addClass('same');
					}
				}
			}
*/
			percent = Math.floor(100*diff/total);
		}
		$("#complete").html(percent);
	}

	Translator.prototype.row = function(title,desc,field){
		var id = field.indexOf("id=\"");
		id = field.substr(id+4);
		id = id.substr(0,id.indexOf("\""));

		var html = "	<fieldset>";// id=\"fs"+id+"\">";
		html += "		<legend>"+title+"</legend>";
		html += "		<div class=\"twocol\">";
		html += "			<p>"+desc+"</p>";
		html += "		</div>";
		html += "		<div class=\"fourcol\">";
		html += "			"+field;
		html += "		</div>";
		html += "	</fieldset>";
		return html;
	}
	Translator.prototype.getOutput = function(){
		var json = sanitize(converter($("form#language").formToJSON()));
		json = json.substring(0,json.length-4).substring(17).replace(/\n\t\t/g,'\n\t')+'}';
		var output = "<pre>"+json+"</pre>";

		if($('#output').length == 0) $('#translation').after('<div id="output"></div>')

		$('#output').html(output);
	}

	/* From http://exceptionallyexceptionalexceptions.blogspot.co.uk/2011/12/convert-html-form-to-json.html */
	$.fn.formToJSON = function() {
		var objectGraph = {};

		function add(objectGraph, name, value) {
			if(name.length == 1) {
				//if the array is now one element long, we're done
				objectGraph[name[0]] = value;
			}else{
				//else we've still got more than a single element of depth

				var newname = (name[0].indexOf('[') > 0) ? name[0].substring(0,name[0].indexOf('[')) : name[0];
				if(newname != name[0]){
					var id = parseInt(name[0].substr(name[0].indexOf('[')+1,name.length-1));
				}

				if(typeof objectGraph[newname]==="undefined") {
					//create the node if it doesn't yet exist
					objectGraph[newname] = (newname==name[0]) ? {} : [{}];
				}

				//recurse, chopping off the first array element
				if(newname != name[0]){
					// If this index doesn't exist we create a dummy
					if(objectGraph[newname] && objectGraph[newname].length <= id) objectGraph[newname].push({})
					add(objectGraph[newname][id], name.slice(1), value);
				}else{
					add(objectGraph[newname], name.slice(1), value);
				}
			}
		};

		//loop through all of the input/textarea elements of the form
		this.find('input, textarea, select').each(function() {
		//$(this).children('input, textarea').each(function() {
			//ignore the submit button
			if($(this).attr('name') != 'submit') {
				//split the dot notated names into arrays and pass along with the value
				add(objectGraph, $(this).attr('name').split('.'), $(this).val());
			}
		});
		return JSON.stringify(objectGraph,null, " ");
	};
		 

	function converter(tstr) {
		if(!tstr) return "";
		var bstr = '';
		for(var i=0; i<tstr.length; i++){
			if(tstr.charCodeAt(i)>127) bstr += '&amp;#' + tstr.charCodeAt(i) + ';';
			else bstr += tstr.charAt(i);
		}
		return bstr;
	}
	function sanitize(str){
		if(str){
			str = str.replace(/</g,"&lt;");
			str = str.replace(/>/g,"&gt;");
			str = str.replace(/"/g,"&quot;");
		}
		return str;
	}

	$.translator = function(placeholder,input) {
		if(typeof input=="object") input.container = placeholder;
		else {
			if(typeof placeholder=="string") input = { container: placeholder };
			else input = placeholder;
		}
		input.plugins = $.translator.plugins;
		return new Translator(input);
	};
	$.translator.plugins = [];

})(jQuery);


