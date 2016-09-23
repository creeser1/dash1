(function () {
	'use strict';

	var campusname, fromcode, tocode, threshold, fromtoboth, log, cs, campus_list, datacache = {};

	var ingest = function (nodelist, threshold) {
		threshold = 1; // remove user choice, just use count of 9th ranked as threshold
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
					thresholdto = Math.max(2, node.Students);
				}
			} else if (node.Source !== node.Destination) {
				totalfrom += node.Students;
				countfrom += 1;
				if (countfrom === topten) {
					tenthfrom = countfrom;
					thresholdfrom = Math.max(2, node.Students);
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
		if (nodelist[0].Flow === 'to') {
			pivot = nodelist[0].Destination;
		} else {
			pivot = nodelist[0].Source;
		}
		var otherto = {'Source': 'Other', 'Destination': pivot, 'Students': 0, 'Formatted': '%', 'Flow': 'to'};
		var otherfrom = {'Source': pivot, 'Destination': 'Other', 'Students': 0, 'Formatted': '%', 'Flow': 'from'};
		nodelist.forEach(function (node, i, list) {
			if (node.Flow === 'to' && (fromtoboth !== 'From Only' || node.Source === pivot)) {
				if (node.Students >= thresholdto) {
					node.Formatted = Math.round(node.Students * 100.0 / totalto) + '%';
					if ((node.Students * 100.0 / totalto) <= 0.95) { // find out how close to 1% to call 1% or <1%
						node.Formatted = '< 1%';
					}
					if (node.Source === pivot) {
						var nf = Math.round(node.Students * 100.0 / totalfrom) + '%';
						if ((node.Students * 100.0 / totalfrom) <= 0.95) { // find out how close to 1% to call 1% or <1%
							nf = '< 1%';
						}
						node.Formatted += ',' + nf;
					}
					otherlist.push(node);
				} else {
					otherto.Students += node.Students;
					otherto.Formatted = Math.round(otherto.Students * 100.0 / totalto) + '%';
				}
			}
		});
		if (otherto.Students) {
			otherlist.splice(-1, 0, otherto); // place 'Other' prior to last item (so far) which is the pivot item
		}
		nodelist.forEach(function (node, i, list) {
			if (node.Flow === 'from' && fromtoboth !== 'To Only') {
				if (node.Students >= thresholdfrom) {
					node.Formatted = Math.round(node.Students * 100.0 / totalfrom) + '%';
					if ((node.Students * 100.0 / totalfrom) <= 0.95) { // find out how close to 1% to call 1% or <1%
						node.Formatted = '< 1%';
					}
					otherlist.push(node);
				} else {
					otherfrom.Students += node.Students;
					otherfrom.Formatted = Math.round(otherfrom.Students * 100.0 / totalfrom) + '%';
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

	var load_data = function (config, callback) {
		if (datacache.hasOwnProperty(config.data_url)) {
			callback(datacache[config.data_url], config);
		} else {
			$.ajax({
				url: config.data_url,
				datatype: "json",
				success: function (result) {
					var json_object = (typeof result === 'string')
						? JSON.parse(result)
						: result;
					datacache[config.data_url] = json_object;
					callback(json_object, config);
				}
			});
		}
	};

	var create_campus_list = function (callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_campuses_by_name.json'};
		load_data(config, function (result) {
			callback(Object.keys(result));
		});
	};

	var get_major_map = function (campus, callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_majorcode2desc.json'};
		load_data(config, function (result) {
			callback(result[campus]);
		});
	};

	var get_college_map = function (campus, callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_colleges_by_major_code.json'};
		load_data(config, function (result) {
			callback(result[campus]);
		});
	};
	
	var get_migrations = function (campus, callback) {
		var config = {'data_url': '/data/sankey/data/migrationsjson/crr_migration_col_ftf.json'};
		load_data(config, function (result) {
			callback(result[campus]);
		});
	};

	var create_selector = function (list, selected) {
		var options = list.slice();
		options.sort();
		options = _.uniq(options, true);
		var template = '<option value="{v}"{s}>{t}</option>';
		var out = _.map(options, function (el) {
			var tpl = template.replace('{v}', el).replace('{t}', el);
			if (el === selected) {
				return tpl.replace('{s}', ' selected');
			} else {
				return tpl.replace('{s}', '');
			}
		});
		return out.join('');
	};
	
	var create_college_selector = function (list, selected) {
		var sel = selected;
		if (!_.contains(list, selected)) {
			sel = list[0];
		}
		$('#fromselector').html(create_selector(list, sel));
		return sel;
	};

	var create_major_selector = function (list, selected) {
		var sel = selected;
		if (!_.contains(list, selected)) {
			sel = list[0];
		}
		$('#toselector').html(create_selector(list, sel));
		return sel;
	};

	var create_migrations_selector = function (list, selected) {
		var sel = selected;
		if (!_.contains(list, selected)) {
			sel = list[0];
		}
		$('#fromtobothselector').html(create_selector(list, sel));
		return sel;
	};

	var config_controls = function (callback) { // only load data once, but reconfigure cascading controls as needed
		//cs.filter_campus, cs.filter_college, cs.filter_major
		// load the map of colleges by major code for a given campus
		get_college_map(cs.filter_campus, function (college_map) {
			// given a campus, populate dropdown with college_of values
			if (_.size(college_map)) {
				// populate the dropdown and return the item selected (same as before change of campus if possible)
				var college_list = _.toArray(college_map);
				console.log(JSON.stringify(college_list));
				var selected_college = create_college_selector(college_list, cs.filter_college);
				cs.filter_college = selected_college;
				// given a campus and college_of at that campus, populate dropdown with majors
				get_major_map(cs.filter_campus, function (major_map) {
					var major_code_list = _.filter(Object.keys(major_map), function (key) {
						return (college_map[key] === selected_college);
					});
					console.log(JSON.stringify(major_code_list)); // the major codes
					var major_name_list = _.filter(major_map, function (val, key) {
						return (college_map[key] === selected_college);
					});
					console.log(JSON.stringify(major_name_list)); // the major codes
					var selected_major = create_major_selector(major_name_list, cs.filter_major);
					cs.filter_major = selected_major;
					if (_.size(major_name_list)) {
						get_migrations(cs.filter_campus, function (migrations) {
							var option_list = [];
							if (_.size(migrations['enrolled'])) {
								option_list.push('From Only');
								if (_.size(migrations['graduation'])) {
									option_list.push('To Only');
									option_list.push('Both From and To');
								}
							} else if (_.size(migrations['graduation'])) {
								option_list.push('To Only');
							}
							var selected_migrations = create_migrations_selector(option_list, cs.filter_migrations);
							cs.filter_migrations = selected_migrations;
							fromtoboth = selected_migrations; // Redundant?
							console.log(JSON.stringify(migrations));
							if (callback) {
								callback(college_map, major_map, migrations);
							}
						});
					}
				});
			}
		});
	};

	var config_chart = function (college_map, major_map, migrations, callback) { // initially and on change of campus
		log = {'value': '', 'listto': [], 'listfrom': [], 'pivot': null, 'list': []};

		var pivot = null;
		var listfrom = [];
		var listto = [];
		var enrolled_majors = Object.keys(migrations.enrolled);
		var graduation_majors = Object.keys(migrations.graduation);
		enrolled_majors.forEach(function (code) {
			var item = migrations.enrolled[code];
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
			var item = migrations.graduation[code];
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
		var studentsort1 = function (a, b) {
			var cmp = parseInt(b.Students, 10) - parseInt(a.Students, 10);
			if (cmp === 0) {
				if (a.Source === b.Source) {
					return 0;
				} else if (a.Source > b.Source) {
					return 1;
				} else {
					return -1;
				}
			}
			return cmp;
		};
		var studentsort2 = function (a, b) {
			var cmp = parseInt(b.Students, 10) - parseInt(a.Students, 10);
			if (cmp === 0) {
				if (a.Destination === b.Destination) {
					return 0;
				} else if (a.Destination > b.Destination) {
					return 1;
				} else {
					return -1;
				}
			}
			return cmp;
		};
		if (!!listto) {
			listto.sort(studentsort1);
			list = list.concat(listto);
		}
		if (!!pivot) {
			list = list.concat(pivot);
		}
		if (!!listfrom) {
			listfrom.sort(studentsort2);
			list = list.concat(listfrom);
		}

		log.list = list;
		var results = ingest(log.list, threshold);
		callback([results, log.list]);
	};

	var build_table = function (data) {
		var row_tpl = '\n\n<tr><td>{enrolled}</td><td>{graduated}</td><td>{count}</td></tr>';
		var rows = [];		
		rows.push('<table class="data1">');
		rows.push('<thead><tr><th>Major at Entry</th><th>Major at Graduation</th><th># Students</th></tr></thead><tbody>');
		data.forEach(function (row) {
			rows.push(
				row_tpl.replace('{enrolled}', row.Source)
					.replace('{graduated}', row.Destination)
					.replace('{count}', row.Students)
			);
		});

		rows.push('</tbody></table>');
		return rows.join('');
	};

	var init = function () {
		campusname = 'East Bay';
		fromcode = 'buseco';
		tocode = 'busadm';
		threshold = 1;
		fromtoboth = 'Both From and To';
		log = {'value': '', 'listto': [], 'listfrom': [], 'pivot': null, 'list': []};
		cs = {
			'college_map': {},
			'major_map': {},
			'filter_campus': 'East Bay',
			'filter_college': 'College of Business and Economics',
			'filter_major': 'Business Administration',
			'filter_migration': 'Both From and To'
		};
		campus_list = [];

		$('#campusselector').on('change', function (e) {
			campusname = e.target.value;
			cs.filter_campus = campusname;
			config_controls();
		});

		$('#fromselector').on('change', function (e) {
			fromcode = e.target.value;
			cs.filter_college = fromcode;
			config_controls();
		});
			
		$('#toselector').on('change', function (e) {
			tocode = e.target.value;
			cs.filter_major = tocode;
			config_controls();
		});

		$('#fromtobothselector').on('change', function (e) {
			fromtoboth = e.target.value;
		});

		// create the chart initially, using default filters
		config_controls(function (college_map, majors_map, migrations) {
			config_chart(college_map, majors_map, migrations, function (chart_config) {
				$('#table').empty();
				$('<div id="migration_table">' + build_table(chart_config[1]) + '</div>').appendTo('#table');
				$('body').trigger('create_chart', {'chart_config': chart_config[0]});
			});
		});

		// create the chart on request, using current filter settings
		$('#gobtn').on('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			config_controls(function (college_map, majors_map, migrations) {
				config_chart(college_map, majors_map, migrations, function (chart_config) {
					$('#table').empty();
					$('<div id="migration_table">' + build_table(chart_config[1]) + '</div>').appendTo('#table');
					$('body').trigger('create_chart', {'chart_config': chart_config[0]});
				});
			});
		});
	};
	init();
}());