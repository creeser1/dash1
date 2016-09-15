<?php

class UserEntity
{
	protected $id;
	protected $username;
	protected $hash;
	protected $salt;
	protected $expires;
	protected $role;
	protected $status;
	protected $created;
	protected $modified;

	/**
	* Accept an array of data matching properties of this class
	* and create the class
	*
	* @param array $data The data to use to create
	*/
	public function __construct(array $data) {
        // no id if we're creating also created is one-time auto timestamp
        if(isset($data['id'])) {
            $this->id = $data['id'];
			$this->created = $data['created'];
        }

        $this->username = $data['username'];
        $this->hash = $data['hash'];
        $this->salt = $data['salt'];
        $this->role = $data['role'];
        $this->status = $data['status'];
    }

    public function getId() {
        return $this->id;
    }

    public function getUsername() {
        return $this->username;
    }

    public function getHash() {
        return $this->hash;
    }

    public function getSalt() {
        return $this->salt;
    }

    public function getExpires() {
        return $this->expires;
    }

    public function getRole() {
        return $this->role;
    }

    public function getStatus() {
        return $this->status;
    }

    public function getCreated() {
        return $this->created;
    }

    public function getModified() {
        return $this->modified;
    }
}
