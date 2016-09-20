(function () {

var units = "Students";
var palette = ['#aa6', '#f90', '#d6a', '#a6d', '#f0f', '#6da', '#ad6', '#a66', '#a6a', '#66a', '#6ad', '#0dc', '#b3a', '#0df', '#6a0', '#f3a', '#6a6', '#6aa', '#da6', '#00f', '#0af', '#f00', '#0f3', '#60f', '#fe0', '#06a'];
var fromcode = 'buseco';
var tocode = 'busadm';
var threshold = 1;
var fromtoboth = 'both';
var svg;
	var log = {'value': '', 'listto': [], 'listfrom': [], 'pivot': null, 'list': []};
	var cs = {
		'college_map': {},
		'major_map': {},
		'filter_campus': 'East Bay',
		'filter_college': 'College of Business and Economics',
		'filter_major': 'Business Administration',
		'retained_data': null
	};
	var campus_list = [];
$('#fromselector').on('change', function (e) {
	fromcode = e.target.value;
	cs.filter_college = fromcode;
	create_major_selector(cs.major_map, cs.college_map, fromcode);
});
	
$('#toselector').on('change', function (e) {
	tocode = e.target.value;
	cs.filter_major = tocode;
	create_fromtoboth_selector();
});
	
$('#otherselector').on('change', function (e) {
	threshold = parseInt(e.target.value, 10);
});

$('#fromtobothselector').on('change', function (e) {
	fromtoboth = e.target.value;
	//console.log(fromtoboth);
	//$('#fromtobothselector').val(fromtoboth);
});

var ingest = function (nodelist, threshold) {
	var gnodes = [];
	var glinks = []
	var map = {};
	var mapfrom = {};
	var mapdest = {};
	var j = 0;
	var jj = 0;
	var last;
	var otherlist = [];
	var pivot;
	var totalto = 0;
	var totalfrom = 0;
	var thresholdto = threshold; // both to/from same for now
	var thresholdfrom = threshold;
	var countto = 0;
	var countfrom = 0;
	var countpivot = 0;
	var tenthto = 0;
	var tenthfrom = 0;
	var topten = 9;
	nodelist.forEach(function (node) {
		if (node.Flow === 'to' && node.Source !== node.Destination) {
			totalto += node.Students;
			countto += 1;
			if (countto === topten) {
				tenthto = countto;
				thresholdto = node.Students;
			}
		} else if (node.Source !== node.Destination) {
			totalfrom += node.Students;
			countfrom += 1;
			if (countfrom === topten) {
				tenthfrom = countfrom;
				thresholdfrom = node.Students;
			}
		}
		if (node.Source === node.Destination) {
			totalto += node.Students;
			totalfrom += node.Students;
			countpivot += 1;
		}
	});
	if (threshold !== 1) {
		thresholdto = threshold;
		thresholdfrom = threshold;
	}
	//console.log(JSON.stringify([countto, countfrom, countpivot, tenthto, tenthfrom, thresholdto, thresholdfrom, threshold]));
	if (nodelist[0].Flow === 'to') {
		pivot = nodelist[0].Destination;
	} else {
		pivot = nodelist[0].Source;
	}
	var otherto = {'Source': 'Other', 'Destination': pivot, 'Students': 0, 'Formatted': '%', 'Flow': 'to'};
	var otherfrom = {'Source': pivot, 'Destination': 'Other', 'Students': 0, 'Formatted': '%', 'Flow': 'from'};
	nodelist.forEach(function (node, i, list) {
		if (node.Flow === 'to' && (fromtoboth !== 'from' || node.Source === pivot)) {
			if (node.Students >= thresholdto) {
				node.Formatted = Math.round(node.Students*100.0/totalto) + '%';
				if ((node.Students * 100.0 / totalto) <= 0.95) { // find out how close to 1% to call 1% or <1%
					node.Formatted = '< 1%';
				}
				if (node.Source === pivot) {
					var nf = Math.round(node.Students*100.0/totalfrom) + '%';
					if ((node.Students * 100.0 / totalfrom) <= 0.95) { // find out how close to 1% to call 1% or <1%
						nf = '< 1%';
					}
					node.Formatted += ',' + nf;
				}
				otherlist.push(node);
			} else {
				otherto.Students += node.Students;
				otherto.Formatted = Math.round(otherto.Students*100.0/totalto) + '%';
			}
		}
	});
	if (otherto.Students) {
		otherlist.splice(-1,0,otherto); // place 'Other' prior to last item (so far) which is the pivot item
	}
	nodelist.forEach(function (node, i, list) {
		if (node.Flow === 'from' && fromtoboth !== 'to') {
			if (node.Students >= thresholdfrom) {
				node.Formatted = Math.round(node.Students*100.0/totalfrom) + '%';
				if ((node.Students * 100.0 / totalfrom) <= 0.95) { // find out how close to 1% to call 1% or <1%
					node.Formatted = '< 1%';
				}
				otherlist.push(node);
			} else {
				otherfrom.Students += node.Students;
				otherfrom.Formatted = Math.round(otherfrom.Students*100.0/totalfrom) + '%';
			}
		}
	});
	if (otherfrom.Students) {
		otherlist.push(otherfrom);
	}

	otherlist.forEach(function (node, i, list) {
		if (!mapfrom.hasOwnProperty(node.Source)) {
			mapfrom[node.Source] = j;
			map[node.Source] = jj;
			gnodes.push({'node': j, 'name': node.Source});
			j += 1;
			jj += 1;
			last = node.Source;
		}
	});
	var transition = j - 1;
	otherlist.forEach(function (node, i, list) {
		if (!map.hasOwnProperty(node.Destination)) {
			map[node.Destination] = jj;
			jj += 1;
		}
		if (!mapdest.hasOwnProperty(node.Destination)) {
			mapdest[node.Destination] = j;
			gnodes.push({'node': j, 'name': node.Destination});
			j += 1;
		}
	});
	otherlist.forEach(function (node, i, list) {
		var link = {'source': mapfrom[node.Source], 'target': mapdest[node.Destination], 'value': node.Students, 'fmt': node.Formatted};
		glinks.push(link);
	});
	var sankeydata = {'nodes': gnodes, 'links': glinks};
	return [sankeydata, pivot, totalfrom, totalto, totalto + totalfrom];
};

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

var create_chart = function (src, threshold) {

$('#chart').empty();
var label_nodes = function (name, source, target, y, dy) {
	d3.selectAll('#chart').append('div')
		.attr('class','nodelabel')
		.style('padding','1px')
		.style('width', '324px')
		.style('text-align', source.length ? 'left' : 'right')
		.style('background-color', 'rgba(255,255,255,0.0)')
		.style('position','absolute')
		.style('left', function () {if (source.length) {return '75px'} else {return '408px'}})
		.style('top', function () {return (64 + dy + y) + 'px'})
		.html(function(d) {return '<span>' + name + '</span>'; });		
};

d3.json(src, function (error, nodelist) {

	nodelist = log.list;
	var results = ingest(nodelist, threshold);
	var graph = results[0];
	var base = results[1];
	var totstudents;
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

var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = 795 - margin.left - margin.right,
    height = 320 + totstudents - margin.top - margin.bottom;

var formatNumber = d3.format(",.0f"),    // zero decimal places
    format = function(d) { return formatNumber(d) + " " + units; },
    color = function (n) {return palette[n%palette.length];};//d3.scale.category20();

// append the svg canvas to the page
svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
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
		.style('stroke', function (d) { 
			//return color(d.ty || d.sy); // by position
			var c = color(d.target.name === base ? hasher(d.source.name) : hasher(d.target.name)); // by name hash
			return d3.rgb(c).darker(1);
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
		return d3.rgb(d.color).darker(1);
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
});

}; // end create_chart


	var load_data = function (config, callback) {
			$.ajax({
				url: config.data_url,
				datatype: "json",
				success: function (result) {
					var json_object = (typeof result === 'string')
						? JSON.parse(result)
						: result;
					callback(json_object, config);
				}
			});
	};

	var create_campus_list = function (callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_campuses_by_name.json'};
		load_data(config, function (result, config) {
			//console.log(JSON.stringify(result));
			var out = {};
			Object.keys(result).forEach(function (key) {
				out[result[key]] = key;
			});
			//console.log(JSON.stringify(out));
			callback(Object.keys(result), config);
		});
	};

	var get_major_map = function (campus, callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_majorcode2desc.json'};
		load_data(config, function (result, config) {
			callback(result[campus], config);
		});
	};

	var get_college_map = function (campus, callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_colleges_by_major_code.json'};
		if (cs.retained_data) {
			callback(cs.retained_data[campus], config);
			return;
		}
		load_data(config, function (result, config) {
			cs.retained_data = result;
			callback(result[campus], config);
		});
	};
	
	var get_migrations = function (campus, callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_migration_col_ftf.json'};
		load_data(config, function (result, config) {
			callback(result[campus], config);
		});
	};

	var create_college_selector = function (college_map) {
		var optc = [];
		var out1 = '';
		var selected_college;
		cs.college_map = college_map;
		Object.keys(college_map).forEach(function (el) {
			optc.push(college_map[el]);
		});
		optc.sort();
		optc = optc.filter(function (el, i, a) {return i < 0 || el !== a[i - 1];}); // distinct list
		optc.forEach(function (el) {
			var selected = '';
			if (el === cs.filter_college) {
				selected = 'selected';
				selected_college = el;
			}
			out1 += '<option value="{v0}" {sel}>{v1}</option>'.replace(/{v\d}/g, el).replace('{sel}', selected);
		});
		$('#fromselector').html(out1);
		return selected_college;
	};

	var create_major_selector = function (major_map, college_map, selected_college) {
		var optm = [];
		var out2 = [];
		var selected_major;
		cs.major_map = major_map;
		Object.keys(major_map).forEach(function (el, i, a) {
			if (college_map[el] === selected_college) {
				optm.push(major_map[el]);
			}
		});
		optm.sort();
		optm = optm.filter(function (el, i, a) {return i < 0 || el !== a[i - 1];}); // distinct list
		optm.forEach(function (el) {
			var selected = '';
			if (el === cs.filter_major) {
				selected = 'selected';
				selected_major = el;
			}
			out2.push('<option value="{v0}" {sel}>{v1}</option>'.replace(/{v\d}/g, el).replace('{sel}', selected));
		});
		if (!selected_major) {
			out2[0] = '<option value="{v0}" selected>{v1}</option>'.replace(/{v\d}/g, optm[0]);
			cs.filter_major = optm[0];
		}
		$('#toselector').html(out2.join(''));
		return selected_major;
	};

	var create_fromtoboth_selector = function (hasfrom, hasto) {
		var result3;
		var hasto = false;
		var hasfrom = false;
		var filter_campus = cs.filter_campus;
		var out3 = [];
		get_migrations(filter_campus, function (result3, config) {
			var enrolled_majors = Object.keys(result3.enrolled);
			var graduation_majors = Object.keys(result3.graduation);
			enrolled_majors.forEach(function (code) {
				var item = result3.enrolled[code];
				item.forEach(function (major) {
					if (cs.major_map[major[1]] === cs.filter_major && cs.college_map[major[1]] === cs.filter_college) {
						hasfrom = true;
					}
				});
			});
			graduation_majors.forEach(function (code) {
				var item = result3.graduation[code];
				item.forEach(function (major) {
					if (cs.major_map[major[0]] === cs.filter_major && cs.college_map[major[0]] === cs.filter_college) {
						hasto = true;
					}
				});
			});
			var template = '<option value="{v}">{t}</option>';
			if (hasfrom && hasto) {
				out3.push(template.replace('{v}', 'both').replace('{t}','Both From and To'));
			}
			if (hasfrom) {
				out3.push(template.replace('{v}', 'from').replace('{t}','From Only'));
			}
			if (hasto) {
				out3.push(template.replace('{v}', 'to').replace('{t}','To Only'));
			}
			$('#fromtobothselector').html(out3.join(''));
			//fromtoboth = $('#fromtobothselector').val();
		});
	};

	var init = function (filter_campus, filter_college, filter_major) { // initially and on change of campus
		log = {'value': '', 'listto': [], 'listfrom': [], 'pivot': null, 'list': []};
		create_campus_list(function (result, config) {
		//	console.log(JSON.stringify(result));
		});
		get_college_map(filter_campus, function (college_map, config) {
			var selected_college = create_college_selector(college_map); // once per campus
			get_major_map(filter_campus, function (major_map, config) { // initially and on change of college
				var selected_major = create_major_selector(major_map, college_map, selected_college);

				var pivot = null;
				var listfrom = [];
				var listto = [];
				get_migrations(filter_campus, function (result3, config) {
					var enrolled_majors = Object.keys(result3.enrolled);
					var graduation_majors = Object.keys(result3.graduation);
					enrolled_majors.forEach(function (code) {
						var item = result3.enrolled[code];
						item.forEach(function (major) {
							if (major_map[major[1]] === cs.filter_major && college_map[major[1]] === cs.filter_college) {
								if (major_map[major[1]] === major_map[major[0]]) {
									pivot = {'Source': major_map[major[1]], 'Destination': major_map[major[0]], 'Students': parseInt(major[2],10), 'Formatted': '%', 'Flow': 'to'};
								} else {
									listfrom.push({'Source': major_map[major[1]], 'Destination': major_map[major[0]], 'Students': parseInt(major[2],10), 'Formatted': '%', 'Flow': 'from'});
								}
							}
						});
					});
					graduation_majors.forEach(function (code) {
						var item = result3.graduation[code];
						item.forEach(function (major) {
							if (major_map[major[0]] === cs.filter_major && college_map[major[0]] === cs.filter_college) {
								if (major_map[major[1]] !== major_map[major[0]]) {
									listto.push({'Source': major_map[major[1]], 'Destination': major_map[major[0]], 'Students': parseInt(major[2],10), 'Formatted': '%', 'Flow': 'to'});
								} else if (pivot === null) {
									pivot = {'Source': major_map[major[1]], 'Destination': major_map[major[0]], 'Students': parseInt(major[2],10), 'Formatted': '%', 'Flow': 'to'};
								}
							}
						});
					});

					var list = [];
					var studentsort = function (a,b) {return parseInt(b.Students,10) - parseInt(a.Students,10);};
					if (!!listto) {
						listto.sort(studentsort);
						list = list.concat(listto);
					}
					if (!!pivot) {
						list = list.concat(pivot);
					}
					if (!!listfrom) {
						listfrom.sort(studentsort);
						list = list.concat(listfrom);
					}

					log.list = list;
					create_chart('', threshold);
				});
			});
		});
	};
init(cs.filter_campus, cs.filter_college, cs.filter_major);

$('#create_chart').on('click', function (e) {
	e.preventDefault();
	e.stopPropagation();
	init(cs.filter_campus, cs.filter_college, cs.filter_major);
});

}());