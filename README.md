# Taote Fenua

Annuaire des professionnels de santé de Polynésie française : horaires, **attente en direct**, **gardes des médecins et des pharmacies**, en français (et bientôt en reo mā'ohi).

- **Public** : chercher un médecin, une pharmacie, un dispensaire par commune ou autour de soi ; voir s'il y a du monde ; appeler ; itinéraire.
- **Professionnels** : un espace protégé par identifiant (e-mail) et mot de passe pour mettre à jour le statut de la salle d'attente en un appui, les horaires et les contacts.
- **Hors connexion** : l'app s'installe sur le téléphone et affiche les dernières données même sans réseau.

> Aucune donnée de patient n'est collectée. Seuls le statut de la salle d'attente et les informations publiques du cabinet sont enregistrés.

---

## 1. Essayer tout de suite (mode démo)

Sans rien configurer, l'app fonctionne avec des **données fictives**.

Sur votre ordinateur, dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrez <http://localhost:8000>.
Espace pro : <http://localhost:8000/pro.html>, identifiant **demo@taote.pf**, mot de passe **demo1234**.

En démo, vos modifications restent dans votre navigateur (bouton « Remettre la démo à zéro » dans l'espace pro).

> Il faut passer par un petit serveur comme ci-dessus : ouvrir `index.html` en double-cliquant ne marche pas (les navigateurs bloquent les modules JavaScript dans ce cas).

---

## 2. Mettre en ligne sur GitHub Pages (gratuit)

1. Créez un dépôt sur GitHub (par ex. `taote-fenua`) et envoyez-y tous les fichiers de ce dossier.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Après une minute, l'app est en ligne à l'adresse `https://<votre-compte>.github.io/taote-fenua/`.

À ce stade elle tourne encore en mode démo. Étape suivante : la vraie base.

---

## 3. Brancher la vraie base de données (Supabase)

Supabase héberge la base et gère les comptes (connexion, mot de passe oublié, e-mails). L'offre gratuite suffit pour démarrer.

1. Créez un compte sur <https://supabase.com>, puis un **nouveau projet** (choisissez une région proche, mot de passe de base solide, à garder).
2. **SQL Editor → New query** : collez tout le contenu de [`supabase/schema.sql`](supabase/schema.sql), puis **Run**.
3. *(Facultatif)* Pour tester avec des données fictives : collez et lancez [`supabase/seed.sql`](supabase/seed.sql). Pensez à les effacer avant l'ouverture au public (la commande est en haut du fichier).
4. **Project Settings → API** : copiez **Project URL** et la clé **anon public** dans [`assets/js/config.js`](assets/js/config.js) :

   ```js
   SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```

   La clé `anon` est faite pour être publique : ce sont les règles de la base qui protègent les données.
   **Ne mettez jamais la clé `service_role`** dans ce fichier ni sur GitHub.

5. **Authentication** — réglages importants :
   - **Désactivez les inscriptions publiques** (option *Allow new users to sign up*) : personne ne doit pouvoir se créer un compte « médecin » tout seul. Les comptes sont créés uniquement par invitation.
   - **URL Configuration** : mettez l'adresse de votre site GitHub Pages comme *Site URL*, et ajoutez `https://<votre-compte>.github.io/taote-fenua/pro.html` dans les *Redirect URLs* (pour les liens d'invitation et de mot de passe oublié).
   - *(Recommandé avant l'ouverture)* : configurez un envoi d'e-mails (SMTP) à votre nom ; l'envoi intégré de Supabase est limité à quelques e-mails par heure.

6. Envoyez la modification de `config.js` sur GitHub. L'app utilise désormais la vraie base.

Les noms exacts des menus Supabase peuvent changer légèrement avec le temps ; les réglages restent les mêmes.

---

## 4. Administrer : comptes des professionnels

Toutes les commandes sont prêtes dans [`supabase/admin.sql`](supabase/admin.sql) (remplacez les valeurs entre `< >`).

**Une seule fois** — vous déclarer administrateur :
Authentication → Users → *Add user* avec votre e-mail, puis la requête **A** du fichier.

**Pour chaque cabinet :**

1. Ajoutez l'établissement (requête **B**).
2. Authentication → Users → **Invite user** avec l'e-mail du professionnel. Il reçoit un lien, arrive sur `pro.html` et **choisit lui-même son mot de passe**.
3. Reliez son compte à son établissement (requête **C**). Sans ce lien, il voit « Compte en attente ».

Ensuite, le professionnel se connecte sur `pro.html` avec son e-mail et son mot de passe. S'il l'oublie : bouton **Mot de passe oublié**, il reçoit un lien par e-mail.

**Ce qu'un professionnel peut faire :** statut de la salle d'attente, attente estimée, sans RDV aujourd'hui, téléphones, adresse (PK, côté, repère), position GPS, horaires, informations pratiques — **uniquement pour son propre établissement**.
**Ce qui reste réservé à l'administrateur :** nom et type de l'établissement, création, masquage, gardes, attribution des accès.

**Gardes du week-end** : saisissez-les chaque semaine depuis le tour de garde officiel (requête **E**).

---

## 5. Sécurité : ce qui est vérifié

Les règles sont dans la base elle-même (Row Level Security), pas seulement dans l'app : même un petit malin qui contourne l'interface ne peut pas les franchir. Elles ont été testées une par une :

| Qui | Peut | Ne peut pas |
|---|---|---|
| Public | lire l'annuaire, envoyer un signalement anonyme (1 toutes les 30 s par cabinet) | modifier quoi que ce soit, voir qui gère quel cabinet |
| Professionnel | modifier **son** statut et **sa** fiche | toucher à un autre cabinet, renommer le sien, se donner des droits, créer des gardes, antidater son statut |
| Administrateur | tout | — |

Autres protections : un statut de plus de 3 heures n'est plus affiché (« Attente non communiquée ») pour ne jamais montrer une info périmée ; tout texte saisi est neutralisé avant affichage.

---

## 6. Organisation des fichiers

```
index.html              Annuaire public (accueil, fiche, gardes)
pro.html                Espace professionnel (connexion, statut, fiche)
assets/js/config.js     ← la seule chose à modifier pour passer en vrai
assets/js/api.js        Accès aux données (Supabase ou démo)
assets/js/app.js        Pages publiques
assets/js/pro.js        Espace pro
assets/js/ui.js         Horaires, statuts, adresses, téléphones
assets/js/i18n.js       Textes français / reo mā'ohi
assets/css/app.css      Apparence
data/demo.json          Données fictives du mode démo
supabase/schema.sql     Tables et règles de sécurité
supabase/admin.sql      Commandes de l'administrateur
supabase/seed.sql       Données de test (facultatif)
sw.js, manifest…        Installation sur téléphone et hors connexion
```

Aucune étape de compilation : on modifie un fichier, on l'envoie sur GitHub, c'est en ligne.
Après une mise à jour, changez `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

---

## 7. Reo mā'ohi

Le bouton **Reo** est en place, mais les traductions sont volontairement vides (sauf « Ia ora na ») : elles doivent être écrites et relues par un locuteur natif. Elles se remplissent dans `assets/js/i18n.js`, section `ty` ; tout texte non traduit s'affiche en français.

---

## 8. Prochaines étapes possibles

- Une carte interactive des établissements (bouton Liste / Carte de la maquette).
- Un écran d'administration dans l'app (au lieu des requêtes SQL).
- L'import automatique du tour de garde de l'Ordre des médecins, si celui-ci accepte de le partager.
- Des alertes quand l'attente baisse dans un cabinet suivi.

## Licence

À choisir avant de rendre le dépôt public (par ex. MIT pour le code). Les polices DM Sans et Bricolage Grotesque sont sous licence SIL Open Font License (fichiers dans `assets/fonts/`).
