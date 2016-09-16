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
/*
***********************
*** Routing begins here
***********************
*/
/*some automated server monitoring expects this*/
$app->get('/index.html', function ($request, $response, $args) {
    return $this->view->render($response, 'root.html', [
        'name' => 'test'
    ]);
});

$app->get('/', function ($request, $response, $args) {
    return $this->view->render($response, 'root.html', [
        'name' => 'root'
    ]);
});

$app->get('/favicon.ico', function ($request, $response, $args) {
    return $this->view->render($response, 'csyoufavicon.ico', [
        'name' => 'favicon'
    ]);
});

$app->get('/data/{dataset:.*}', function ($request, $response, $args) {
	$this->logger->addInfo('dataset');
	$this->logger->addInfo($args['dataset']);
	/*if .json else (if .zip content type different return binary stream -- href download property)*/
	$newResponse = $response->withHeader('Content-type', 'application/json');
    return $this->data->render($newResponse, $args['dataset'], [
        'name' => $args['dataset']
    ]);
})->setName('dataset');

// normal read only access
$app->get('/dashboard/{id}', function ($request, $response, $args) {
	$whitelist = ['bublin' => '1', 'peercomp' => '2'];
	if (array_key_exists($args['id'], $whitelist)) {
		$id = $whitelist[$args['id']];
		$builder = new PageConfigurator('bublin', $this->db);
		$page = $builder->loadPublishedPage($id);
		$template = $page['pagetemplate'].'.html';
		$this->logger->addInfo('published page');
		$this->logger->addInfo($template);
		return $this->view->render($response, $template, [
			'page' => $page // no token, not editable
		]);
	} else {
		$this->logger->addInfo('Requested missing page: /dashboard/'.$args['id']);
		return $response->withHeader('Content-Type', 'text/html')
			->withStatus(404)
			->write('Page not found');
	}
})->setName('dashboard');

// will require authentication and authorization to save edits
$app->get('/edit/{id}', function ($request, $response, $args) {
	$this->logger->addInfo('get /edit/'.$args['id']);
	$whitelist = ['bublin' => '1', 'peercomp' => '2'];
	if (array_key_exists($args['id'], $whitelist)) { // avoid database auth lookups on non-whitelisted pages
		$id = $whitelist[$args['id']];
		$builder = new PageConfigurator('bublin', $this->db);
		$page = $builder->loadPage($id);
		$template = $page['edittemplate'].'.html';
		return $this->view->render($response, $template, [
			'page' => $page,
			'ses' => $token // without token page is not editable
		]);
	} else {
		$this->logger->addInfo('Requested missing page: /edit/'.$args['id']);
		return $response->withHeader('Content-Type', 'text/html')
			->withStatus(404)
			->write('Page not found');
	}
})->setName('edit');

$app->post('/register', function (Request $request, Response $response, $args) {
	$username = $request->getParsedBodyParam('username', $default = null);

	$auth = new UserLogin($username, $this->db);
	$hasUser = $auth->hasUser($username); // active or pending
	if ($hasUser == false) { // not an existing user so go ahead and register
		$hash = $auth->registerUser($request->getParsedBodyParam('password', $default = null));
		$this->logger->addInfo('---registration request for: '.$username);
			$message = 'registration request pending review';
	} else {
		$this->logger->addInfo('---registration duplicate for: '.$username);
		$message = $username.' is unavailable, please choose another username';
	}
	$params = '#'; // stay on login page (go to thanks for registering else to home page '/')
	return $this->view->render($response, 'login.html', [
		'destination' => '/'.$params,
		'message' => $message
	]);
})->setName('register');

// should only happen via ajax post request from make_editable.js
$app->post('/login', function (Request $request, Response $response, $args) {
	$username = $request->getParsedBodyParam('username', $default = null);

	$auth = new UserLogin($username, $this->db);
	$isAuthenticated = $auth->authenticateUser($request->getParsedBodyParam('password', $default = null));
	if ($isAuthenticated) {
		$token = $auth->getNewToken();
		return $response->withHeader('Content-Type', 'text/plain')
			->write($token);
	}
	return $response->withHeader('Content-Type', 'text/plain')
		->withStatus(401)
		->write('Invalid credentials');
})->setName('login');

// should only happen via ajax post request from make_editable.js
$app->map(['PUT', 'POST'], '/tab[/{params:.*}]', function (Request $request, Response $response, $args) {
	$headerValueArray = $request->getHeader('X-Auth-Token');
	if (is_array($headerValueArray) and isset($headerValueArray[0])) {
		$jsonToken = $headerValueArray[0];
		$json_array = json_decode($jsonToken, true);
		$token = $json_array['token'];
		$username = $json_array['data'];
	}
	$isvalidToken = false;
	if (isset($token) and isset($username)) { // credentials provided
		$auth = new UserLogin($username, $this->db);
		$isvalidToken = $auth->verifyToken($token);
	}
	if ($isvalidToken == true) { // ok to update the content
		$patterns = "/\s+/m"; // only one pattern for now, for more use array:  ["/\s+/m", "/'/"];
		$replacements = " ";
		$dataraw = $request->getBody();
		$data = preg_replace($patterns, $replacements, $dataraw);
		// {"content": "<p class=\"ok\">It&apos;s ok</p>"}, {"content": "<p class="notok">It's not ok</p>"}
		$json_array = json_decode($data, true); // fails if quotes not escaped obj values

		$builder = new PageConfigurator('bublin', $this->db);
		$params = $request->getAttribute('params');
		$method = $request->getMethod();
		$tab_data = $builder->loadEditor($params, $method, $dataraw, $username);
		$json = json_encode($tab_data);

		$response = $response->withHeader('Content-type', 'application/json')
			->withJson($tab_data); // not necessary
	} else { // ask to authenticate (via popover)
		$tab_data = '';
		$response = $response->withHeader('Content-type', 'application/json')
			->withStatus(401) // not authorized
			->withJson($tab_data);
	}
	return $response;
});

// for debugging only
$app->get('/dump/{id}', function (Request $request, Response $response, $args) {
	$page_id = (int)$args['id'];
	$mapper = new PageMapper($this->db);
	$page = $mapper->getPageById($page_id);
	$page_str = htmlentities(var_export($page, true));
	echo $page_str;
	return $response;
});

$app->run();