<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require '../vendor/autoload.php';
require '../vendor/settings.php';
spl_autoload_register(function ($classname) {
    require ("../classes/" . $classname . ".php");
});

$config['displayErrorDetails'] = true;
$config['addContentLengthHeader'] = false;
$settings = [
	'settings' => $config
];

$app = new \Slim\App($settings);
$container = $app->getContainer();

$container['logger'] = function($c) {
    $logger = new \Monolog\Logger('my_logger');
    $file_handler = new \Monolog\Handler\StreamHandler("../logs/app.log");
    $logger->pushHandler($file_handler);
    return $logger;
};

$container['data'] = function ($container) {
    $view = new \Slim\Views\Twig('../data', [
        'cache' => false /*'../cache'*/
    ]);
    $view->addExtension(new \Slim\Views\TwigExtension(
        $container['router'],
        $container['request']->getUri()
    ));

    return $view;
};

$container['view'] = function ($container) {
    $view = new \Slim\Views\Twig('../templates', [
        'cache' => false /*'../cache'*/
    ]);
    $view->addExtension(new \Slim\Views\TwigExtension(
        $container['router'],
        $container['request']->getUri()
    ));

    return $view;
};

$container['db'] = function ($c) {
    $db = $c['settings']['db'];
    $pdo = new PDO("mysql:host=" . $db['host'] . ";dbname=" . $db['dbname'],
        $db['user'], $db['pass']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    return $pdo;
};

/*some automated server monitoring expects this*/
$app->get('/index.html', function ($request, $response, $args) {
    return $this->view->render($response, 'root.html', [
        'name' => 'test'
    ]);
})->setName('index');

$app->get('/', function ($request, $response, $args) {
    return $this->view->render($response, 'root.html', [
        'name' => 'root'
    ]);
})->setName('root');

$app->get('/favicon.ico', function ($request, $response, $args) {
    return $this->view->render($response, 'csyoufavicon.ico', [
        'name' => 'favicon'
    ]);
})->setName('favicon');

$app->get('/bublin', function ($request, $response, $args) {
    return $this->view->render($response, 'bublin-template.html', [
        'name' => $args['name']
    ]);
})->setName('bublin');

$app->get('/bublin5', function ($request, $response, $args) {
    return $this->view->render($response, 'bublin-template5.html', [
        'name' => $args['name']
    ]);
})->setName('bublin5');

$app->get('/data/{dataset}', function ($request, $response, $args) {
	$this->logger->addInfo('dataset');
	$this->logger->addInfo($args['dataset']);
	$newResponse = $response->withHeader('Content-type', 'application/json');
    return $this->data->render($newResponse, $args['dataset'], [
        'name' => $args['dataset']
    ]);
});

$app->get('/test2', function ($request, $response, $args) {
	$this->logger->addInfo('test2');
	$newResponse = $response->withHeader('Content-type', 'application/json');
	$this->logger->addInfo('json test2');
    return $this->data->render($newResponse, 'test1_settings.json', [
        'name' => 'test1_settings.json'
    ]);
});

$app->get('/test1/{id}', function ($request, $response, $args) {
	$settings = $this->get('settings')['db'];
  $mapper = new PageMapper($this->db);
	$page_id = (int)$args['id'];

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
  		and is_array($page['tabs'] and is_array($page['tabs'][0]))) {
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

    return $this->view->render($response, 'tpl_test1.html', [
        'page' => $page
    ]);
});

$app->get('/page/{id}', function (Request $request, Response $response, $args) {
  $page_id = (int)$args['id'];
  $mapper = new PageMapper($this->db);
  $page = $mapper->getPageById($page_id);
	var_dump($page);
	/*
    $response = $this->view->render($response, "pageform.html", ["page" => $page]);
	*/
  return $response;
})->setName('pgcontent');

$app->map(['PUT', 'POST'], '/tab[/{params:.*}]', function (Request $request, Response $response, $args) {
	$dataraw = $request->getBody();
	$params = $request->getAttribute('params');
	$method = $request->getMethod();
	$this->logger->addInfo('--params--');
	$this->logger->addInfo($params);
	$this->logger->addInfo($method);
	$this->logger->addInfo('--requested_data--');
	$this->logger->addInfo($dataraw);
	$patterns = ["/\s+/m", "/'/"];
	$replacements = [" ", "'"];
	$data = preg_replace($patterns, $replacements, $dataraw);
	$this->logger->addInfo(preg_last_error());
	/*$this->logger->addInfo($data);*/
	/* json_decode fails if quotes not escaped in json obj values */
	/* {"content": "<p class=\"ok\">It&apos;s ok</p>"} */
	/* {"content": "<p class="notok">It's not ok</p>"} */
	$json_array = json_decode($data, true);
  $this->logger->addInfo(json_last_error());
	/*$this->logger->addInfo('-------json_php_array---------');
  $this->logger->addInfo(var_export($json_array, true));
	$this->logger->addInfo('------------------');*/

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
	/*$this->logger->addInfo('------tab_data_content------');
	$this->logger->addInfo($tab_data['content']);
	$this->logger->addInfo('------------------');*/
	$tab_data['type'] = $tab_obj->getType();
	$tab_data['handle'] = $tab_obj->getHandle();
	$tab_data['locator'] = $tab_obj->getLocator();
	$tab_data['version'] = $tab_obj->getVersion(); /* get latest version and increment */
	$tab_data['status'] = $tab_obj->getStatus(); /* 1,2,... or draft, published, ... */;
	$tab_data['editor'] = $tab_obj->getEditor(); /* current authenticated username */
	$tab_data['start'] = $tab_obj->getStart(); /* if start provided */
  /*$this->logger->addInfo(var_export($tab_data, true));*/

	/* only save if content changed */
	if ($tab_data['content'] != $tab_obj->getContent()) {
		$tab = new PageEntity($tab_data); /* create new PageEntity object from array */
		$tab_mapper->save($tab);
	}

	/* Finally, respond with accepted json object */
	$json = json_encode($tab_data);
  $this->logger->addInfo('--json response--');
  $this->logger->addInfo($json);
	$this->logger->addInfo('------------------');
	$newResponse = $response->withHeader('Content-type', 'application/json');
	$jsonResponse = $newResponse->withJson($tab_data);

	return $jsonResponse;
});

$app->run();