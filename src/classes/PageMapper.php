<?php

class PageMapper extends Mapper
{
    public function getPages() {
        $sql = "SELECT * from pgcontent p";
        $stmt = $this->db->query($sql);

        $results = [];
        while($row = $stmt->fetch()) {
            $results[] = new PageEntity($row);
        }
        return $results;
    }

    /**
     * Get one page by its ID
     *
     * @param int $page_id The ID of the ticket
     * @return PageEntity  The page
     */
    public function getPageById($page_id) {
        $sql = "SELECT * from pgcontent p
            where p.id = :page_id";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute(["page_id" => $page_id]);

        if($result) {
            return new PageEntity($stmt->fetch());
        }

    }

    public function getPageByHandle($page_handle) {
        $sql = "select * from pgcontent p
            where p.handle = :page_handle and p.id = (select max(id) from pgcontent)";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute(["page_handle" => $page_handle]);

        if($result) {
            return new PageEntity($stmt->fetchAll());
        }

    }

    public function save(PageEntity $page) {
        $sql = "insert into pgcontent
            (type, handle, description, locator, version, status, content, editor, start) values
            (:type, :handle, :description, :locator, :version, :status, :content, :editor, :start)"; 

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            "type" => $page->getType(),
            "handle" => $page->getHandle(),
            "description" => $page->getDescription(),
            "locator" => $page->getLocator(),
            "version" => $page->getVersion(),
            "status" => $page->getStatus(),
            "content" => $page->getContent(),
            "editor" => $page->getEditor(),
            "start" => $page->getStart(),
        ]);

        if(!$result) {
            throw new Exception("could not save record");
        }
    }
}
