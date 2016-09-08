<?php

class PageEntity
{
    protected $id;
    protected $type;
    protected $handle;
    protected $description;
    protected $locator;
    protected $version;
    protected $status;
    protected $content;
    protected $editor;
    protected $created;
    protected $modified;
    protected $start;

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

        $this->type = $data['type'];
        $this->handle = $data['handle'];
        $this->description = $data['description'];
        $this->locator = $data['locator'];
        $this->version = $data['version'];
        $this->status = $data['status'];
        $this->content = $data['content'];
        $this->editor = $data['editor'];
		$this->modified = $data['modified']; /* auto timestamp */
        $this->start = $data['start'];
    }

    public function getId() {
        return $this->id;
    }

    public function getType() {
        return $this->type;
    }

    public function getHandle() {
        return $this->handle;
    }

    public function getDescription() {
        return $this->description;
    }

    public function getLocator() {
        return $this->locator;
    }

    public function getVersion() {
        return $this->version;
    }

    public function getStatus() {
        return $this->status;
    }

    public function getContent() {
        return $this->content;
    }

    public function getEditor() {
        return $this->editor;
    }

    public function getCreated() {
        return $this->created;
    }

    public function getModified() {
        return $this->modified;
    }

    public function getStart() {
        return $this->start;
    }
}
