-- ============================================================================
-- Table : ref.abacus_academy_formulaires
-- Projet Supabase : Gaia (oezaby)  — schema `ref`
-- Collecte des soumissions du formulaire de prospection ABACUS Academy
-- (page https://abacus-rh.com/academy)
--
-- A EXECUTER MANUELLEMENT dans le SQL editor Supabase (oezaby).
-- Le DDL n'est pas possible via l'API REST.
--
-- Respecte la REGLE OBLIGATOIRE du projet (CLAUDE.md) :
--   GRANTs explicites + RLS + policy apres chaque CREATE TABLE (schema expose).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS ref;

CREATE TABLE IF NOT EXISTS ref.abacus_academy_formulaires (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement  text,
  contact_nom    text,
  email          text,
  telephone      text,
  pays           text,
  effectif       text,
  interet        text,
  interet_autre  text,
  message        text,
  source         text         DEFAULT 'form_web',
  traite         boolean      DEFAULT false,
  created_at     timestamptz  DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- GRANTs explicites (Supabase ne les pose plus par defaut depuis mai 2026)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA ref TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ref.abacus_academy_formulaires TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ref.abacus_academy_formulaires TO service_role;
-- Pas d'acces `anon` : l'insertion publique passe par la fonction serverless
-- Vercel qui utilise la cle service_role (jamais exposee cote client).

-- ----------------------------------------------------------------------------
-- RLS obligatoire
-- ----------------------------------------------------------------------------
ALTER TABLE ref.abacus_academy_formulaires ENABLE ROW LEVEL SECURITY;

-- Policy minimale : acces complet pour les utilisateurs authentifies.
-- (service_role bypasse la RLS par design ; c'est lui qui insere via l'API.)
DROP POLICY IF EXISTS "auth_all_abacus_academy_formulaires"
  ON ref.abacus_academy_formulaires;
CREATE POLICY "auth_all_abacus_academy_formulaires"
  ON ref.abacus_academy_formulaires
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Index utile pour le suivi (tri par date, filtre des non traites)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_academy_form_created
  ON ref.abacus_academy_formulaires (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_form_traite
  ON ref.abacus_academy_formulaires (traite) WHERE traite = false;

-- ----------------------------------------------------------------------------
-- IMPORTANT : exposer le schema `ref` a l'API REST si ce n'est pas deja fait.
-- Dashboard Supabase (oezaby) > Project Settings > API > "Exposed schemas"
-- -> ajouter `ref`  (sinon l'INSERT REST renvoie 404 / "schema must be one of").
-- ----------------------------------------------------------------------------
