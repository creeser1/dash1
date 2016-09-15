<?php

class UserMapper extends Mapper
{
    public function getUsers() {
        $sql = "SELECT * from pguser";
        $stmt = $this->db->query($sql);

        $results = [];
        while($row = $stmt->fetch()) {
            $results[] = new UserEntity($row);
        }
        return $results;
    }

    /**
     * Get one page by its ID
     *
     * @param int $page_id The ID of the user
     * @return UserEntity  The user
     */
    public function getUserById($user_id) {
        $sql = "SELECT * from pguser as p
            where p.id = :user_id";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute(["user_id" => $user_id]);

        if($result) {
            return new UserEntity($stmt->fetch());
        }
    }

    public function getUserByUsername($username) { /* to edit the most recent version published or not */
    		$sql = "select * from pguser as m
    			where m.username = :username and m.status = 1";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute(["username" => $username]);
		/*return $result;*/
        if ($result) {
			$row = $stmt->fetch();
			if ($row) {
				return new UserEntity($row);
			} else {
				return false;
			}
        }
    }

    public function remove($user_id) {
		
    }

    public function update(UserEntity $user) {
		//$expires = '2016-09-16 23:30:45';
		$expires = date("Y-m-d H:i:s",strtotime(date("Y-m-d H:i:s-14:00",strtotime('now') + 3600))); // extend expires to an hour from now 
		$sql = "update pguser set hash=:hash, salt=:salt, expires=:expires, role=:role, status=:status where id=:user_id";
        $stmt = $this->db->prepare($sql);
		$result = $stmt->execute([
			"hash" => $user->getHash(),
			"salt" => $user->getSalt(),
			"expires" => $expires,
			"role" => $user->getRole(),
			"status" => $user->getStatus(),
			"user_id" => $user->getId()
		]);
		if (!$result) {
            throw new Exception("could not update record");
		}
    }

    public function save(UserEntity $user) {
        $sql = "insert into pguser
            (username, hash, salt, role, status) values
            (:username, :hash, :salt, :role, :status)"; 

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            "username" => $user->getUsername(),
            "hash" => $user->getHash(),
            "salt" => $user->getSalt(),
            "role" => $user->getRole(),
            "status" => $user->getStatus()
        ]);

        if(!$result) {
            throw new Exception("could not save record");
        }
    }
}
