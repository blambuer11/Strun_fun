-- Create group chat messages table
CREATE TABLE public.group_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Group members can view messages
CREATE POLICY "Group members can view messages"
ON public.group_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_chat_messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Group members can send messages
CREATE POLICY "Group members can send messages"
ON public.group_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_chat_messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Enable realtime for group chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;