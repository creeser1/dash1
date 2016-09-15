$(tinymce.init({
	selector: ".editable",
	height: 500,
	plugins: [
		'advlist autolink lists link image charmap print preview hr anchor pagebreak',
		'searchreplace wordcount visualblocks visualchars code fullscreen',
		'insertdatetime media nonbreaking save table contextmenu directionality',
		'emoticons template paste textcolor colorpicker textpattern imagetools'
	],
	toolbar1: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image',
	toolbar2: 'print preview media | forecolor backcolor emoticons',
	image_advtab: true,
	templates: [
		{ title: 'Test template 1', content: 'Test 1' },
		{ title: 'Test template 2', content: 'Test 2' }
	],
	inline: true,
	menubar: true,
	menu : {
		file   : {title : 'File'  , items : 'newdocument'},
		edit   : {title : 'Edit'  , items : 'undo redo | cut copy paste pastetext | selectall'},
		insert : {title : 'Insert', items : 'link media | template hr'},
		view   : {title : 'View'  , items : 'visualaid'},
		format : {title : 'Format', items : 'bold italic underline strikethrough superscript subscript | formats | removeformat'},
		table  : {title : 'Table' , items : 'inserttable tableprops deletetable | cell row column'},
		tools  : {title : 'Tools' , items : 'spellchecker code'},
		newmenu: {title : 'Custom', items : 'load save publish'}
	},
	menubar: 'file edit insert, view, format, table, tools, newmenu',

	setup: function(editor) {
		console.log('setup mce');
		var sendData = function (content, description, status) {
			content = content.replace(/"/g,'\\\"');
			content = content.replace(/'/g,'&apos;');
			var $activetab = $('div.active').attr('id');
			var $app = $('body').attr('data-app');
			var path = 'tab/' + $app + '/' + $activetab;
			var ses = $('body').attr('data-ses');
			if (!ses) {
				$.ajax({
					url: 'http://dash1.activecampus.org/loginto/' + $app,
					success: function (response) {
						var xbody = response.replace(/<html>.*?<body>/,'x');
						console.log(xbody);
					}
				});
				//$('body').append();
			}
			$.ajax({
				url: 'http://dash1.activecampus.org/' + path,
				type: 'POST',
				headers: {
					"X-HTTP-Method-Override": "PUT",
					"X-Auth-Token": ses
				},
				contentType: 'application/json',
				data: '{"description": "' + description + '", "content": "' + content + '" "status": "' + status + '"}',
				success: function (response) {
					console.log(response);
				},
				error: function (a, b) {
					console.log(JSON.stringify(['Error', a, b])); // popup login
				}
			});
		};
		editor.addMenuItem('load', { //replace with a list of previous versions to select
			text: 'Load',
			context: 'newmenu',
			onclick: function() {
			$.ajax({
				url: '//localhost/uploads/test99.txt'
			}).done(function (data) {
				tinymce.activeEditor.setContent(data);
			});
			//editor.insertContent('&nbsp;<em>You clicked menu item 1!</em>');
		}
		});
		editor.addMenuItem('save', {
			text: 'Save',
			context: 'newmenu',
			onclick: function(e) {
				var content = tinymce.activeEditor.getContent();
				sendData(content, 'Draft description...', 'draft');
			}
		});
		editor.addMenuItem('publish', {
			text: 'Publish',
			context: 'newmenu',
			onclick: function(e) {
				var content = tinymce.activeEditor.getContent();
				sendData(content, 'Published description...', 'published');
			}
		});
	},
	content_css: [
		//'assets/peercomp3projection.css?v=2'
	]
}));
