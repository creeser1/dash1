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
		$this->logger->addInfo('Requested missing page: /dashboard/'.$args['id']);
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
        'page' => $page,
		'ses' => $token
    ]);
})->setName('edit');

$app->get('/dump/{id}', function (Request $request, Response $response, $args) {
	$page_id = (int)$args['id'];
	$mapper = new PageMapper($this->db);
	$page = $mapper->getPageById($page_id);
	$page_str = htmlentities(var_export($page, true));
	echo $page_str;
	return $response;
});

$app->get('/loginto[/{params:.*}]', function (Request $request, Response $response, $args) {
	$params = $request->getAttribute('params');
    return $this->view->render($response, 'login.html', [
        'destination' => '/'.$params
    ]);
})->setName('loginto');

$app->post('/login', function (Request $request, Response $response, $args) {
	$dataraw = $request->getBody();
	$username = $request->getParsedBodyParam('username', $default = null);

	$isAuthenticated = false;
	$token = false;
	$auth = new UserLogin($username, $this->db);
	$isAuthenticated = $auth->authenticateUser($request->getParsedBodyParam('password', $default = null));
	if ($isAuthenticated) {
		$token = $auth->getNewToken();
		return $response->withHeader('Content-Type', 'text/plain')
			->write($token);
	}
	return $response->withStatus(401)->withHeader('Content-Type', 'text/plain')
		->write('Invalid credentials');
})->setName('login');

$app->map(['PUT', 'POST'], '/edit[/{params:.*}]', function (Request $request, Response $response, $args) {
	$dataraw = $request->getBody();
	$params = $request->getAttribute('params');
	$this->logger->addInfo($params);
	$username = $request->getParsedBodyParam('username', $default = null);
	$password = $request->getParsedBodyParam('password', $default = null);
	$this->logger->addInfo('---request to login---');
	$this->logger->addInfo('username: '.$username);
	$this->logger->addInfo('---xhr---');
	$this->logger->addInfo(var_export($request->isXhr(), true));

	$auth = new UserLogin($username, $this->db);
	$hasUser = $auth->hasUser($username);
	$isAuthenticated = false;
	if ($hasUser == false) { // not an existing user so reject login
		$this->logger->addInfo('---not registered---');
		$this->logger->addInfo(var_export($hasUser, true));
		$this->logger->addInfo('---done---');
		//$response = $response->withRedirect($uri, 403);
		$response = $response->withStatus(401); // not authorized
		return $this->view->render($response, 'login.html', [
			'destination' => '/'.$params,
			'message' => 'invalid credentials'
		]);
		//$uri = $request->getUri()->withPath($this->router->pathFor('loginto', [
		//	'params' => $params
		//])); // login succeeded, so load the page prevously desired
	} else { // username valid so check password
		$this->logger->addInfo('---authenticating---');
		$isAuthenticated = $auth->authenticateUser($password);
		$this->logger->addInfo(var_export($isAuthenticated, true));
		$this->logger->addInfo('---done---');

		//$uri = $request->getUri()->withPath($this->router->pathFor('edit', [
		//	'id' => $params
		//])); // login succeeded, so load the page prevously desired
		//$response = $response->withRedirect($uri, 200); //->withHeader("X-Auth-Token", "JPso76OIYLK5a3knb");
		if ($isAuthenticated) {
			$whitelist = ['bublin' => '1', 'peercomp' => '2'];
			$token = false;
			if (array_key_exists($params, $whitelist)) {
				$id = $whitelist[$params];
				$builder = new PageConfigurator('bublin', $this->db);
				$page = $builder->loadPage($id);
				$template = $page['edittemplate'].'.html';
				$this->logger->addInfo($template);
				$token = 'askj45yghfafyh23hoer';
				$token = $auth->getNewToken();
				$this->logger->addInfo('---new token---');
				$this->logger->addInfo($token);
			} else {
				$this->logger->addInfo('Requested missing page: '.$params);
				return $response->withStatus(404)->withHeader('Content-Type', 'text/html')
					->write('Page not found');
			}

			return $this->view->render($response, $template, [
				'page' => $page,
				'ses' => $token
			]);
		} else {
			$response = $response->withStatus(401); // not authorized
			return $this->view->render($response, 'login.html', [
				'destination' => '/'.$params,
				'message' => 'invalid credentials'
			]);
		}
	}
	return $response;
});

$app->map(['PUT', 'POST'], '/register[/{params:.*}]', function (Request $request, Response $response, $args) {
	//$dataraw = $request->getBody();
	$username = $request->getParsedBodyParam('username', $default = null);
	//$password = $request->getParsedBodyParam('password', $default = null);

	$auth = new UserLogin($username, $this->db);
	$hasUser = $auth->hasUser($username);
	if ($hasUser == false) { // not an existing user so go ahead and register
		$hash = $auth->registerUser($request->getParsedBodyParam('password', $default = null));
		$this->logger->addInfo('---registration request for: '.$username);
			return $this->view->render($response, 'login.html', [
				'destination' => '/'.$params,
				'message' => 'registration request pending review'
			]);
	} else {
		$this->logger->addInfo('---registration duplicate for: '.$username);
			return $this->view->render($response, 'login.html', [
				'destination' => '/'.$params,
				'message' => $username.' is unavailable, please choose another username'
			]);
	}
	return $response;
});

$app->map(['PUT', 'POST'], '/tab[/{params:.*}]', function (Request $request, Response $response, $args) {
	$dataraw = $request->getBody();
	$params = $request->getAttribute('params');
	$method = $request->getMethod();
	$headerValueArray = $request->getHeader('X-Auth-Token');
	$token = '';
	$username = '';
	$isvalidToken = false;
	if (is_array($headerValueArray) and isset($headerValueArray[0])) {
		$jsonToken = $headerValueArray[0];
		$json_array = json_decode($jsonToken, true);
		$token = $json_array['token'];
		$username = $json_array['data'];
	}
	if (isset($token) and isset($username)) {
		$auth = new UserLogin($username, $this->db);
		$isvalidToken = $auth->verifyToken($token);
	}
	/*if valid token then save changes else notify of failure to save due to invalid credentials, ask to login again*/
	if ($isvalidToken == true) {
		//$patterns = ["/\s+/m", "/'/"];
		//$replacements = [" ", "'"];
		$patterns = "/\s+/m"; // only one pattern for now
		$replacements = " ";
		$data = preg_replace($patterns, $replacements, $dataraw);
		// json_decode fails if quotes not escaped in json obj values
		// {"content": "<p class=\"ok\">It&apos;s ok</p>"}
		// {"content": "<p class="notok">It's not ok</p>"}
		$json_array = json_decode($data, true);

		$builder = new PageConfigurator('bublin', $this->db);
		$tab_data = $builder->loadEditor($params, $method, $dataraw, $username);
		$json = json_encode($tab_data);

		$newResponse = $response->withHeader('Content-type', 'application/json');
		$jsonResponse = $newResponse->withJson($tab_data);

		return $jsonResponse;
	} else {
			// for a popup
			/*
			$response = $response->withStatus(401); // not authorized
			return $this->view->render($response, 'login.html', [
				'destination' => '/'.$params,
				'message' => 'invalid credentials'
			]);
			*/
			// else redirect
			// change method to get before redirect and clear request payload
			$response = $response->withRedirect('/loginto/'.$params, 401);
			return $response;
			
	}
});

$app->run();