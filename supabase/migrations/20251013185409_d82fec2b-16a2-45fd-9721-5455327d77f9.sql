-- Add foreign key relationship between group_chat_messages and profiles
ALTER TABLE public.group_chat_messages
ADD CONSTRAINT group_chat_messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;