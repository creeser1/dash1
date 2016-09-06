<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require '../vendor/autoload.php';
spl_autoload_register(function ($classname) {
    require ("../classes/" . $classname . ".php");
});

$config['displayErrorDetails'] = true;

$app = new \Slim\App(["settings" => $config]);
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
	$newResponse = $response->withHeader('Content-type', 'application/json');
    return $this->data->render($newResponse, $args['dataset'], [
        'name' => $args['dataset']
    ]);
})->setName('dataset');

$app->get('/test1', function ($request, $response, $args) {
    return $this->view->render($response, 'tpl_test1.html', [
        'page' => [
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
		]
    ]);
})->setName('test1');

$app->run();
