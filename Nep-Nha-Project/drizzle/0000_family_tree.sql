CREATE TABLE family_tree (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  revision INTEGER NOT NULL CHECK (revision > 0),
  members_json TEXT NOT NULL
);
