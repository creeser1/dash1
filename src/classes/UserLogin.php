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

	public function hasUser($username) {
		$user_mapper = new UserMapper($this->db);
		return $user_mapper->getUserByUsername($username);
    }

	public function registerUser($password) {
		$user_mapper = new UserMapper($this->db);
		/*hash the password and add record to database if unique username*/
		/*
		$status = $user_mapper->getUserByUsername($this->username);
		return $status;
		*/
		$this->hash = password_hash($password, PASSWORD_DEFAULT);
		$user_data = [];
		$user_data['username'] = $this->username;
		$user_data['hash'] = $this->hash;
		$user_data['status'] = 1; /* 1 active, 2 inactive */
		$user = new UserEntity($user_data); /* create new PageEntity object from array */
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
		$user = $user_mapper->getUserByUsername($username);
		if ($user != false) {
			$hash = $user->getHash();
			if (password_verify($password, $hash)) {
				return true;
			}
			return false;
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