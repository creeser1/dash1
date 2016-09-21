<?php

class PageConfigurator
{
    protected $name;
    protected $db;

    public function __construct($name, $db) {
        $this->name = $name; /* use to distinquish page and to construct source for JSON stream */
        $this->db = $db;
    }

	public function loadPage($id) {
		$mapper = new PageMapper($this->db);
		$page_id = (int)$id;

		/* get the json config for requested page id */
		$page_settings = $mapper->getPageById($page_id);
		$json = $page_settings->getContent();
		$page = json_decode($json, true);
		$json_err = json_last_error();
		if ($json_err !== 0) {
			$this->logger->addInfo($json_err);
		} /* else */
			/* assert $page has at least one of tabs and each has content */
		if (is_array($page) and array_key_exists('tabs', $page)
				and is_array($page['tabs']) and is_array($page['tabs'][0])) {
			$index = 0;
			foreach ($page['tabs'] as $tab) {
				/*load the tab content and place in tempate variables, eventually using query returning all at once*/
				$page_handle = $tab['embed']; /*'bublin/explanations';*/
				$tab_content = $mapper->getPageByHandle($page_handle);
				$html = $tab_content->getContent();
				$id = $tab_content->getId();
				$page['tabs'][$index]['content'] = stripslashes($html); /* previously added to double quotes */
				/* $this->logger->addInfo(var_export($page, true)); */
				$index = $index + 1;
			}
		}
		return $page;
	}

	public function loadPublishedPage($id) {
		$mapper = new PageMapper($this->db);
		$page_id = (int)$id;

		/* get the json config for requested page id */
		$page_settings = $mapper->getPageById($page_id);
		$json = $page_settings->getContent();
		$page = json_decode($json, true);
		$json_err = json_last_error();
		if ($json_err !== 0) {
			$this->logger->addInfo($json_err);
		} /* else */
			/* assert $page has at least one of tabs and each has content */
		if (is_array($page) and array_key_exists('tabs', $page)
				and is_array($page['tabs']) and is_array($page['tabs'][0])) {
			$index = 0;
			foreach ($page['tabs'] as $tab) {
				/*load the tab content and place in tempate variables, eventually using query returning all at once*/
				$page_handle = $tab['embed']; /*'bublin/explanations';*/
				$tab_content = $mapper->getPublishedPageByHandle($page_handle);
				$html = $tab_content->getContent();
				$id = $tab_content->getId();
				$page['tabs'][$index]['content'] = stripslashes($html); /* previously added to double quotes */
				/* $this->logger->addInfo(var_export($page, true)); */
				$index = $index + 1;
			}
		}
		return $page;
	}

	public function loadEditor($params, $method, $dataraw, $username) {
		$patterns = ["/\s+/m", "/'/"];
		$replacements = [" ", "'"];
		$data = preg_replace($patterns, $replacements, $dataraw);
		/*$this->logger->addInfo(preg_last_error());*/
		/* json_decode fails if quotes not escaped in json obj values */
		/* {"content": "<p class=\"ok\">It&apos;s ok</p>"} */
		/* {"content": "<p class="notok">It's not ok</p>"} */
		$json_array = json_decode($data, true);
		/*$this->logger->addInfo(json_last_error());*/

		/* At this point we should have the new content as a php array */
		/* Now, get record having the latest version of this content from database */
		/* so that it can be updated */

		$tab_mapper = new PageMapper($this->db);
		$tab_handle = $params; /*'bublin/method';*/
		$tab_obj = $tab_mapper->getPageByHandle($tab_handle); /* latest version */
		$tab_data = [];
		$content = $json_array['content']; /* except that content will come from $request */
		$description = $json_array['description']; /* and so will description */
		$tab_data['content'] = filter_var($content, FILTER_UNSAFE_RAW); /* no weird characters */
		$tab_data['description'] = filter_var($description, FILTER_SANITIZE_STRING); /* no html tags */
		$tab_data['type'] = $tab_obj->getType();
		$tab_data['handle'] = $tab_obj->getHandle();
		$tab_data['locator'] = $tab_obj->getLocator();
		$tab_data['version'] = $tab_obj->getVersion(); /* get latest version and increment */
		if (array_key_exists('status', $json_array) and $json_array['status'] === 'published') {
			$tab_data['status'] = 1; /* 1-published, 2-draft, ... */;
		} else {
			$tab_data['status'] = 2; /* 1-published, 2-draft, ... */;
		}
		$dirty = ($tab_data['content'] !== $tab_obj->getContent() or $tab_data['status'] !== $tab_obj->getStatus());
		/*$tab_data['status'] = $tab_obj->getStatus();*/ /* 1,2,... or draft, published, ... */;
		$tab_data['editor'] = $username; 
		//$tab_obj->getEditor(); /* current authenticated username */
		$tab_data['start'] = $tab_obj->getStart(); /* if start provided */
		/*$this->logger->addInfo(var_export($tab_data, true));*/

		/* only save if content or status changed */
		if ($dirty) {
			$tab = new PageEntity($tab_data); /* create new PageEntity object from array */
			$tab_mapper->save($tab);
		}

		return $tab_data;
	}
}
