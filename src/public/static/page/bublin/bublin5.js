(function () {
	'use strict';

	var cs = { // chart_state
		dimension_map_ftf_6yr: {'x': ['gradrate', 25, 80], 'y': ['gap', -10, 25], 'radius': ['total', -120, 2400], 'color': ['campus'], 'key': ['campus']}, // alter mapping to switch data-plot dimensions
		dimension_map_ftf_4yr: {'x': ['gradrate', 5, 45], 'y': ['gap', -10, 20], 'radius': ['total', -120, 2400], 'color': ['campus'], 'key': ['campus']}, // alter mapping to switch data-plot dimensions
		dimension_map_tr_4yr: {'x': ['gradrate', 45, 85], 'y': ['gap', -10, 20], 'radius': ['total', -120, 2400], 'color': ['campus'], 'key': ['campus']},
		dimension_map_tr_2yr: {'x': ['gradrate', 5, 55], 'y': ['gap', -10, 20], 'radius': ['total', -120, 2400], 'color': ['campus'], 'key': ['campus']},
		dimension_map: {'x': ['gradrate', 25, 80], 'y': ['gap', -10, 25], 'radius': ['total', -120, 2400], 'color': ['campus'], 'key': ['campus']},
		margin: {top: 85, right: 240, bottom: 80, left: 60},
		min_width: 300,
		width: 880, // is recalculated 
		height: 420,
		radius: 30,
		scale: {'x': 0, 'y': 0, 'radius': 0, 'color': 0},
		fmt_percent: d3.format('.0%'),
		label: {'gradrate': 'Graduation Rate', 'gap': 'Achievement Gap', 'year': '2000', 'pell': 'Pell'},
		year_start: 2000,
		year_end: 2009,
		chart_title: 'First Time Freshman',
		chart_subtitle: '6yr Grad Rate',
		data_url: 'data/bublin_campus_6yr_ftf.json',
		data_url_ftf_6yr: 'data/bublin_campus_6yr_ftf.json',
		data_url_ftf_4yr: 'data/bublin_campus_4yr_ftf.json',
		data_url_tr_4yr: 'data/bublin_campus_4yr_tr.json',
		data_url_tr_2yr: 'data/bublin_campus_2yr_tr.json',
		year_start_ftf_6yr: 2000,
		year_end_ftf_6yr: 2009,
		year_start_tr_4yr: 2000,
		year_end_tr_4yr: 2011,
		year_start_ftf_4yr: 2000,
		year_end_ftf_4yr: 2011,
		year_start_tr_2yr: 2000,
		year_end_tr_2yr: 2013,
		chart_title_ftf_6yr: 'First Time Freshman',
		chart_subtitle_ftf_6yr: '6yr Grad Rate',
		chart_title_tr_4yr: 'Transfer',
		chart_subtitle_tr_4yr: '4yr Grad Rate',
		chart_title_ftf_4yr: 'First Time Freshman',
		chart_subtitle_ftf_4yr: '4yr Grad Rate',
		chart_title_tr_2yr: 'Transfer',
		chart_subtitle_tr_2yr: '2yr Grad Rate',
		duration: 12000,
		templates: {
			tooltip: 'Achievement Gap:\u00A0\u00A0{gap}%\nGraduation Rate:\u00A0\u00A0{gradrate}%\nTotal FTF Freshmen:\u00A0\u00A0{ftf}\nPercent Pell:\u00A0\u00A0{pell}%\n'
		},
		campuses: {
			'Bakersfield': {selected: false, ord: 1, labelx: 40, labely: 54.9},
			'Channel Islands': {selected: false, ord: 2, labelx: 25, labely: 54.9},
			'Chico': {selected: false, ord: 3, labelx: 66, labely: 54.9},
			'Dominguez Hills': {selected: false, ord: 4, labelx: 26, labely: 54.9},
			'East Bay': {selected: false, ord: 5, labelx: 47, labely: 54.9},
			'Fresno': {selected: false, ord: 6, labelx: 60, labely: 54.9},
			'Fullerton': {selected: false, ord: 7, labelx: 62, labely: 54.9},
			'Humboldt': {selected: false, ord: 8, labelx: 45, labely: 54.9},
			'Long Beach': {selected: false, ord: 9, labelx: 55, labely: 54.9},
			'Los Angeles': {selected: false, ord: 10, labelx: 43, labely: 54.9},
			'Maritime Academy': {selected: false, ord: 11, labelx: 15, labely: 54.9},
			'Monterey Bay': {selected: false, ord: 12, labelx: 31, labely: 54.9},
			'Northridge': {selected: false, ord: 13, labelx: 56, labely: 54.9},
			'Pomona': {selected: false, ord: 14, labelx: 62, labely: 54.9},
			'Sacramento': {selected: false, ord: 15, labelx: 49, labely: 54.9},
			'San Bernardino': {selected: false, ord: 16, labelx: 37, labely: 54.9},
			'San Diego': {selected: false, ord: 17, labelx: 57, labely: 54.9},
			'San Francisco': {selected: false, ord: 18, labelx: 43, labely: 54.9},
			'San Jose': {selected: false, ord: 19, labelx: 58, labely: 54.9},
			'San Luis Obispo': {selected: false, ord: 20, labelx: 45, labely: 54.9},
			'San Marcos': {selected: false, ord: 21, labelx: 40, labely: 54.9},
			'Sonoma': {selected: false, ord: 22, labelx: 55, labely: 54.9},
			'Stanislaus': {selected: false, ord: 23, labelx: 45, labely: 54.9}
		},
		selected_color: '#c00',
		'yvalue': 'gap',
		'palette': ["#f00", "#0f3", "#00f", "#0df", "#f0f", "#fe0", "#f90", "#b3a", "#f3a", "#60f", "#0af", "#0dc", "#6da", "#6ad", "#a6d", "#ad6", "#da6", "#d6a", "#6a6", "#a6a", "#a66", "#66a", "#aa6", "#6aa", "#06a", "#6a0"],
		retained_data: null,
		done: false
	};
	var tabid = 'chart';
	var config;
	var svg;
	var floaters = {};
	var series_state;

	// use jquery to make an absolute positioned element draggable (repositionable)
	// Usage: $('#some-selector').draggable(callback) where callback function receives delta-x and delta-y as arguments
	$.fn.draggable = function(callback){
		var $this = this,
		ns = 'draggable_'+(Math.random()+'').replace('.',''),
		mm = 'mousemove.'+ns,
		mu = 'mouseup.'+ns,
		$w = $(window),
		isFixed = ($this.css('position') === 'fixed'),
		adjX = 0, adjY = 0;

		$this.mousedown(function(ev){
			var leftoffset = 40.0 + ($(window).width() - 1180)/2.0;
			console.log($(window).width());
			var pos = $this.offset();
			var xbeg = $this.css('left');
			var ybeg = $this.css('top');
			if (isFixed) {
				adjX = $w.scrollLeft(); adjY = $w.scrollTop();
			}
			var ox = (ev.pageX - pos.left + leftoffset), oy = (ev.pageY - pos.top + 363);
			$this.data(ns,{ x : ox, y: oy });
			$w.on(mm, function(ev){
				ev.preventDefault();
				ev.stopPropagation();
				if (isFixed) {
					adjX = $w.scrollLeft(); adjY = $w.scrollTop();
				}
				var offset = $this.data(ns);
				$this.css({left: ev.pageX - adjX - offset.x, top: ev.pageY - adjY - offset.y});
			});
			$w.on(mu, function(){
				$w.off(mm + ' ' + mu).removeData(ns);
				callback(parseFloat($this.css('left')) - parseFloat(xbeg), parseFloat($this.css('top')) - parseFloat(ybeg));
			});
		});

		return this;
	};

	// Various accessors that specify the four dimensions of data to visualize.
	var x = function (d) {
		return d[cs.dimension_map.x[0]];
	};
	var y = function (d) {
		return d[cs.dimension_map.y[0]];
	};
	var radius = function (d) {
		return d[cs.dimension_map.radius[0]];
	};
	var xcolor = function (d) {
		return d[cs.dimension_map.color[0]];
	};
	var key = function (d) {
		return d[cs.dimension_map.key[0]];
	};

	var maketag = function (campus) {
		var tag = 'tag' + campus.replace(/\s+/g, '');
		//console.log('making tab for ' + campus + ' ' + tag);
		return tag;
	};

	var build_chart = function () {
		// Create the SVG container and set the origin.
		var svg = d3.select('#chart1-plotarea').append('svg')
			.attr('width', cs.width + cs.margin.left + cs.margin.right)
			.attr('height', cs.height + cs.margin.top + cs.margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + cs.margin.left + ',' + cs.margin.top + ')');

		// Create the Axes
		var xTicks = cs.width < 400 ? 6 : 12;
		var xAxis = d3.svg.axis().orient('bottom').scale(cs.scale.x).ticks(xTicks).tickFormat(function (d) {
			return parseInt(d, 10) + '%';
		}).tickSize(-cs.height - 6);
		
		var yAxis = d3.svg.axis().scale(cs.scale.y).orient('left').tickFormat(function (d) {
			return parseInt(d, 10) + '%';
		}).tickSize(-cs.width - 6);
		
		// Add the x-axis.
		svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + (cs.height + 6) + ')')
			.call(xAxis);

		// Add the y-axis.
		svg.append('g')
			.attr('class', 'y axis')
			.attr('transform', 'translate(-6, 0)')
			.call(yAxis);

		// Add an x-axis label.
		svg.append('text')
			.attr('class', 'x label')
			.attr('text-anchor', 'end')
			.attr('x', cs.width)
			.attr('y', cs.height + 38)
			.text(cs.label[cs.dimension_map.x[0]]);

		// Add a y-axis label.
		svg.append('text')
			.attr('class', 'y label')
			.attr('text-anchor', 'end')
			.attr('y', -52)
			.attr('dy', '.75em')
			.attr('transform', 'rotate(-90)')
			.text(cs.label[cs.dimension_map.y[0]]);

		return svg;
	};

	var create_tooltip = function () {
		//Tooltip
		var tooltip = d3.select('#chart1')
			.append('div')
			.attr('class', 'tooltipx');
		return tooltip;
	};
	var tooltip = create_tooltip();

	var display_tooltip = function (d, tooltip) {
		tooltip.html('');
		tooltip.append('span').attr('class', 'tooltip_titlex')
			.style('background-color', cs.scale.color(xcolor(d)));
		tooltip.append('span').attr('class', 'tooltip_bodyx');
		tooltip.select('.tooltip_titlex').html('<span class="ttitle"><span class="tcampusx">' + d.campus + '</span><span>');
		
		tooltip.select('.tooltip_bodyx')
			.text(cs.templates.tooltip
				.replace('{gap}', Math.round(d.gap))
				.replace('{gradrate}', Math.round(d.gradrate))
				.replace('{ftf}', Math.round(d.total))
				.replace('{pell}', Math.round(d.pell))
			);

		tooltip.style('visibility', 'visible');
	};
	
	var create_floating_label = function (campus) {
		//Floating label
		var floater = d3.select('#chart1-plotarea')
			.append('div')
			.attr('class', 'floater') // similar to tooltip
			.attr('id', maketag(campus) + '_f')
			.text(campus);
		return floater;
	};
	var tooltips = [];
	var tt = {};
	var hide_tooltips = function () {
		Object.keys(tt).forEach(function (key) {
			tooltips[tt[key]].style('visibility', 'hidden');
		});
	};
	// Positions the dots based on data.
	var position = function (dot) {
		var csc = cs.campuses;
		var scale = cs.scale;
		dot.each(function (d) {
			var r = scale.radius(radius(d));
			if (csc[d.campus].selected) {
				var fs, top, left, dc = d.campus;
				fs = floaters[dc][0][0];
				top = (csc[dc].labely + scale.y(y(d)) - r) + 'px';
				left = (csc[dc].labelx + scale.x(x(d)) - r) + 'px';
				fs.style.top = top;
				fs.style.left = left;
				fs.style.visibility = parseInt(left, 10) > -30 ? 'visible' : 'hidden';
			}
			d3.select(this)
				.attr('cx', scale.x(x(d)))
				.attr('cy', scale.y(y(d)))
				.attr('r', r);
		});
	};

	// Defines a sort order so that the smallest dots are drawn on top.
	var order = function (a, b) {
		var max = 4100000000;
		var aa = cs.campuses[a.campus].selected ? max : max + max; // force selected campus dots to rise to top of z-order
		var bb = cs.campuses[b.campus].selected ? max : max + max;
		return radius(b) + bb - radius(a) - aa;
	};

	var reposition = function () {
		// Add a dot per item. Initialize the data and set the colors.
		d3.selectAll('.dot')
		.call(position)
		.sort(order);
	};

	var apply_selection = function () {
		// sync legend
		d3.selectAll('.legend').remove();
		create_legend(svg, cs.retained_data); // recreate to apply font-weight to selected campuses
		// sync dots
		Object.keys(cs.campuses).forEach(function (el) {
			if (cs.campuses[el].selected) {
				d3.selectAll('#' + maketag(el)).style('opacity', 1).style('stroke-width', 1).style('stroke', '#111');
			} else {
				d3.selectAll('#' + maketag(el)).style('opacity', 0.2).style('stroke', 'none');
			}
			if (floaters.hasOwnProperty(el)) {
				floaters[el][0][0].style.visibility = cs.campuses[el].selected ? 'visible' : 'hidden';
			}
		});
		reposition();
		update_series();
	};

	var plot_data = function (svg, data) {
		$('.chart-title h1').text(cs.chart_title);
		$('.chart-title h2').text(cs.chart_subtitle);
		$('#slider').attr('min', cs.year_start);
		$('#slider').attr('max', cs.year_end);
		$('#slider').val(parseInt(cs.year_start, 10));

		// Add the year label; the value is set on transition.
		var label = svg.append('text')
			.attr('class', 'year label')
			.attr('text-anchor', 'end')
			.attr('y', cs.height - 35)
			.attr('x', cs.width - 15)
			.text(cs.label.year);

		// Tweens the entire chart by first tweening the year, and then the data.
		// For the interpolated data, the dots and label are redrawn.
		var tweenYear = function () {
			var year = d3.interpolateNumber(cs.year_start, cs.year_end);
			return function(t) {
				displayYear(year(t));
			};
		};

		// Updates the display to show the specified year.
		var displayYear = function (year) {
			dot.data(interpolateData(year), key).call(position).sort(order);
			label.text(Math.round(year));
			$('#slider').val(Math.round(year));
		};

		// Interpolates the dataset for the given (fractional) year.
		var interpolateData = function (year) {
			return data.map(function (d) {
				return {
					campus: d.campus,
					pell: interpolateValues(d.pell, year),
					gradrate: interpolateValues(d.gradrate, year),
					gap: interpolateValues(d.gap, year),
					total: interpolateValues(d.total, year),
				};
			});
		};

		// A bisector since many item's data is sparsely-defined.
		var bisect = d3.bisector(function (d) {
			return d[0];
		});

		// Finds (and possibly interpolates) the value for the specified year.
		var interpolateValues = function (values, year) {
			var i = bisect.left(values, year, 0, values.length - 1);
			var a = values[i];
			if (i > 0) {
				var b = values[i - 1];
				var t = (year - a[0]) / (b[0] - a[0]);
				return a[1] * (1 - t) + b[1] * t;
			}
			return a[1];
		};

		// Add a dot per item. Initialize the data and set the colors.
		var dot = svg.append('g')
			.attr('class', 'dots')
			.selectAll('.dot')
			.data(interpolateData(cs.year_start))
			.enter().append('circle')
			.attr('class', 'dot')
			.attr('id', function (d) {return maketag(d.campus); })
			.style('fill', function (d) { return cs.scale.color(xcolor(d)); })
			.style('stroke', function (d) {
				return cs.scale.color(xcolor(d));
			})
			.each(function (d) {
				floaters[d.campus] = create_floating_label(d.campus);
				$(floaters[d.campus][0][0]).draggable(function (dx, dy) {
					cs.campuses[d.campus].labelx += dx;
					cs.campuses[d.campus].labely += dy;
				});
			})
			.call(position)
			.sort(order)
			.on('mouseover', function (d) {
				display_tooltip(d, tooltip);
			})
			.on('click', function (d) { // allow clicking on dot to toggle selection
				cs.campuses[d.campus].selected = !cs.campuses[d.campus].selected; // perform toggle
				apply_selection(); // apply to legend, dot style and dot order
			})
			.on('mousemove', function () {
				return tooltip.style('top', (d3.event.pageY - 52) + 'px').style('left', (d3.event.pageX + 25) + 'px');
			})
			.on('mouseout', function () {
				return tooltip.style('visibility', 'hidden');
			});

		var update = function () {
			cs.done = false;
			// inline here for performance rather than calling reposition()
			// Add a dot per item. Initialize the data and set the colors.
			d3.selectAll('.dot')
				.call(position)
				.sort(order);

			// Start a transition that interpolates the data based on year.
			svg.transition()
				.duration(cs.duration)
				.ease('linear')
				.tween('year', tweenYear);

		}; //update function

		$('button').on('click', function () {
			update();
			hide_tooltips();
			var timer1;
			label.text(cs.year_start);
		});
		$('#slider').off();
		$('#slider').on('change', function (){
			svg.transition().duration(cs.duration);
			displayYear($('#slider').val());
		});
		apply_selection();
	};

	var create_legend = function (svg, data) {
		var legend = svg.selectAll('.legend')
			.data(data)
			.enter().append('g')
			.attr('class', 'legend')
			.attr('transform', function (d, i) { return 'translate(20,' + i * 17.7 + ')'; });

		legend.append('rect')
			.attr('class', 'legendrect')
			.attr('x', cs.width)
			.attr('width', 12)
			.attr('height', 12)
			.style('fill', function(d) { return cs.scale.color(xcolor(d)); });

		legend.append('text')
			.attr('x', cs.width + 16)
			.attr('y', 5)
			.attr('dy', 7)
			.style('font-size', '13px').style('opacity', 1)
			.style('font-weight', function (d) {return (cs.campuses[d.campus].selected ? '800' : '400');})
			.text(function (d) { return d.campus; });

		legend.on('mouseover', function (d) {
			d3.selectAll('.legend')
				.style('opacity', 0.7);
			var _this = this;
			d3.select(_this)
				.style('opacity', 1);
			d3.selectAll('.dot')
				.style('opacity', function (d) {
					return (cs.campuses[d.campus].selected
						? 1
						: .2)
				});
			
			if (cs.campuses[d.campus].selected) { // indicate already selected with thicker stroke on legend campus mouseover
				d3.select('#' + maketag(d.campus))
					.style('stroke-width', 2).style('stroke', '#111');
			}
			d3.select('#' + maketag(d.campus))
				.style('opacity', 1);
		})
		.on('click', function (d, i) {
			cs.campuses[d.campus].selected = !cs.campuses[d.campus].selected; // perform toggle
			apply_selection(); // apply to legend, dot style and dot order
		})
		.on('mouseout', function(type) {
				d3.selectAll('.legend')
					.style('opacity', 1);
				d3.selectAll('.dot')
					.style('opacity', 1);
				apply_selection();
		});
	};

	//var retained_data;
	var load_data = function (url, callback) {
		if (cs.retained_data !== null) {
			callback(cs.retained_data);
		} else {
			d3.json(url, function (data) {
				cs.retained_data = data;
				callback(data);
			});
		}
	};

	var init_bubble = function (callback) {
		cs.scale.x = d3.scale.linear().domain(cs.dimension_map.x.slice(1)).range([0, cs.width]);
		cs.scale.y = d3.scale.linear().domain(cs.dimension_map.y.slice(1)).range([cs.height, 0]);
		cs.scale.radius = d3.scale.sqrt().domain(cs.dimension_map.radius.slice(1)).range([0, cs.radius]);
		cs.scale.color = function (d) {return cs.palette[cs.campuses[d].ord - 1];};
		// above function returns color mapped to campus, formerly d3.scale.category20()

		// once the data is completely loaded, plot data points and generate legend
		load_data(cs.data_url, function (data) {
			$('#chart1-plotarea').empty(); // remove old svg before recreating at different size
			svg = build_chart();
			create_legend(svg, data);
			plot_data(svg, data);
			callback();
		});
	};

	/*
	 * Begin Line Chart
	 */

	Highcharts.setOptions({
		colors: cs.palette
	});
	var series_state = {};

	var create_chart = function (config, data) {
		var fmt1 = config.tooltip_label + ': {point.y:.0f}%<br/>Campus: {series.name}';
		var txt1 = config.axis_y_title;
		$('#chart0').highcharts({
			credits: {
				enabled: false
			},
			chart: {
				type: 'line',
				width: 1050,
				height: 550
			},
			title: {
				text: cs.chart_title
			},
			subtitle: {
				text: cs.chart_subtitle
			},
			xAxis: {
				type: 'category',
				labels: {
					style: {
						fontSize: '13px',
						fontFamily: 'Verdana, sans-serif'
					}
				}
			},
			yAxis: {
				title: {
					text: txt1
				}
			},
			tooltip: {
				pointFormat: fmt1
			},
			legend: {
				title: {style: {'color': '#777'}, text: '(Click to show/hide campuses)'},
				layout: 'horizontal',
				align: 'center',
				verticalAlign: 'bottom',
				itemWidth: 200,
				labelFormatter: function () {
					var name = this.name;
					if (name === 'all') { // hide gray LinkedTo all item legend element
						return;
					}
					return name;
				}
			},
			series: data
		});
	};

	var load_data = function (config, callback) {
		$.ajax({
			url: cs.data_url,
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string')
					? JSON.parse(result)
					: result;
				// Ensure dataset is sorted by campus name
				json_object.sort(function (a, b) {
					return a.campus < b.campus ? -1 : a.campus > b.campus ? 1 : 0;
				});
				cs.retained_data = json_object;
				callback(json_object, config);
			}
		});
	};

	var update_series = function (mode) {
		var pchart = $('#chart0').highcharts();
		if (pchart) {
			if (mode) { // save selected
				pchart.series.forEach(function (e) {
					var attributes = e.userOptions;
					if (attributes.zIndex === 2) {
						cs.campuses[attributes.name].selected = attributes.visible; // set selected
					}
				});
			} else { // load selected
				pchart.series.forEach(function (e) {
					var attributes = e.userOptions;
					var tf;
					if (attributes.zIndex === 2) {
						tf = (cs.campuses[attributes.name].selected || false); // get selected
						series_state[attributes.name] = tf;
						e.userOptions.visible = tf;
					}
				});
			}
		}
		return series_state;
	};
	
	var update_chart = function (config, callback) {
		load_data(config, function (data, config) {
			$('#chart0').off('click');
			$('#chart0').on('click', function () { // listens for click on trends legend
				update_series(1); // save legend selections to cs
			});
			var multiseries = [];
			var multigray = [];
			var attribute = cs.yvalue;
			var null_series = [];
			series_state = update_series(); // load from cs
			data.forEach(function (campus_data) {
				var series = [];
				var campus = campus_data.campus;
				campus_data[attribute].forEach(function (item, i) {
					var key = item[0]; // year
					if (key <= cs.year_end && key >= cs.year_start) {
						var value = item[1];
						series.push({'name': key, 'y': value});
						if (null_series.length < i) {
							null_series.push(null);
						}
					}
				});
				multiseries.push({'name': campus, 'data': series.slice(), 'zIndex': 2, 'color':cs.palette[cs.campuses[campus].ord - 1], 'lineWidth': 2, 'visible': series_state[campus] || false});
				multigray.push({'name': campus, 'data': series.slice(), 'linkedTo': 'gray', 'color': '#dedede', 'zIndex': 1, 'lineWidth': 1});
			});
			multiseries.push({'name': 'all', 'id': 'gray', 'data': null_series, 'color': 'transparent'});
			create_chart(config, multiseries.concat(multigray));
			if (callback) {
				window.setTimeout(function () {callback();}, 0);
			}
		});
	};

	var display_tab = function (tabid, mode) {
		switch (tabid) {
			case 'explanations':
			break;
			case 'method':
			break;
			case 'table':
			break;
			case 'trends':
				update_chart(config); // get selected
				if ($('#chart0').highcharts()) {
					$('#chart0').highcharts().reflow();
				}
			break;
			case 'chart':
				$('#chart1').hide();
				init_bubble(function () {});
				$('#chart1').show();
			break;
			default:
				$('#chart1').hide();
				init_bubble(function () {});
				$('#chart1').show();
			break;
		}
	};

	var init_trends_chart = function (callback) {
		config = {axis_y_title: '% Achievement Gap', tooltip_label: 'Gap'};
		update_chart(config, callback); // get selected
	};

	$(document).ready(function () {
		cs.campuses['Long Beach'].selected = true; // set default campus
		init_trends_chart(function () {
			$('#chart1 .controls div').css('visibility', 'hidden');
			$('#chart1 button').css('visibility', 'hidden');
			$('#chart1').hide();
			init_bubble(function () {
				//update_series();
				$('#chart1').show();
				$('#chart1 button').css('visibility', 'visible');
				$('#chart1 .controls div').css('visibility', 'visible');
			}); // give bubble a chance to load data first, eliminating duplicate download
		});

		$('#yvalue_selector').on('change', function (e) {
			var value = e.target.value;
			cs.yvalue = {'gap':'gap', 'pell':'pell', 'gradrate':'gradrate'}[value];
			config.axis_y_title = {'gap': '% Achievement Gap', 'pell': '% Pell Eligible Enrollment', 'gradrate': '% 6-Year Grad Rate'}[value];
			config.tooltip_label = {'gap': 'Gap', 'pell': 'Pell Enrollment', 'gradrate': 'Grad Rate'}[value];
			update_chart(config);
		});

		$('#dataset_filter1').on('change', function (e) {
			switch (e.target.value) {
				case 'tr_2yr':
					cs.data_url = cs.data_url_tr_2yr;
					cs.dimension_map = cs.dimension_map_tr_2yr;
					cs.year_start = cs.year_start_tr_2yr;
					cs.year_end = cs.year_end_tr_2yr;
					cs.chart_title = cs.chart_title_tr_2yr;
					cs.chart_subtitle = cs.chart_subtitle_tr_2yr;
				break;
				case 'tr_4yr':
					cs.data_url = cs.data_url_tr_4yr;
					cs.dimension_map = cs.dimension_map_tr_4yr;
					cs.year_start = cs.year_start_tr_4yr;
					cs.year_end = cs.year_end_tr_4yr;
					cs.chart_title = cs.chart_title_tr_4yr;
					cs.chart_subtitle = cs.chart_subtitle_tr_4yr;
				break;
				case 'ftf_4yr':
					cs.data_url = cs.data_url_ftf_4yr;
					cs.dimension_map = cs.dimension_map_ftf_4yr;
					cs.year_start = cs.year_start_ftf_4yr;
					cs.year_end = cs.year_end_ftf_4yr;
					cs.chart_title = cs.chart_title_ftf_4yr;
					cs.chart_subtitle = cs.chart_subtitle_ftf_4yr;
				break;
				case 'ftf_6yr':
					cs.data_url = cs.data_url_ftf_6yr;
					cs.dimension_map = cs.dimension_map_ftf_6yr;
					cs.year_start = cs.year_start_ftf_6yr;
					cs.year_end = cs.year_end_ftf_6yr;
					cs.chart_title = cs.chart_title_ftf_6yr;
					cs.chart_subtitle = cs.chart_subtitle_ftf_6yr;
				break;
				default: // 'ftf_6yr'
					cs.data_url = cs.data_url_ftf_6yr;
					cs.dimension_map = cs.dimension_map_ftf_6yr;
					cs.year_start = cs.year_start_ftf_6yr;
					cs.year_end = cs.year_end_ftf_6yr;
					cs.chart_title = cs.chart_title_ftf_6yr;
					cs.chart_subtitle = cs.chart_subtitle_ftf_6yr;
			}
			if (tabid === 'chart') {
				$('#chart1').hide();
				init_bubble(function () {});
				$('#chart1').show();
			} else if (tabid === 'trends') {
				update_chart(config); // get selected
				if ($('#chart0').highcharts()) {
					$('#chart0').highcharts().reflow();
				}
			}
		});
	});
	$('.nav-tabs a').click(function (e) {
		e.preventDefault();
		e.stopPropagation();
		tabid = e.target.href.replace(/[^#]*#/, '');
		$(this).tab('show');
		display_tab(tabid);
	});

}());