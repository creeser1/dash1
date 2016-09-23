(function () {
	'use strict';

	var units = "Students";
	var palette = ['#aa6', '#ad6', '#d6a', '#a6d', '#f0f', '#6da', '#a66', '#a6a', '#6ad', '#0dc', '#b3a', '#0df', '#6a0', '#f3a', '#6a6', '#6aa', '#da6', '#00f', '#66a', '#f00', '#0f3', '#60f', '#fe0', '#06a', '#0af', '#f90', '#aaa'];
	var svg;
	
	// a helper function for consistently coloring nodes by using a hashing of their text label
	var hasher = function (str, pivot) {
		var cycle = palette.length - 3; // last 3 are reserved for [pivot, undeclared, other]
		if (str === pivot) {
			return cycle + 0;
		} else if (str === 'Undeclared') {
			return cycle + 1;
		} else if (str === 'Other') {
			return cycle + 2;
		}
		var offset = 104;
		var slope = 17.0 / 7.0;
		var normal = str.toUpperCase().replace(/^[A-Z]/g, '');
		var scores = [];
		var score = 0;
		normal.split('').forEach(function (el, i, a) {
			scores.unshift(normal.charCodeAt(i) << 2);
			if (i > 1) {
				scores.push(((normal.charCodeAt(i)) ^ (normal.charCodeAt(i-1) << 1)) ^ normal.charCodeAt(i - 2) << 2);
			}
		});
		scores.forEach(function (el, i) {
			score += el * i * slope;
		});
		return Math.round(score + offset) % cycle;
	};

	// a helper function for creating node labels
	var label_nodes = function (name, source, target, y, dy) {
		d3.selectAll('#migrations_chart').append('div')
			.attr('class', 'nodelabel')
			.style('padding', '1px')
			.style('width', '324px')
			.style('font-weight', '600')
			.style('font-family', 'sans-serif')
			.style('font-size', '14px')
			.style('text-align', source.length ? 'left' : 'right')
			.style('text-shadow', '1px 1px 1px #dddddd')
			.style('background-color', 'rgba(255, 255, 255, 0.0)')
			.style('position', 'absolute')
			.style('left', function () {
				if (source.length) {
					return '100px'; // left labels
				} else {
					return '668px'; // right labels
				}
			})
			.style('top', function () {
				return (dy + y - 2) + 'px';
			})
			.html(function(d) {
				return '<span>' + name + '</span>';
			});
	};

	// create the chart given a node/link map
	var create_chart = function (chartconfig) {
		// first get rid of the old chart if there already is one
		$('#migrations_chart').empty();

		var graph = chartconfig[0];
		var base = chartconfig[1];
		var totstudents;
		var fromtoboth = 'both';
		switch (fromtoboth) {
			case 'from':
				totstudents = chartconfig[2];
				break;
			case 'to':
				totstudents = chartconfig[3];
				break;
			default:
				totstudents = chartconfig[4];
		}

		var margin = {top: 10, right: 30, bottom: 10, left: 30},
			width = 1090 - margin.left - margin.right,
			height = 320 + totstudents - margin.top - margin.bottom;

		var formatNumber = d3.format(",.0f");	// zero decimal places
		var format = function(d) {
			return formatNumber(d) + " " + units;
		};
		var color = function (n) {
			return palette[n % palette.length];
		};	//d3.scale.category20();

		// append the svg canvas to the page
		svg = d3.select("#migrations_chart").append("svg")
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
				var c = color(d.target.name === base ? hasher(d.source.name, base) : hasher(d.target.name, base)); // by name hash
				return d3.rgb(c);
			})
			.on("mouseover", function (d) {
				//console.log(d);
				var c = color(d.target.name === base ? hasher(d.source.name, base) : hasher(d.target.name, base)); // by name hash
				console.log(c);
				this.style.stroke = d3.rgb(c).darker(1);
			})
			.on("mouseout", function (d) {
				var c = color(d.target.name === base ? hasher(d.source.name, base) : hasher(d.target.name, base)); // by name hash
				this.style.stroke = d3.rgb(c);
			})
				.style("stroke-width", function(d) {
				return Math.max(1, d.dy);
			})
			.sort(function(a, b) {
				return b.dy - a.dy;
			});

		// add the link tooltip (titles)
		var totemplate = '{v} of students graduating in {t}\nbegan as {s} students';
		var fromtemplate = '{v} of graduating students who began in {s}\ngraduated in {t}';
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

		// add in the nodes and their labels
		var node = svg.append("g").selectAll(".node")
			.data(graph.nodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { 
				label_nodes(d.name, d.sourceLinks, d.targetLinks, d.y, d.dy / 2);
				return "translate(" + d.x + "," + d.y + ")";
			});

		// add the rectangles and tooltip (titles) for the nodes
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
	}; // end create_chart

	var init = function () { // initially and on change of campus
		$('body').on('create_chart', function (e, obj) {
			create_chart(obj.chart_config);
		});
	};
	init();

}());