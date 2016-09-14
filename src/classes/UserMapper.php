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

        if($result) {
            return new UserEntity($stmt->fetch());
        }
    }

    public function remove($user_id) {
		
    }

    public function save(UserEntity $user) {
        $sql = "insert into pguser
            (username, hash, salt, status) values
            (:username, :hash, :salt, :status)"; 

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            "username" => $user->getUsername(),
            "hash" => $user->getHash(),
            "salt" => $user->getSalt(),
            "status" => $user->getStatus()
        ]);

        if(!$result) {
            throw new Exception("could not save record");
        }
    }
}
