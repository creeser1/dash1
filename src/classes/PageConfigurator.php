<?php

class PageConfigurator
{
    protected $name;

    public function __construct($name) {
        $this->name = $name; /* use to distinquish page and to construct source for JSON stream */
    }

	public function getSetup() { /* eventually replace this inline code by reading JSON from stream */
		$page = [
			'htmltitle' => 'Test Title',
			'title' => 'CSU Something',
			'style' => 'static/page/bublin/all_style.css',
			'controls' => [
				[
				'type' => 'select',
				'id' => 'dataset_filter1',
				'details' => [
						[
						'option_value' => 'ftf_6yr',
						'option_text' => 'FTF 6yr Grad',
						'isselected' => true
						],
						[
						'option_value' => 'ftf_4yr',
						'option_text' => 'FTF 4yr Grad'
						],
						[
						'option_value' => 'tr_4yr',
						'option_text' => 'TR 4yr Grad'
						],
						[
						'option_value' => 'tr_2yr',
						'option_text' => 'TR 2yr Grad'
						],
					]
				]
			],
			'tabs' => [
				[
				'isactive' => true,
				'label' => 'CSU Comparisons',
				'anchor' => 'chart',
				'embed' => 'static/page/bublin/chart.html'
				],
				[
				'label' => 'Historical Trends',
				'anchor' => 'trends',
				'embed' => 'static/page/bublin/trends.html'
				],
				[
				'label' => 'Chart Explanations',
				'anchor' => 'explanations',
				'embed' => 'static/page/bublin/explanations.html'
				],
				[
				'label' => 'Data Tables',
				'anchor' => 'table',
				'embed' => 'static/page/bublin/table.html'
				],
				[
				'label' => 'Methodology',
				'anchor' => 'method',
				'embed' => 'static/page/bublin/method.html'
				]
			]
		];
		return $page;
	}
}
