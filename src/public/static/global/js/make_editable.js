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
        newmenu: {title : 'Custom', items : 'load save'}
    },
    menubar: 'file edit insert, view, format, table, tools, newmenu',
    setup: function(editor) {
	editor.addMenuItem('load', {
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
			content = content.replace(/"/g,'\\\"');
			content = content.replace(/'/g,'&apos;');
			console.log(content);
			var $activetab = $('div.active')
			console.log($activetab);
			console.log(e);
			var path = 'tab/bublin/method';
			console.log(path);
			$.ajax({
				url: 'http://dash1.activecampus.org/' + path,
				type: 'POST',
				headers: {"X-HTTP-Method-Override": "PUT"},
				contentType: 'application/json',
				data: '{"description": "Test description", "content": "' + content + '"}',
				success: function (response) {
					console.log(response);
				},
				error: function (a, b) {
					console.log(JSON.stringify(['Error', a, b]));
				}
			});
		}
	});
  },
  content_css: [
    //'assets/peercomp3projection.css?v=2'
  ]
}));
