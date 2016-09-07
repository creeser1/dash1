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

$app->get('/test1', function ($request, $response, $args) {
	$setup = new PageConfigurator('page_test1');
	$page = $setup->getSetup();
	$settings = $this->get('settings')['db'];
	$this->logger->addInfo($settings['dbname']);
	$this->logger->addInfo($page['htmltitle']);
	/*
	$jsonResponse = $response->withHeader('Content-type', 'application/json');
	*/
	$jsonstring = $this->data->render($response, 'test1_settings.json', [
        'name' => 'test1_settings.json'
    ]);
	$jsonbody = $response->getBody()->getContents();
	$this->logger->addInfo($jsonstring);
	$this->logger->addInfo($jsonbody);
	$response->getBody()->rewind();
	$jsonstr = file_get_contents('../data/test1_settings.json');
	$this->logger->addInfo($jsonstr);
    return $this->view->render($response, 'tpl_test1.html', [
        'page' => $page
    ]);
});

$app->run();