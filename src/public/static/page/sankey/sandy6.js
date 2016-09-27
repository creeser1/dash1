(function () {
	'use strict';

	var load_data = (function () {
		var datacache = {}; // in closure
		return function (config, callback) {
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
	}());

	var get_migrations = function (campus, callback) {
		var url = campus.replace(' ', '_') + '_migrations_ftf.json';
		var config = {'data_url': '/data/sankey/newsankeydata/' + url};
		load_data(config, function (result) {
			callback(result);
		});
	};

	/*
	************************************************************
	* Transform loaded data appropriate to driving sankey chart
	*
	************************************************************
	*/

	var formatStudentPercent = function (count, total) {
		var out = Math.round(count * 100.0 / total) + '%';
		if ((count * 100.0 / total) <= 0.95) { // find out how close to 1% to call 1% or <1%
			out = '< 1%';
		}
		return out;
	};

	var build_sankeydata = function (otherlist) {
		var gnodes = [];
		var glinks = [];
		var map = {};
		var mapfrom = {};
		var mapdest = {};
		var j = 0;
		var jj = 0;
		otherlist.forEach(function (node) {
			if (!mapfrom.hasOwnProperty(node.Source)) {
				mapfrom[node.Source] = j;
				map[node.Source] = jj;
				gnodes.push({'node': j, 'name': node.Source});
				j += 1;
				jj += 1;
			}
		});
		otherlist.forEach(function (node) {
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
		otherlist.forEach(function (node) {
			var link = {'source': mapfrom[node.Source], 'target': mapdest[node.Destination], 'value': node.Students, 'fmt': node.Formatted};
			glinks.push(link);
		});
		return {'nodes': gnodes, 'links': glinks};
	};

	var ingest = function (filter, nodelist) {
		var pivot;
		var totalto = 0;
		var totalfrom = 0;
		var thresholdto = 1; // both to/from same for now
		var thresholdfrom = 1;
		var countto = 0;
		var countfrom = 0;
		var countpivot = 0;
		var topten = 9;

		if (nodelist[0].Flow === 'to') {
			pivot = nodelist[0].Destination;
		} else {
			pivot = nodelist[0].Source;
		}
		nodelist.forEach(function (node) {
			if (node.Flow === 'to' && node.Source !== node.Destination) {
				totalto += node.Students;
				countto += 1;
				if (countto === topten) {
					thresholdto = Math.max(2, node.Students);
				}
			} else if (node.Source !== node.Destination) {
				totalfrom += node.Students;
				countfrom += 1;
				if (countfrom === topten) {
					thresholdfrom = Math.max(2, node.Students);
				}
			}
			if (node.Source === node.Destination) {
				totalto += node.Students;
				totalfrom += node.Students;
				countpivot += 1;
				pivot = node.Source; // proved to be pivot
			}
		});

		var otherto = {'Source': 'Other', 'Destination': pivot, 'Students': 0, 'Formatted': '%', 'Flow': 'to'};
		var otherfrom = {'Source': pivot, 'Destination': 'Other', 'Students': 0, 'Formatted': '%', 'Flow': 'from'};
		var otherlist = [];
		nodelist.forEach(function (node) {
			if (node.Flow === 'to' && (filter !== 'From Only' || node.Source === pivot)) {
				if (node.Students >= thresholdto) {
					node.Formatted = formatStudentPercent(node.Students, totalto);
					if (node.Source === pivot) {
						node.Formatted += ',' + formatStudentPercent(node.Students, totalfrom);
					}
					otherlist.push(node);
				} else {
					otherto.Students += node.Students;
					otherto.Formatted = formatStudentPercent(otherto.Students, totalto);
				}
			}
		});
		if (otherto.Students) {
			otherlist.splice(-1, 0, otherto); // place 'Other' prior to last item (so far) which is the pivot item
		}
		nodelist.forEach(function (node) {
			if (node.Flow === 'from' && filter !== 'To Only') {
				if (node.Students >= thresholdfrom) {
					node.Formatted = formatStudentPercent(node.Students, totalfrom);
					otherlist.push(node);
				} else {
					otherfrom.Students += node.Students;
					otherfrom.Formatted = formatStudentPercent(otherfrom.Students, totalfrom);
				}
			}
		});
		if (otherfrom.Students) {
			otherlist.push(otherfrom);
		}
		var sankeydata = build_sankeydata(otherlist);
		return [sankeydata, pivot, totalfrom, totalto, totalto + totalfrom];
	}; // end ingest function

	/*
	************************************************************
	* Create data table and chart configuration/data series 
	* from the data which has been loaded and transformed
	*
	************************************************************
	*/

	var build_table = function (cs, data) {
		var row_tpl = '\n\n<tr><td>{enrolled}</td><td>{graduated}</td><td>{count}</td></tr>';
		var rows = [];		
		rows.push('<table class="data1">');
		rows.push('<thead><tr><th>Major at Entry</th><th>Major at Graduation</th><th># Students</th></tr></thead><tbody>');
		data.forEach(function (row) {
			if ((cs.filter_migration === 'To Only' && row.Destination === cs.filter_major) ||
			(cs.filter_migration === 'From Only' && row.Source === cs.filter_major) ||
			(cs.filter_migration === 'Both From and To')) {
				rows.push(
					row_tpl.replace('{enrolled}', row.Source)
						.replace('{graduated}', row.Destination)
						.replace('{count}', row.Students)
				);
			}
		});

		rows.push('</tbody></table>');
		return rows.join('');
	};

	var config_chart = function (cs, college_map, major_map, migrations) { // initially and on change of campus
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

		var results = ingest(cs.filter_migration, list);

		$('#table').empty();
		$('<div id="migration_table">' + build_table(cs, list) + '</div>').appendTo('#table');
		$('body').trigger('create_chart', {'chart_config': results});
	};

	/*
	************************************************************
	* Create and populate the control elements from data loaded
	*
	************************************************************
	*/
	
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

	var config_controls = function (cs) { // only load data once, but reconfigure cascading controls as needed
		//cascade controls based on various settings of cs.filter_campus, cs.filter_college, cs.filter_major

		// load all the data pertaining to selected campus
		get_migrations(cs.filter_campus, function (migrations) {
			var college_list = _.toArray(migrations.major_colleges);
			var selected_college = create_college_selector(college_list, cs.filter_college);
			cs.filter_college = selected_college;
			var college_map = migrations.major_colleges;
			var major_map = migrations.major_names;

			var major_name_list = _.filter(major_map, function (val, key) {
				return (college_map[key] === selected_college);
			});
			var selected_major = create_major_selector(major_name_list, cs.filter_major);
			cs.filter_major = selected_major;
			var major_code = _.find(Object.keys(major_map), function (key) {
				return major_map[key] === selected_major;
			});

			var option_list = [];
			if (_.size(migrations.enrolled[major_code])) {
				option_list.push('From Only');
				if (_.size(migrations.graduation[major_code])) {
					option_list.push('To Only');
					option_list.push('Both From and To');
				}
			} else if (_.size(migrations.graduation[major_code])) {
				option_list.push('To Only');
			}
			var selected_migrations = create_migrations_selector(option_list, cs.filter_migration);
			cs.filter_migration = selected_migrations;

			// use the new settings to redraw the chart
			config_chart(cs, college_map, major_map, migrations);
		});
	};

	/*
	************************************************************
	* Initialize the page using default settings and
	* set up control change event handlers
	*
	************************************************************
	*/
	var init = function () {
		var cs = {
			'college_map': {},
			'major_map': {},
			'filter_campus': 'East Bay',
			'filter_college': 'College of Business and Economics',
			'filter_major': 'Business Administration',
			'filter_migration': 'Both From and To'
		};

		$('#campusselector').on('change', function (e) {
			cs.filter_campus = e.target.value;
			config_controls(cs);
		});

		$('#fromselector').on('change', function (e) {
			cs.filter_college = e.target.value;
			config_controls(cs);
		});
			
		$('#toselector').on('change', function (e) {
			cs.filter_major = e.target.value;
			config_controls(cs);
		});

		$('#fromtobothselector').on('change', function (e) {
			cs.filter_migration =  e.target.value;
			config_controls(cs);
		});

		// create the chart initially, using default filters
		config_controls(cs);
	};
	init();
}());