create database if not exists Ucad;
use Ucad;

create table if not exists users(
	id INT AUTO_INCREMENT PRIMARY KEY,
	name varchar(255),
	email varchar(255) UNIQUE,
	password varchar(255)
);

create table if not exists posts(
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	content TEXT,
	image LONGBLOB,
	image_type varchar(50),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

create table if not exists comments(
	id INT AUTO_INCREMENT PRIMARY KEY,
	post_id INT NOT NULL,
	user_id INT NOT NULL,
	content TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);