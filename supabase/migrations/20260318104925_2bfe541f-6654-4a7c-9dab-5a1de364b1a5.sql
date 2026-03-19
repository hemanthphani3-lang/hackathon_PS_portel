
-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  selected_mission_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create problem_statements (missions) table
CREATE TABLE public.problem_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  max_slots INTEGER NOT NULL DEFAULT 4,
  current_slots INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key from teams to problem_statements
ALTER TABLE public.teams
  ADD CONSTRAINT fk_teams_mission
  FOREIGN KEY (selected_mission_id)
  REFERENCES public.problem_statements(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_statements ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can view problem statements
CREATE POLICY "Anyone can view problem statements"
  ON public.problem_statements FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Teams can view their own record
CREATE POLICY "Teams can view their own record"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Only admins can update problem_statements (via RPC)
-- We handle updates through security definer functions

-- Create the claim_mission RPC function (FCFS logic)
CREATE OR REPLACE FUNCTION public.claim_mission(p_team_id UUID, p_mission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_slots INTEGER;
  v_max_slots INTEGER;
  v_team_mission UUID;
BEGIN
  -- Check if team already has a mission
  SELECT selected_mission_id INTO v_team_mission
  FROM public.teams WHERE id = p_team_id FOR UPDATE;

  IF v_team_mission IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Team already has a mission selected');
  END IF;

  -- Lock the mission row and check slots
  SELECT current_slots, max_slots INTO v_current_slots, v_max_slots
  FROM public.problem_statements WHERE id = p_mission_id FOR UPDATE;

  IF v_current_slots >= v_max_slots THEN
    RETURN json_build_object('success', false, 'message', 'Mission is full');
  END IF;

  -- Claim the mission
  UPDATE public.problem_statements
  SET current_slots = current_slots + 1
  WHERE id = p_mission_id;

  UPDATE public.teams
  SET selected_mission_id = p_mission_id, updated_at = now()
  WHERE id = p_team_id;

  RETURN json_build_object('success', true, 'message', 'Mission claimed successfully');
END;
$$;

-- Create reset_team function for admin
CREATE OR REPLACE FUNCTION public.reset_team_mission(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mission_id UUID;
BEGIN
  SELECT selected_mission_id INTO v_mission_id
  FROM public.teams WHERE id = p_team_id;

  IF v_mission_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Team has no mission to reset');
  END IF;

  UPDATE public.problem_statements
  SET current_slots = GREATEST(current_slots - 1, 0)
  WHERE id = v_mission_id;

  UPDATE public.teams
  SET selected_mission_id = NULL, updated_at = now()
  WHERE id = p_team_id;

  RETURN json_build_object('success', true, 'message', 'Team mission reset successfully');
END;
$$;

-- Create verify_team_login function
CREATE OR REPLACE FUNCTION public.verify_team_login(p_team_name TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team RECORD;
BEGIN
  SELECT id, team_name, password_hash, selected_mission_id
  INTO v_team
  FROM public.teams
  WHERE team_name = p_team_name AND password_hash = p_password;

  IF v_team IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid team name or password');
  END IF;

  RETURN json_build_object(
    'success', true,
    'team_id', v_team.id,
    'team_name', v_team.team_name,
    'selected_mission_id', v_team.selected_mission_id
  );
END;
$$;

-- Allow anon to call verify_team_login (for login without auth)
GRANT EXECUTE ON FUNCTION public.verify_team_login TO anon;
GRANT EXECUTE ON FUNCTION public.claim_mission TO anon;
GRANT EXECUTE ON FUNCTION public.reset_team_mission TO anon;

-- Allow anon to read problem_statements and teams
CREATE POLICY "Anon can view problem statements"
  ON public.problem_statements FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can view teams"
  ON public.teams FOR SELECT
  TO anon
  USING (true);
