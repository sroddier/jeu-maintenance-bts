# Classement en ligne

Le jeu envoie le score à la fin de la partie. Le professeur le retrouve sur la page **Espace prof**. La simulation, les corrigés et le calcul du score ne changent pas.

L'élève saisit son prénom et l'initiale de son nom, par exemple Karim B. La colonne en base s'appelle toujours `pseudo` : elle n'est pas renommée.

## Avant de mettre en ligne cette version

Avant de mettre en ligne cette version, recoller supabase/schema.sql dans le SQL Editor et cliquer sur Run (sans risque, le script est rejouable et ne supprime aucun résultat) : sinon un prénom avec un point comme Karim B. serait refusé par la base et resterait en attente dans le navigateur.

L'adresse du projet et la clé publique sont déjà dans `src/online/config.ts`. Elles sont prévues pour être dans le navigateur : ce ne sont pas des mots de passe. Il ne faut pas y ajouter de clé d'administration.

## Avant de commencer

- Le projet Supabase existe déjà.
- Le compte `stephane.roddier@ac-aix-marseille.fr` existe déjà dans Authentication.
- Les inscriptions publiques restent coupées. Ne pas les rouvrir.
- Tu n'as rien à installer de plus que ce dépôt.

## Coller le script SQL

1. Ouvre [https://supabase.com/dashboard](https://supabase.com/dashboard) et connecte-toi.
2. Ouvre le projet du jeu. Son adresse contient `mbefjocapackbcgsmnyb`.
3. Dans le menu de gauche, clique sur **SQL Editor**.
4. Clique sur **New query**.
5. Sur ton ordinateur, ouvre le fichier `supabase/schema.sql` de ce dépôt. Sur GitHub, c'est le fichier dans le dossier `supabase`.
6. Sélectionne tout le fichier (Ctrl+A) et copie-le (Ctrl+C).
7. Colle-le dans la requête vide.
8. Clique sur **Run** (ou Ctrl+Entrée).
9. En bas, tu dois voir **Success**, sans texte rouge. S'il y a une erreur, ne modifie pas le script au hasard : copie le message et demande de l'aide.
10. Tu peux cliquer encore une fois sur **Run**. Le script est prévu pour être rejoué. Il ne supprime pas les scores déjà reçus.

## Vérifier la table

1. Dans le menu de gauche, clique sur **Table Editor**.
2. La table `resultats` doit apparaître.
3. Ouvre-la. Les colonnes sont : `id`, `created_at`, `pseudo`, `seed`, `niveau`, `score`, `ao`, `etoiles`, `pct_calculs_justes`, `version_jeu`.
4. Vérifie que la sécurité des lignes est activée. Supabase l'indique par **RLS enabled**, un cadenas, ou « Row Level Security ». Les deux commandes du script (`enable` et `force`) doivent avoir réussi : sans elles, n'importe qui pourrait lire les scores.

Un élève ne peut qu'ajouter une ligne. Il ne peut pas lire, modifier ni supprimer. Seul le compte `stephane.roddier@ac-aix-marseille.fr` peut lire et supprimer. Personne ne peut modifier une ligne : une partie d'essai se supprime.

## Tester avec une partie

1. En local : `npm install`, puis `npm run dev`, puis ouvre [http://localhost:5173/jeu-maintenance-bts/](http://localhost:5173/jeu-maintenance-bts/).
2. Une fois le site publié : [https://sroddier.github.io/jeu-maintenance-bts/](https://sroddier.github.io/jeu-maintenance-bts/). La page prof est [https://sroddier.github.io/jeu-maintenance-bts/prof.html](https://sroddier.github.io/jeu-maintenance-bts/prof.html).
3. À l'accueil, l'élève saisit son prénom et l'initiale de son nom, par exemple Karim B. Le champ fait 3 à 20 caractères (lettres, chiffres, espace, tiret, underscore ou point, au moins une lettre). Le navigateur le propose à nouveau la fois suivante.
4. Joue jusqu'au bilan final (score, Ao, étoiles, pourcentage de calculs justes).
5. Sous le bilan, un texte discret dit **Score envoyé au prof**.
6. Si le réseau ou la table manque, le texte dit **Hors ligne : score gardé, renvoi automatique plus tard**. Le score repart tout seul au prochain chargement de la page, ou à la fin de la partie suivante. La sauvegarde de la partie et le bouton « Exporter le CSV » restent ceux d'avant.

## Ouvrir la page prof

1. En bas de l'accueil du jeu, clique sur **Espace prof**.
2. Connecte-toi avec `stephane.roddier@ac-aix-marseille.fr` et le mot de passe créé dans Supabase (menu Authentication). Ce n'est pas forcément le mot de passe de l'académie.
3. Il n'y a pas de lien pour créer un compte.
4. Le tableau montre le prénom, la graine, le niveau, le score, l'Ao, les étoiles, le pourcentage de calculs justes et la date en heure de Paris.
5. Clique sur un titre de colonne pour trier. Le filtre par prénom et les deux dates limitent les lignes affichées.
6. **Exporter en CSV** télécharge les lignes affichées. Le fichier est en UTF-8 avec un BOM, les colonnes sont séparées par des points-virgules, les décimales utilisent une virgule. Excel en français l'ouvre directement.
7. **Supprimer** demande une confirmation. C'est prévu pour effacer une partie de test.
8. **Actualiser** relit la table.
9. **Se déconnecter** avant de quitter un ordinateur partagé.

## Si quelque chose bloque

- **Identifiants incorrects.** Le mot de passe est celui du compte dans Supabase, menu Authentication. Vérifie aussi l'adresse, sans espace.
- **La table des résultats n'existe pas encore. Pense à exécuter supabase/schema.sql.** Reprends la section « Coller le script SQL ».
- **Aucun droit.** Seul `stephane.roddier@ac-aix-marseille.fr` peut lire. Un autre compte connecté voit ce message et rien d'autre.
- **Hors ligne chez l'élève.** Le score est gardé dans le navigateur. Quand le réseau fonctionne et que la table existe, il part au prochain chargement.

## Limites de cette version

Il n'y a pas de recalcul côté serveur, donc un élève averti pourrait envoyer un faux score depuis la console. Le score affiché est celui que le navigateur de l'élève a calculé, pas un score refait par Supabase à partir des décisions de la partie.

Le recalcul côté serveur et le meilleur de 2 essais viendront à l'étape suivante. En attendant, ce classement sert à suivre les essais du niveau 1. L'export CSV du jeu reste le document de secours. Les règles du niveau 1 (graine 2026, MTBF 180 h, MTTR 7,5 h, Ao 90 %, EX-0017 à 72 550 €) ne sont pas modifiées par cet envoi.
