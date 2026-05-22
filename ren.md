# Alliance REN (Dofus) - Mémoire

## Infos
- **Client :** Alliance REN
- **Univers :** Dofus (MMORPG)
- **Type :** Site d'alliance — gestion membres, stats, événements, boutique internes
- **Dossier :** `Création site Web/REN/`
- **Statut :** 🟢 Site avancé, up to date — **carte percos en pause**

## Stack technique
- HTML/CSS/JS vanilla
- Déploiement : Vercel — https://ren-alliance-pvp.vercel.app
- **Backend Supabase :**
  - **Nom :** `alliance-ren`
  - **Project ID :** `sptvkumqciuegjuvmyhf`
  - **Org ID :** `mzyaxpvkleflretaacov`
  - **Région :** West EU (Ireland)
  - **Créé :** 22/02/2026
  - **Dashboard :** https://supabase.com/dashboard/project/sptvkumqciuegjuvmyhf
  - Base SQL avec 10+ migrations dans `sql/`
- **Git :** https://github.com/Mathieu8861/ren-alliance-pvp (racine) — **Branche :** master
- **Dernier commit :** `9561291` (12/04/2026) — "feat: zones réservées BDA (Banque d'Alliance)"
- **Statut git :** 🟡 modifs en cours (feature recyclages percepteurs — non commit)

## Structure
### Site (`site/`)
- `index.html` — Accueil alliance
- `connexion.html` — Login membres
- `admin.html` — Backoffice admin alliance
- `membres.html`, `profil.html` — Gestion membres
- `jeux.html` — Minijeux / événements
- `classement.html`, `board.html` — Classements + dashboard
- `historique.html` — Historique parties
- `attaque.html`, `defense.html` — Stats PvP
- `cartes.html`, `builds.html` — Gestion cartes persos / builds
- `boutique.html` — Boutique internal kamas
- `recyclages.html` — **Suivi recyclages percepteurs (pépites perso/alliance par zone)**
- `demo-cadres.html` — Démo cadres
- `liens.html` — Liens utiles
- `slot.html` — Système de slot
- `js/`, `script.js`, `assets/`

### Screenshots racine
- `Page d'accueil.jpg`
- `admin gestion jeu 1.jpg`, `admin gestion jeu 2.jpg`
- `admin gestion utilisateurs.jpg`, `admin historique jeux.jpg`
- `admin validatino en attente.jpg`, `admin-gestion des alliances.jpg`
- `attaque.jpg`, `def.jpg`, `jeu.jpg`, `historique.jpg`, `membre.jpg`
- `classement.jpg`, `classement kamas volés.jpg`, `classement pvp définitif.jpg`

### SQL (`sql/`)
- `001-schema.sql` — Schéma base
- `002-triggers.sql`, `003-views.sql`, `004-rls.sql`
- `005-bareme-split.sql` + `005-securite.sql` (⚠️ même numéro)
- `006-board-hebdo.sql`, `007-boutique.sql`
- `008-securisation.sql` + `008-slot.sql` (⚠️ même numéro)
- `009-slot-v2.sql`, `010-boutique-kamas.sql`, `011-convert-kamatrix.sql`
- `012-remboursement.sql`, `013-zones-bda.sql`
- `014-recyclages.sql` — **Tables zones_perco + recyclages, vues stats, RLS, seed 12 zones**
- `015-zones-type-dj.sql` — Colonne type ('zone' / 'dj') sur zones_perco
- `016-recyclages-preuves-hebdo.sql` — Colonne preuve_url + vues v_recyclages_semaine_par_user/global + policies storage
- `017-zones-dofus-seed.sql` — **Seed complet ~298 zones Dofus (territoires + donjons) issus du panneau Anomalies**

## Historique & Décisions
- Système complet gestion alliance : membres, classements, PvP, boutique kamas, board hebdo
- **Carte percos en pause** — feature mise en standby par le client
- **22/05/2026 — feat: Suivi recyclages percepteurs + refonte sidebar**
  - Migration SQL `014-recyclages.sql` (tables `zones_perco` + `recyclages` + 3 vues stats + RLS + seed 12 zones)
  - Migration SQL `015-zones-type-dj.sql` (colonne type 'zone'/'dj' pour différencier zone extérieure et donjon)
  - Migration SQL `016-recyclages-preuves-hebdo.sql` (colonne preuve_url + vues hebdo ISO + policies storage)
  - Migration SQL `017-zones-dofus-seed.sql` (seed exhaustif ~298 entrées zones + donjons Dofus, sources screens panneau Anomalies IG)
  - Page `recyclages.html` : refonte en **3 onglets** (Saisir / Mes stats / Alliance) avec lazy load, mini bandeau "Tu as gagné X pépites en N tirs" sur l'onglet Saisir
  - Form Saisir : textarea regex auto-parse, **toggle Zone/Donjon**, autocomplete searchable pour la zone (insensible aux accents, filtre par type), auto-cost depuis niveau, **paste image preuve** (Ctrl+V → upload Supabase Storage)
  - Badge "Vérifié ✓" dans l'historique pour les recyclages avec preuve
  - JS `js/recyclages.js` : module IIFE pattern `ren:ready`, parse chat live, autocomplete zones, gestion preuves, switch panels avec invalidation
  - Sections admin (groupe Économie) :
    - `Recyclages hebdo` : KPI total alliance + classement membres + détails recyclages avec preuves cliquables (semaine ISO en cours)
    - `Zones Recyclage` : CRUD zones avec auto-calc coût pose + select type
  - **Refonte sidebar publique** : pattern injection JS dans script.js (SIDEBAR_GROUPS), groupes par activité (Accueil / PvP / Alliance / Économie / Fun), logo + user actions intégrés en haut/bas de la sidebar desktop, header masqué desktop, drawer mobile via hamburger conservé
  - Suppression du header desktop : main et footer occupent toute la zone à droite de la sidebar
  - "Board hebdo" renommé en "Droits Perco" (label nav uniquement)
  - CSS : ~400 lignes ajoutées (recyc-*, app-sidebar*, recyc-toggle, recyc-preuve, recyc-mini-perso, etc.)

## Storage Supabase
- Bucket **`preuves-recyclages`** (public) — créé manuellement via Supabase Dashboard
- Policies via migration 016 : INSERT membres validés / SELECT public / DELETE owner ou admin

## Prochaines étapes
- **Tester en prod** : saisie d'un recyclage avec preuve + récap admin hebdo
- Ajuster les noms des zones seedées en BO si besoin (sans accents par défaut, ré-ajouter accents pour matcher le jeu)
- Commit + push après validation : `feat: suivi recyclages percepteurs full + refonte sidebar publique`
- Reprendre éventuellement la carte percos (actuellement en pause)

## Notes
- ⚠️ Doublons de numérotation SQL : `005-*` et `008-*` ont chacun 2 fichiers → à ranger éventuellement
- Projet communautaire (MMORPG) — pas de revenus directs, probablement gratuit pour l'alliance
