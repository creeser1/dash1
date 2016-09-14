<?php

class UserLogin
{
    protected $username;
    protected $hash;
    protected $db;

    public function __construct($username, $db) {
        $this->username = $username; /* use to distinquish user */
        $this->db = $db;
    }

	public function registerUser($password) {
		/*hash the password and add record to database if unique username*/
		$this->hash = password_hash($this->username);
		$user_mapper = new UserMapper($this->db);
		$user_data = [];
		$user_data['username'] = $this->username;
		$user_data['hash'] = $this->hash;
		$user = new PageEntity($user_data); /* create new PageEntity object from array */
		$user_mapper->save($user);
		return $this->hash;
	}

	public function removeUser() {
		/*hash the password and add record to database if unique username*/
		$user_mapper = new UserMapper($this->db);
		$status = $user_mapper->remove($this->username);
	}

	public function authenticateUser($password) {
		/*hash the password and verify it matches existing user record*/
		$user_mapper = new UserMapper($this->db);
		$user = $user_mapper->getUser($this->username);
		$hash = password_hash($this->username);
		if (password_verify($password, $hash)) {
			return true;
		}
		return false;
	}

	public function generateToken() {
		$token = '';
		return $token;
	}

	public function verifyToken($token) {
		
		return false;
	}

	protected function getHash() {
		$user_mapper = new UserMapper($this->db);
		$hash = $user_mapper->getHash($this->username);
		return $hash;
	}
}