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
	$whitelist = ['bublin' => '1', 'peercomp' => '2', 'sankey' => '144'];
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

//REMOVE FOR PROD
// will require authentication and authorization to save edits
$app->get('/edit/{id}', function ($request, $response, $args) {
	$this->logger->addInfo('get /edit/'.$args['id']);
	$whitelist = ['bublin' => '1', 'peercomp' => '2'];
	if (array_key_exists($args['id'], $whitelist)) { // avoid database auth lookups on non-whitelisted pages
		$id = $whitelist[$args['id']];
		$builder = new PageConfigurator('bublin', $this->db);
		$page = $builder->loadPage($id);
		$template = $page['edittemplate'].'.html';
		$token64 = '';
		$headerValueArray = $request->getHeader('X-Auth-Token');
		if (is_array($headerValueArray) and isset($headerValueArray[0])) {
			$token64 = $headerValueArray[0]; // just pass it along
		}
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

//REMOVE FOR PROD
$app->post('/register', function (Request $request, Response $response, $args) {
	$ok = true;
	$username = $request->getParsedBodyParam('username', $default = null);
	$username = filter_var($username, FILTER_SANITIZE_STRING);
	$minUsernameLength = 3;
	$minPasswordLength = 8; // may want to get these from some config file
	if (strlen($username) < $minUsernameLength) {
		$this->logger->addInfo('---registration name too short: '.$username);
		$message = $username.' is too short, please choose another username of at least 3 letters';
		$ok = false;
	}
	$password = $request->getParsedBodyParam('password', $default = null);
	$password = substr(trim($password), 0, 127); // some reasonable max
	if (strlen($password) < $minPasswordLength) {
		$this->logger->addInfo('---registration name too short: '.$username);
		$message = 'password is too short, please choose another password of at least 8 characters';
		$ok = false;
	}
	if ($ok) { // no point in adding too short username/password
		$auth = new UserLogin($username, $this->db);
		$hasUser = $auth->hasUser($username); // active or pending
		if ($hasUser === false) { // not an existing user so go ahead and register
			$hash = $auth->registerUser($password);
			$this->logger->addInfo('---registered: '.$username.' with hash: '.$hash);
			$this->logger->addInfo('---registration request for: '.$username);
				$message = 'registration request pending review';
		} else {
			$this->logger->addInfo('---registration duplicate for: '.$username);
			$message = $username.' is unavailable, please choose another username';
		}
	}
	return $response->withHeader('Content-Type', 'text/plain')
		->withStatus(401)
		->write($message);
})->setName('register');

//REMOVE FOR PROD
// should only happen via ajax post request from make_editable.js
$app->post('/login', function (Request $request, Response $response, $args) {
	$username = $request->getParsedBodyParam('username', $default = null);
	$username = filter_var($username, FILTER_SANITIZE_STRING);
	$password = $request->getParsedBodyParam('password', $default = null);
	$password = substr(trim($password), 0, 127); // some reasonable max
	$this->logger->addInfo('---test usr: '.$username);
	$this->logger->addInfo('---test pwd: '.$password);
	$isAuthenticated = false;
	if (strlen($password) >= $minPasswordLength) {
		$auth = new UserLogin($username, $this->db);
		$isAuthenticated = $auth->authenticateUser($password);
		$this->logger->addInfo('---Auth: '.$isAuthenticated);
	}
	if ($isAuthenticated !== false) {
		$this->logger->addInfo('---Authenticated User: '.$username.' ---');
		$token = base64_encode($auth->getNewToken());
		return $response->withHeader('Content-Type', 'text/plain')
			->write($token);
	} else {
		$this->logger->addInfo('---Auth-Failed User: '.$username.' ---');
		$message = 'invalid credentials';
		return $response->withHeader('Content-Type', 'text/plain')
			->withStatus(401)
			->write($message);
	}
})->setName('login');

//REMOVE FOR PROD
$app->get('/login', function (Request $request, Response $response, $args) {
	return $this->view->render($response, 'login.html', [
		'destination' => '/../login',
		'message' => ''
	]);
});

//REMOVE FOR PROD
// should only happen via ajax post request from make_editable.js
$app->map(['PUT', 'POST'], '/tab[/{params:.*}]', function (Request $request, Response $response, $args) {
	$headerValueArray = $request->getHeader('X-Auth-Token');
	if (is_array($headerValueArray) and isset($headerValueArray[0])) {
		$jsonToken = base64_decode($headerValueArray[0]);
		$this->logger->addInfo('---header: '.$jsonToken);
		$json_array = json_decode($jsonToken, true);
		$token = $json_array['token'];
		$username = $json_array['data'];
		$this->logger->addInfo('---token: '.$token);
		$this->logger->addInfo('---username: '.$username);
	}
	$isvalidToken = false;
	if (isset($token) and isset($username)) { // credentials provided
		$auth = new UserLogin($username, $this->db);
		$isvalidToken = $auth->verifyToken($token);
		$this->logger->addInfo('---authenticating: '.$username);
		$this->logger->addInfo('---isvalidToken: '.$isvalidToken);
		$this->logger->addInfo('---equal true: '.($isvalidToken === true));
	}
	if ($isvalidToken === true) { // ok to update the content Note === since empty arrays are also true
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
		//$json = json_encode($tab_data);
		$tab_data_str = 'ok'; // no need to return anything
		$response = $response->withHeader('Content-type', 'text/plain')
			->write($tab_data_str); // not necessary
		$this->logger->addInfo('---successful save by: '.$username);
	} else { // ask to authenticate (via popover)
		$this->logger->addInfo('---failure to save by: '.$username);
		$tab_data_str = '';
		$response = $response->withHeader('Content-type', 'text/plain')
			->withStatus(401) // not authorized
			->write($tab_data_str);
	}
	return $response;
});

//REMOVE FOR PROD
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