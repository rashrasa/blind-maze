CREATE TABLE users (
    uuid UUID PRIMARY KEY UNIQUE REFERENCES auth.users,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    color_descriptor TEXT
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own profile" ON users FOR
UPDATE USING (
    (
        SELECT auth.uid ()
    ) = uuid
);