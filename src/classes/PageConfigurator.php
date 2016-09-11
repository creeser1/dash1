<?php

class PageConfigurator
{
    protected $name;

    public function __construct($name, $db) {
        $this->name = $name; /* use to distinquish page and to construct source for JSON stream */
        $this->db = $db;
    }

	public function loadPage($id) {
		/*$settings = $this->get('settings')['db'];*/
		$mapper = new PageMapper($this->db);
		$page_id = (int)$id;

		/* get the json config for requested page id */
		$page_settings = $mapper->getPageById($page_id);
		$json = $page_settings->getContent();
		/*$this->logger->addInfo($json);*/
		$page = json_decode($json, true);
		$json_err = json_last_error();
		if ($json_err != 0) {
			$this->logger->addInfo($json_err);
		} /* else */
			/* assert $page has at least one of tabs and each has content */
		if (is_array($page) and array_key_exists('tabs', $page)
				and is_array($page['tabs']) and is_array($page['tabs'][0])) {
			$index = 0;
			/*$this->logger->addInfo('============');*/
			foreach ($page['tabs'] as $tab) {
				/*load the tab content and place in tempate variables, eventually using query returning all at once*/
				$page_handle = $tab['embed']; /*'bublin/explanations';*/
				/*$this->logger->addInfo($page_handle);*/
				$tab_content = $mapper->getPageByHandle($page_handle);
				$html = $tab_content->getContent();
				$id = $tab_content->getId();
				/*$this->logger->addInfo($id);
				$this->logger->addInfo($html);
				$this->logger->addInfo('============');*/
				$page['tabs'][$index]['content'] = stripslashes($html); /* previously added to double quotes */
				/* $this->logger->addInfo(var_export($page, true)); */
				$index = $index + 1;
			}
		}
		return $page;
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
