# boulangerie-lomoto-site

Site vitrine public de la Boulangerie Lomoto — HTML/CSS/JS statique, sans
étape de build, déployable tel quel sur n'importe quel hébergeur statique.

## Pages

- `index.html` — accueil (présentation, horaires, contact).
- `produits.html` — présentation des produits (photos), sans lien vers une
  API — contenu statique.
- `commander.html` — formulaire de demande de commande pour les
  Dépositaires/Mamans déjà enregistrés.
- `devenir-depositaire.html` — formulaire d'inscription pour devenir
  Dépositaire (nom, téléphone, adresse), pour quelqu'un qui n'est pas
  encore reconnu par la boulangerie.

## Images

`images/produits/` contient des photos de pain déjà en bac (production/
livraison), utilisées sur `produits.html` (hero + galerie) et en
illustration sur `index.html`. Ce sont les seules photos disponibles à ce
jour — aucune image de four ou de production en cours ; une éventuelle
section « notre savoir-faire » attend de vraies photos avant d'être créée.

## API consommée

`commander.html` et `devenir-depositaire.html` appellent exclusivement les
routes publiques de l'app de gestion (dépôt `kayboxstore/Boulangerie`),
déjà ouvertes en CORS pour ce chemin :

- `POST https://gestion.boulangerie-lomoto.com/api/public/demandes-commande/identifier`
- `POST https://gestion.boulangerie-lomoto.com/api/public/demandes-commande`
- `POST https://gestion.boulangerie-lomoto.com/api/public/inscription-depositaire`

Ces routes sont limitées à 10 requêtes / 15 minutes par IP. Le formulaire de
commande n'envoie jamais de `clientId` : seul le numéro de téléphone est
transmis, revérifié côté serveur à chaque étape. Le formulaire d'inscription
ne crée PAS de compte actif — la demande reste en attente jusqu'à
confirmation manuelle par l'équipe (module Commandes de l'app de gestion),
qui choisit la zone de dépôt à ce moment-là.

Le contenu de la page d'accueil (présentation, horaires, réseaux sociaux)
est à ajuster directement dans `index.html` selon les besoins réels de la
boulangerie — il n'existe pas d'API publique pour ces informations.
