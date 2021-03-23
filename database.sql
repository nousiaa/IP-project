#DB - mysql

CREATE DATABASE IPproject;

CREATE TABLE data(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id int,
    drawing_id int,
    command LONGTEXT,
    deleted int,
    linked_to int
);

CREATE TABLE drawing(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name LONGTEXT,
    owner_id int,
    description LONGTEXT, 
    allowed_users LONGTEXT, 
    deleted int
);
CREATE TABLE user(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    username LONGTEXT NOT NULL,
    password LONGTEXT NOT NULL, 
    deleted int
);
CREATE TABLE allowed_users(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    drawing_id int,
    user_id int,
    deleted int
);

#test,test
INSERT INTO user (username, password, deleted ) VALUES ("test","$2y$10$x89D0NaocUnJNcPAuL1vb.RZZAg1xRAC43hKQsUZ2lsdV/.XbJ7Yu",0);