(function () {

	var units = "Students";
	var palette = ['#aa6', '#f90', '#d6a', '#a6d', '#f0f', '#6da', '#ad6', '#a66', '#a6a', '#66a', '#6ad', '#0dc', '#b3a', '#0df', '#6a0', '#f3a', '#6a6', '#6aa', '#da6', '#00f', '#0af', '#f00', '#0f3', '#60f', '#fe0', '#06a'];
	var svg;
	var hasher = function (str) {
		var offset = 104;
		var slope = 17.0/7.0;
		var cycle = palette.length;
		var normal = str.toUpperCase().replace(/^[A-Z]/g,'');
		var scores = [];
		var score = 0;
		normal.split('').forEach(function (el, i, a) {
			scores.unshift(normal.charCodeAt(i)<<2);
			if (i>1) {
				scores.push(((normal.charCodeAt(i))^(normal.charCodeAt(i-1)<<1))^normal.charCodeAt(i-2)<<2);
			}
		});
		scores.forEach(function (el, i) {
			score += el * i * slope;
		});
		return Math.round(score+offset)%cycle;
	};

	var create_chart = function (results) {

	$('#chart').append('<div id="chart_panel"></div>');
	$('#chart_panel').empty();
	var label_nodes = function (name, source, target, y, dy) {
		d3.selectAll('#chart_panel').append('div')
			.attr('class','nodelabel')
			.style('padding','1px')
			.style('width', '324px')
			.style('text-align', source.length ? 'left' : 'right')
			.style('background-color', 'rgba(255,255,255,0.0)')
			.style('position','absolute')
			.style('left', function () {if (source.length) {return '155px'} else {return '688px'}})
			.style('top', function () {return (244 + dy + y) + 'px'})
			.html(function(d) {return '<span>' + name + '</span>'; });		
	};

		var graph = results[0];
		var base = results[1];
		var totstudents;
		var fromtoboth = 'both';
		switch (fromtoboth) {
			case 'from':
				totstudents = results[2];
				break;
			case 'to':
				totstudents = results[3];
				break;
			default:
				totstudents = results[4];
		}

		var margin = {top: 10, right: 30, bottom: 10, left: 30},
			width = 1025 - margin.left - margin.right,
			height = 320 + totstudents - margin.top - margin.bottom;

		var formatNumber = d3.format(",.0f"),    // zero decimal places
			format = function(d) { return formatNumber(d) + " " + units; },
			color = function (n) {return palette[n%palette.length];};//d3.scale.category20();

		// append the svg canvas to the page
		svg = d3.select("#chart_panel").append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.attr("class", "svg_chart_container")
		  .append("g")
			.attr("transform", 
				  "translate(" + margin.left + "," + margin.top + ")");

		// Set the sankey diagram properties
		var sankey = d3.sankey()
			.nodeWidth(50)
			.nodePadding(14)
			.size([width, height]);

		var path = sankey.link();

		sankey
			.nodes(graph.nodes)
			.links(graph.links)
			.layout(); // formerly layour(32), layout () is stable regarding given graph node ordering

		// add in the links
		var link = svg.append("g").selectAll(".link")
			.data(graph.links)
			.enter().append("path")
			.attr("class", "link")
			.attr("d", path)
			.style('fill', 'transparent') 
			.style('stroke', function (d) { 
				//return color(d.ty || d.sy); // by position
				var c = color(d.target.name === base ? hasher(d.source.name) : hasher(d.target.name)); // by name hash
				return d3.rgb(c);
			})
			.on("mouseover", function (d) {
				var c = color(d.target.name === base ? hasher(d.source.name) : hasher(d.target.name)); // by name hash
				this.style.stroke = d3.rgb(c).darker(1);
			})
			.on("mouseout", function (d) {
				var c = color(d.target.name === base ? hasher(d.source.name) : hasher(d.target.name)); // by name hash
				this.style.stroke = d3.rgb(c);
			})
				.style("stroke-width", function(d) {
				return Math.max(1, d.dy);
			})
			.sort(function(a, b) {
				return b.dy - a.dy;
			});

		// add the link titles
		var totemplate = '{v} of students graduating in {t}\nbegan as {s} students';
		var fromtemplate = '{v} of students who began in {s}\ngraduated in {t}';
		link.append("title")
			.text(function(d) {
				if (d.source.name === d.target.name) {
						var fb = d.fmt.split(',');
						if (fromtoboth === 'both') {
							var both = totemplate.replace('{v}', fb[0]).replace('{t}', d.target.name).replace('{s}', d.source.name) + 
								'\n  whereas\n' + 
								fromtemplate.replace('{v}', fb[1]).replace('{t}', d.target.name).replace('{s}', d.source.name);
							return both;
						} else if (fromtoboth === 'to') {
							return totemplate.replace('{v}', fb[0]).replace('{t}', d.target.name).replace('{s}', d.source.name);
						} else {
							return fromtemplate.replace('{v}', fb[1]).replace('{t}', d.target.name).replace('{s}', d.source.name);
						}
				} else {
					if (d.source.name === base) {
						return fromtemplate.replace('{v}', d.fmt).replace('{t}', d.target.name).replace('{s}', d.source.name);
					} else {
						return totemplate.replace('{v}', d.fmt).replace('{t}', d.target.name).replace('{s}', d.source.name);
					}
				}
			});

		// add in the nodes
		var node = svg.append("g").selectAll(".node")
			.data(graph.nodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { 
				label_nodes(d.name, d.sourceLinks, d.targetLinks, d.y, d.dy/2);
				return "translate(" + d.x + "," + d.y + ")";
			})
			.call(d3.behavior.drag()
				.origin(function(d) {
					return d;
				})
				.on("dragstart", function() { 
					this.parentNode.appendChild(this); 
				})
				.on("drag", dragmove)
			);

		// add the rectangles for the nodes
		node.append("rect")
		.attr("height", function(d) {
			return d.dy;
		})
		.attr("width", sankey.nodeWidth())
		.style('fill', '#ddd')
		.style("stroke", function(d) { 
			return d3.rgb(d.color);
		})
		.append("title")
		.text(function(d) { 
			return d.name + "\n" + format(d.value);
		});

		// add in the title for the nodes

		// the function for moving the nodes
		function dragmove(d) {
		d3.select(this).attr("transform", 
			"translate(" + d.x + "," + (
					d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
				) + ")");
		sankey.relayout();
		link.attr("d", path);
		}
		$('.svg_chart_container').css({"background-color": "#ffffff"})
	}; // end create_chart

	var init = function () { // initially and on change of campus
		var results = [
			{"nodes":[
				{"node":0,"name":"Undeclared"},
				{"node":1,"name":"Computer Science"},
				{"node":2,"name":"Engineering"},
				{"node":3,"name":"Pre-Nursing"},
				{"node":4,"name":"Economics"},
				{"node":5,"name":"Biology"},
				{"node":6,"name":"Kinesiology, Physical Education"},
				{"node":7,"name":"Criminal Justice"},
				{"node":8,"name":"Mathematics"},
				{"node":9,"name":"Art"},
				{"node":10,"name":"Other"},
				{"node":11,"name":"Business Administration"},
				{"node":12,"name":"Business Administration"},
				{"node":13,"name":"Criminal Justice"},
				{"node":14,"name":"Communications"},
				{"node":15,"name":"Recreation Management"},
				{"node":16,"name":"Health Science"},
				{"node":17,"name":"Human Development"},
				{"node":18,"name":"Art"},
				{"node":19,"name":"International Studies, Global Studies"},
				{"node":20,"name":"Environmental Studies, Environmental Science"},
				{"node":21,"name":"Political Science, Government"},
				{"node":22,"name":"Liberal Studies"},
				{"node":23,"name":"Economics"},
				{"node":24,"name":"Psychology"},
				{"node":25,"name":"Other"}
				],"links":[
				{"source":0,"target":12,"value":120,"fmt":"36%"},
				{"source":1,"target":12,"value":11,"fmt":"3%"},
				{"source":2,"target":12,"value":10,"fmt":"3%"},
				{"source":3,"target":12,"value":9,"fmt":"3%"},
				{"source":4,"target":12,"value":7,"fmt":"2%"},
				{"source":5,"target":12,"value":5,"fmt":"1%"},
				{"source":6,"target":12,"value":4,"fmt":"1%"},
				{"source":7,"target":12,"value":4,"fmt":"1%"},
				{"source":8,"target":12,"value":3,"fmt":"< 1%"},
				{"source":9,"target":12,"value":3,"fmt":"< 1%"},
				{"source":10,"target":12,"value":11,"fmt":"3%"},
				{"source":11,"target":12,"value":150,"fmt":"45%,67%"},
				{"source":11,"target":13,"value":10,"fmt":"4%"},
				{"source":11,"target":14,"value":9,"fmt":"4%"},
				{"source":11,"target":15,"value":9,"fmt":"4%"},
				{"source":11,"target":16,"value":6,"fmt":"3%"},
				{"source":11,"target":17,"value":5,"fmt":"2%"},
				{"source":11,"target":18,"value":4,"fmt":"2%"},
				{"source":11,"target":19,"value":3,"fmt":"1%"},
				{"source":11,"target":20,"value":3,"fmt":"1%"},
				{"source":11,"target":21,"value":3,"fmt":"1%"},
				{"source":11,"target":22,"value":3,"fmt":"1%"},
				{"source":11,"target":23,"value":3,"fmt":"1%"},
				{"source":11,"target":24,"value":3,"fmt":"1%"},
				{"source":11,"target":25,"value":13,"fmt":"6%"}
			]},
			"Business Administration",
			224,
			337,
			561
		];
		create_chart(results);
	};
	init();

}());