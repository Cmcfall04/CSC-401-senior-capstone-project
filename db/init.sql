CREATE DATABASE pantry;
\c pantry;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL
);

INSERT INTO items (name, quantity) VALUES ('Bread', 3);
INSERT INTO items (name, quantity) VALUES ('Milk', 2);
INSERT INTO items (name, quantity) VALUES ('Eggs', 12);
INSERT INTO users (name, password, email) VALUES ('admin', 'admin', 'admin@admin.com');