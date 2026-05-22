-- Legacy column name from LINE Login; app auth is Google (+ optional email/password).
ALTER TABLE users RENAME COLUMN line_id TO auth_subject;
ALTER TABLE users RENAME CONSTRAINT users_line_id_unique TO users_auth_subject_unique;
