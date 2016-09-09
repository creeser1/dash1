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
    $page_settings = $mapper->getPageById($page_id);
	$json = $page_settings->getContent();
	$page = json_decode($json, true);
	$this->logger->addInfo($json);
	$index = 0;
	foreach ($page['tabs'] as $tab) {
		/*load the tab content and place in tempate variables, eventually using query returning all at once*/
		$page_handle = $tab['embed']; /*'bublin/explanations';*/
		$this->logger->addInfo($page_handle);
		$tab_content = $mapper->getPageByHandle($page_handle);
		$html = $tab_content->getContent();
		$page['tabs'][$index]['content'] = $html;
		/* $this->logger->addInfo(var_export($page, true)); */
		$index = $index + 1;
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

$app->put('/tab[/{params:.*}]', function (Request $request, Response $response) {
	$data = $request->getParsedBody();
	$params = $request->getAttribute('params');
	$this->logger->addInfo($params);
	$tab_mapper = new PageMapper($this->db);
	$tab_handle = 'bublin/method';
	$tab_obj = $tab_mapper->getPageByHandle($tab_handle);
	$tab_data = [];
	$tab_data['description'] = filter_var($data['description'], FILTER_SANITIZE_STRING);
	$tab_data['content'] = filter_var($data['content'], FILTER_SANITIZE_STRING);
	$tab_data['type'] = $tab_obj->type;
	$tab_data['handle'] = $tab_obj->handle;
	$tab_data['locator'] = $tab_obj->locator;
	$tab_data['version'] = $tab_obj->version; /* get latest version and increment */
	$tab_data['status'] = $tab_obj->status /* 1,2,... or draft, published, ... */;
	$tab_data['editor'] = $tab_obj->editor /* current authenticated username */
	$tab_data['start'] = $tab_obj->start /* if start provided */
  	$this->logger->addInfo(var_export($tab_data, true));

	$tab = new PageEntity($tab_data); /* create new PageEntity object from array */
	$tab_mapper->save($tab);

	return $response;
});

$app->run();