\c pantry;

-- Users
INSERT INTO users (name, password, email) VALUES 
('Parker Malmgren', 'password123', 'parker@email.com'),
('Michael Krueger', 'password123', 'michael@email.com'),
('Creed McFall', 'password123', 'creed@email.com'),
('Zachary Meyer', 'password123', 'zach@email.com'),
('Sarah Johnson', 'password123', 'sarah@email.com'),
('Admin User', 'admin', 'admin@admin.com');

-- Households
INSERT INTO households (name, status) VALUES 
('Malmgren Family', 'active'),
('College Apartment 204', 'active'),
('Downtown Loft', 'inactive');

-- Household Users (linking users to households)
INSERT INTO household_users (household_id, user_id, role, status) VALUES 
(1, 1, 'owner', 'active'),
(1, 5, 'member', 'active'),
(2, 2, 'owner', 'active'),
(2, 3, 'member', 'active'),
(2, 4, 'member', 'active'),
(3, 6, 'owner', 'inactive');
