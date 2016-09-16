$(tinymce.init({
	selector: ".editable",
	height: 500,
	plugins: [
		'advlist autolink lists link image charmap print preview hr anchor pagebreak',
		'searchreplace wordcount visualblocks visualchars code fullscreen',
		'insertdatetime media nonbreaking save table contextmenu directionality',
		'emoticons template paste textcolor colorpicker textpattern imagetools'
	],
	toolbar1: 'insertfile undo redo | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | forecolor backcolor | link image media',
	image_advtab: true,
	inline: true,
	menubar: true,
	menu : {
		file   : {title : 'File'  , items : 'loginout newdocument load save publish'},
		edit   : {title : 'Edit'  , items : 'undo redo | cut copy paste pastetext | selectall'},
		insert : {title : 'Insert', items : 'link media | template hr'},
		format : {title : 'Format', items : 'bold italic underline strikethrough superscript subscript | formats | removeformat'},
		table  : {title : 'Table' , items : 'inserttable tableprops deletetable | cell row column'},
		tools  : {title : 'Tools' , items : 'spellchecker code'},
	},
	menubar: 'file edit insert, format, table, tools',

	setup: function(editor) {
		var $activetab = $('div.active').attr('id');
		var $app = $('body').attr('data-app');
		var path = 'tab/' + $app + '/' + $activetab;
		var ses; // = $('body').attr('data-ses'); //  ********* should convert from base64 string
		if (typeof(Storage) !== "undefined") {
			ses = localStorage.getItem('ses');
		}
		var sendData = function (content, description, status, ses) {
			var $data = '{"description": "' + description + '", "content": "' + content + '", "status": "' + status + '"}';
			console.log('****SES: ' + ses);
			$.ajax({
				url: 'http://dash1.activecampus.org/' + path,
				type: 'POST',
				headers: {
					"X-HTTP-Method-Override": "PUT",
					"X-Auth-Token": ses
				},
				contentType: 'application/json',
				data: $data,
				success: function (response) {
					console.log(response);
				},
				error: function (response) {
					ses = '';
					if (typeof(Storage) !== "undefined") {
						localStorage.setItem('ses', ses);
					}
					saveData(content, description, status);
					console.log(JSON.stringify(['Error', response])); // popup login
				}
			});
		}
		var showLogin = function (response) {
			var xbody = response.replace(/[\n\r]/mg, ' ');
			xbody = xbody.replace(/<!DOCTYPE html>.*<body>/m,'');
			xbody = xbody.replace(/<\/body>.*<\/html>/m,'');
			$xbody = $(xbody);
			$xbody.appendTo('body');
			return $xbody;
		};
		var saveData = function (content, description, status) {
			content = content.replace(/"/g,'\\\"');
			content = content.replace(/'/g,'&apos;');
			$activetab = $('div.active').attr('id');
			$app = $('body').attr('data-app');
			path = 'tab/' + $app + '/' + $activetab;
			//ses = $('body').attr('data-ses'); //  ********* should convert from base64 string
			if (typeof(Storage) !== "undefined") {
				ses = localStorage.getItem('ses');
			}
			if (ses) {
				sendData(content, description, status, ses); // go ahead and send it
			} else { // present login overlay
				console.log('no ses: ' + ses);
				$.ajax({
					url: 'http://dash1.activecampus.org/login',
					success: function (response) {
						var $xbody = showLogin(response);
						//console.log($xbody.find('button[type=submit]'));
						$xbody.find('button[type=submit]').on('click', function (e) {
							e.preventDefault();
							e.stopPropagation();
							var btn = e.target;
							var destination = $(btn).text().toLowerCase();
							console.log(destination);
							$.ajax({
								url: 'http://dash1.activecampus.org/' + destination,
								type: 'POST',
								data: $('#loginform').serialize(),
								success: function (response) {
									if (destination === 'login') {
										$xbody.remove(); // successful login no longer needs login overlay
										ses = response; //  ********* should convert to base64 string
										//$('body').attr('data-ses', ses); // set token
										if (typeof(Storage) !== "undefined") {
											localStorage.setItem('ses', ses);
										}
										sendData(content, description, status, ses);
									} else {
										$('#loginform .errmsg').text(response.responseText);
									}
									console.log(response);
								},
								error: function (response) {
									$('#loginform .errmsg').text(response.responseText);
									console.log(response); // popup login
								}
							});
						});
					}
				});
				return; // don't send anything here, since login will redirect
			}
		};
		editor.addMenuItem('loginout', { //replace with a list of previous versions to select
			text: 'Login/Logout',
			context: 'file',
			onclick: function() {
				ses = '';
				if (typeof(Storage) !== "undefined") {
					localStorage.setItem('ses', ses);
				}
			}
		});
		editor.addMenuItem('load', { //replace with a list of previous versions to select
			text: 'Load',
			context: 'file',
			onclick: function() {
			}
		});
		editor.addMenuItem('save', {
			text: 'Save',
			context: 'file',
			onclick: function(e) {
				var content = tinymce.activeEditor.getContent();
				saveData(content, 'Draft description...', 'draft');
			}
		});
		editor.addMenuItem('publish', {
			text: 'Publish',
			context: 'file',
			onclick: function(e) {
				var content = tinymce.activeEditor.getContent();
				saveData(content, 'Published description...', 'published');
			}
		});
	},
	content_css: [
		//'assets/peercomp3projection.css?v=2'
	]
}));
