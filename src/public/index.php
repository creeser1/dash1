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

$app->get('/data/{dataset:.*}', function ($request, $response, $args) {
	$this->logger->addInfo('dataset');
	$this->logger->addInfo($args['dataset']);
	/*if .json else (if .zip content type different return binary stream -- href download property)*/
	$newResponse = $response->withHeader('Content-type', 'application/json');
    return $this->data->render($newResponse, $args['dataset'], [
        'name' => $args['dataset']
    ]);
});

$app->get('/dashboard/{id}', function ($request, $response, $args) {
	$whitelist = ['bublin' => '1', 'peercomp' => '2'];
	if (array_key_exists($args['id'], $whitelist)) {
		$id = $whitelist[$args['id']];
		$builder = new PageConfigurator('bublin', $this->db);
		$page = $builder->loadPublishedPage($id);
		$template = $page['pagetemplate'].'.html';
		$this->logger->addInfo('published page');
		$this->logger->addInfo($template);
	} else {
		$this->logger->addInfo('Requested missing page: '.$args['id']);
		return $response->withStatus(404)->withHeader('Content-Type', 'text/html')
			->write('Page not found');
	}

	return $this->view->render($response, $template, [
		'page' => $page
	]);

});

$app->get('/edit/{id}', function ($request, $response, $args) {
	$whitelist = ['bublin' => '1', 'peercomp' => '2'];
	if (array_key_exists($args['id'], $whitelist)) {
		$id = $whitelist[$args['id']];
		$builder = new PageConfigurator('bublin', $this->db);
		$page = $builder->loadPage($id);
		$template = $page['edittemplate'].'.html';
		$this->logger->addInfo($template);
	} else {
		$this->logger->addInfo('Requested missing page: '.$args['id']);
		return $response->withStatus(404)->withHeader('Content-Type', 'text/html')
			->write('Page not found');
	}

    return $this->view->render($response, $template, [
        'page' => $page
    ]);
});

$app->get('/dump/{id}', function (Request $request, Response $response, $args) {
	$page_id = (int)$args['id'];
	$mapper = new PageMapper($this->db);
	$page = $mapper->getPageById($page_id);
	$page_str = htmlentities(var_export($page, true));
	echo $page_str;
	return $response;
});

$app->map(['PUT', 'POST'], '/tab[/{params:.*}]', function (Request $request, Response $response, $args) {
	$dataraw = $request->getBody();
	$params = $request->getAttribute('params');
	$method = $request->getMethod();
	$this->logger->addInfo($params);

	$headers = $request->getHeaders();
	foreach ($headers as $name => $values) {
		$this-logger->addInfo($name . ": " . implode(", ", $values));
	}

	$builder = new PageConfigurator('bublin', $this->db);
	$tab_data = $builder->loadEditor($params, $method, $dataraw);
	$json = json_encode($tab_data);
	$this->logger->addInfo($json);

	$newResponse = $response->withHeader('Content-type', 'application/json');
	$jsonResponse = $newResponse->withJson($tab_data);

	return $jsonResponse;
});

$app->run();