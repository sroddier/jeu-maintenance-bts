-- Classement en ligne — jeu sérieux BTS Maintenance des systèmes.
--
-- Ce script est idempotent : on peut le coller et l'exécuter plusieurs fois.
-- Il ne supprime pas les résultats déjà enregistrés.
--
-- Où l'exécuter : supabase.com → le projet → SQL Editor → New query → Run.
-- Le pas à pas est dans supabase/README.md.
--
-- La clé publique du navigateur est dans src/online/config.ts.
-- Elle n'est pas un secret. Aucune clé d'administration ne doit être collée ici.

create extension if not exists pgcrypto;

create table if not exists public.resultats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pseudo text not null,
  seed text not null,
  niveau integer not null,
  score numeric not null,
  ao numeric not null,
  etoiles integer not null,
  pct_calculs_justes numeric not null,
  version_jeu text not null
);

comment on table public.resultats is
  'Résultats de fin de partie envoyés par les élèves. Écriture seule pour les élèves. Lecture et suppression pour le professeur.';

comment on column public.resultats.id is
  'Identifiant choisi par le navigateur, ou généré ici s''il manque. Le même identifiant envoyé deux fois ne crée pas une deuxième ligne.';

comment on column public.resultats.created_at is
  'Heure d''arrivée sur le serveur. La page prof l''affiche en heure de Paris.';

comment on column public.resultats.pseudo is
  'Prénom et initiale du nom, par exemple Karim B.';

comment on column public.resultats.seed is
  'Graine affichée dans le jeu (texte, par exemple 2026).';

comment on column public.resultats.ao is
  'Disponibilité opérationnelle en pourcent, entre 0 et 100.';

comment on column public.resultats.pct_calculs_justes is
  'Part des calculs justes, en pourcent, entre 0 et 100.';

comment on column public.resultats.version_jeu is
  'Version courte du jeu qui a envoyé la ligne.';

-- Les contraintes sont reposées à chaque exécution, pour pouvoir les ajuster
-- sans erreur si le script est rejoué.

alter table public.resultats drop constraint if exists resultats_pseudo_chk;
alter table public.resultats add constraint resultats_pseudo_chk check (
  char_length(pseudo) between 3 and 20
  and pseudo = btrim(pseudo)
  and pseudo ~ '^[0-9A-Za-zàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆáíóúñÁÍÓÚÑ _.-]+$'
  and pseudo ~ '[0-9A-Za-zàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆáíóúñÁÍÓÚÑ]'
);

alter table public.resultats drop constraint if exists resultats_seed_chk;
alter table public.resultats add constraint resultats_seed_chk check (
  char_length(seed) between 1 and 80
  and seed = btrim(seed)
  and seed !~ '[[:cntrl:]]'
);

alter table public.resultats drop constraint if exists resultats_niveau_chk;
alter table public.resultats add constraint resultats_niveau_chk check (
  niveau between 1 and 6
);

alter table public.resultats drop constraint if exists resultats_score_chk;
alter table public.resultats add constraint resultats_score_chk check (
  score >= 0 and score <= 100
);

alter table public.resultats drop constraint if exists resultats_ao_chk;
alter table public.resultats add constraint resultats_ao_chk check (
  ao >= 0 and ao <= 100
);

alter table public.resultats drop constraint if exists resultats_etoiles_chk;
alter table public.resultats add constraint resultats_etoiles_chk check (
  etoiles between 0 and 3
);

alter table public.resultats drop constraint if exists resultats_pct_chk;
alter table public.resultats add constraint resultats_pct_chk check (
  pct_calculs_justes >= 0 and pct_calculs_justes <= 100
);

alter table public.resultats drop constraint if exists resultats_version_chk;
alter table public.resultats add constraint resultats_version_chk check (
  char_length(version_jeu) between 1 and 32
  and version_jeu ~ '^[0-9A-Za-z.+_-]+$'
);

create index if not exists resultats_created_at_idx on public.resultats (created_at desc);

alter table public.resultats enable row level security;
alter table public.resultats force row level security;

-- Mêmes bornes que les contraintes ci-dessus. Un insert qui les viole est
-- refusé même si une contrainte était retirée par erreur.
-- Pas de politique de mise à jour : personne ne corrige une ligne, pas même
-- le professeur. Une partie d'essai se supprime.

drop policy if exists resultats_insertion on public.resultats;
create policy resultats_insertion
  on public.resultats
  for insert
  to anon, authenticated
  with check (
    char_length(pseudo) between 3 and 20
    and pseudo = btrim(pseudo)
    and pseudo ~ '^[0-9A-Za-zàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆáíóúñÁÍÓÚÑ _.-]+$'
    and pseudo ~ '[0-9A-Za-zàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆáíóúñÁÍÓÚÑ]'
    and char_length(seed) between 1 and 80
    and seed = btrim(seed)
    and seed !~ '[[:cntrl:]]'
    and niveau between 1 and 6
    and score >= 0 and score <= 100
    and ao >= 0 and ao <= 100
    and etoiles between 0 and 3
    and pct_calculs_justes >= 0 and pct_calculs_justes <= 100
    and char_length(version_jeu) between 1 and 32
    and version_jeu ~ '^[0-9A-Za-z.+_-]+$'
  );

drop policy if exists resultats_lecture_prof on public.resultats;
create policy resultats_lecture_prof
  on public.resultats
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'stephane.roddier@ac-aix-marseille.fr');

drop policy if exists resultats_suppression_prof on public.resultats;
create policy resultats_suppression_prof
  on public.resultats
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'stephane.roddier@ac-aix-marseille.fr');

-- Aucune politique SELECT, UPDATE ni DELETE pour anon.
-- Aucune politique UPDATE pour authenticated.

revoke all on table public.resultats from PUBLIC;
revoke all on table public.resultats from anon;
revoke all on table public.resultats from authenticated;

grant insert on table public.resultats to anon;
grant insert on table public.resultats to authenticated;
grant select, delete on table public.resultats to authenticated;
