# boulangerie-lomoto-site

Site vitrine public de la Boulangerie Lomoto — HTML/CSS/JS statique, sans
étape de build, déployable tel quel sur n'importe quel hébergeur statique.

## Pages

- `index.html` — accueil (présentation, horaires, contact).
- `produits.html` — présentation des produits (photos), sans lien vers une
  API — contenu statique.
- `commander.html` — formulaire de demande de commande pour les
  Dépositaires/Mamans déjà enregistrés.

## Images

`images/produits/` contient des photos de pain déjà en bac (production/
livraison), utilisées sur `produits.html` (hero + galerie) et en
illustration sur `index.html`. Ce sont les seules photos disponibles à ce
jour — aucune image de four ou de production en cours ; une éventuelle
section « notre savoir-faire » attend de vraies photos avant d'être créée.

## API consommée

`commander.html` appelle exclusivement les routes publiques de l'app de
gestion (dépôt `kayboxstore/Boulangerie`), déjà ouvertes en CORS pour ce
chemin :

- `POST https://gestion.boulangerie-lomoto.com/api/public/demandes-commande/identifier`
- `POST https://gestion.boulangerie-lomoto.com/api/public/demandes-commande`

Ces routes sont limitées à 10 requêtes / 15 minutes par IP. Le formulaire
n'envoie jamais de `clientId` : seul le numéro de téléphone est transmis,
revérifié côté serveur à chaque étape.

Le contenu de la page d'accueil (présentation, horaires, réseaux sociaux)
est à ajuster directement dans `index.html` selon les besoins réels de la
boulangerie — il n'existe pas d'API publique pour ces informations.
