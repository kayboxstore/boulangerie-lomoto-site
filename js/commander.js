(() => {
  "use strict";

  // API de gestion interne — CORS déjà ouvert spécifiquement pour ce chemin
  // public, aucun proxy nécessaire depuis ce site.
  const API_BASE = "https://gestion.boulangerie-lomoto.com/api/public/demandes-commande";

  const MESSAGE_ERREUR_GENERIQUE =
    "Une erreur est survenue. Merci de réessayer dans un instant.";
  const MESSAGE_LIMITE =
    "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.";
  const MESSAGE_NON_ENREGISTRE =
    "Ce numéro n'est pas encore enregistré comme Dépositaire — contactez-nous pour en devenir un.";
  const MESSAGE_PRODUITS_INDISPONIBLES =
    "Impossible de charger la liste des produits pour l'instant. Merci de recharger la page.";

  const formIdentification = document.getElementById("formulaire-identification");
  const formDemande = document.getElementById("formulaire-demande");
  const zoneConfirmation = document.getElementById("zone-confirmation");

  const zoneMessageIdentification = document.getElementById("zone-message-identification");
  const zoneMessageDemande = document.getElementById("zone-message-demande");

  const champTelephone = document.getElementById("telephone");
  const boutonIdentification = document.getElementById("bouton-identification");

  const nomClientEl = document.getElementById("nom-client");
  const qualiteClientEl = document.getElementById("qualite-client");
  const champDateSouhaitee = document.getElementById("date-souhaitee");
  const champNote = document.getElementById("note");
  const boutonDemande = document.getElementById("bouton-demande");
  const boutonChangerNumero = document.getElementById("bouton-changer-numero");
  const boutonNouvelleDemande = document.getElementById("bouton-nouvelle-demande");

  const zoneProduits = document.getElementById("zone-produits");
  const totalBacsEl = document.getElementById("total-bacs");

  // Ordre d'affichage voulu, indépendant de l'ordre alphabétique renvoyé par
  // l'API (qui trierait "1.000" avant "500"). Un produit absent de cette
  // liste (cas imprévu) est simplement ajouté à la suite, alphabétiquement.
  const ORDRE_NOMS_PREFERE = ["Baguette 500 Fc", "Baguette 1.000 Fc", "Carré 1.500 Fc", "Carré 1.000 Fc"];

  // { produit: {id, nom, prixVente}, input: HTMLInputElement }[] — reconstruit
  // à chaque chargement des produits (au démarrage de la page).
  let champsProduits = [];

  function lireQuantite(input) {
    const n = Number.parseInt(input.value, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function recalculerTotal() {
    const total = champsProduits.reduce((somme, cp) => somme + lireQuantite(cp.input), 0);
    totalBacsEl.textContent = String(total);
    return total;
  }

  function composerLignes() {
    return champsProduits
      .map((cp) => ({ produitId: cp.produit.id, quantite: lireQuantite(cp.input) }))
      .filter((ligne) => ligne.quantite > 0);
  }

  function reinitialiserChampsProduits() {
    for (const cp of champsProduits) cp.input.value = "0";
    recalculerTotal();
  }

  function trierProduits(produits) {
    return [...produits].sort((a, b) => {
      const ia = ORDRE_NOMS_PREFERE.indexOf(a.nom);
      const ib = ORDRE_NOMS_PREFERE.indexOf(b.nom);
      if (ia === -1 && ib === -1) return a.nom.localeCompare(b.nom);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  function rendreChampsProduits(produits) {
    zoneProduits.innerHTML = "";
    champsProduits = [];

    if (produits.length === 0) {
      const p = document.createElement("p");
      p.className = "message message-erreur";
      p.style.margin = "0";
      p.textContent = MESSAGE_PRODUITS_INDISPONIBLES;
      zoneProduits.appendChild(p);
      return;
    }

    for (const produit of produits) {
      const wrapper = document.createElement("div");
      wrapper.className = "champ-produit";

      const inputId = `bacs-${produit.id}`;
      const label = document.createElement("label");
      label.setAttribute("for", inputId);
      label.textContent = produit.nom;

      const input = document.createElement("input");
      input.type = "number";
      input.id = inputId;
      input.min = "0";
      input.step = "1";
      input.value = "0";
      input.inputMode = "numeric";
      input.addEventListener("input", recalculerTotal);

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      zoneProduits.appendChild(wrapper);
      champsProduits.push({ produit, input });
    }

    recalculerTotal();
  }

  async function chargerProduits() {
    try {
      const reponse = await fetch(`${API_BASE}/produits`);
      if (!reponse.ok) throw new Error("échec chargement produits");
      const corps = await reponse.json();
      const produits = Array.isArray(corps.produits) ? corps.produits : [];
      rendreChampsProduits(trierProduits(produits));
    } catch {
      rendreChampsProduits([]);
    }
  }

  chargerProduits();

  // Téléphone déjà confirmé par /identifier — jamais un clientId : l'API le
  // revérifie de toute façon à la soumission, donc autant garder la même
  // donnée que celle prouvée par l'utilisateur.
  let telephoneConfirme = "";

  function afficherMessage(zone, texte, type) {
    zone.innerHTML = "";
    if (!texte) return;
    const div = document.createElement("div");
    div.className = `message message-${type}`;
    div.textContent = texte;
    zone.appendChild(div);
  }

  function viderMessage(zone) {
    zone.innerHTML = "";
  }

  async function messageErreurDepuisReponse(reponse, messageParDefaut) {
    if (reponse.status === 429) return MESSAGE_LIMITE;
    try {
      const corps = await reponse.json();
      if (corps && typeof corps.erreur === "string" && corps.erreur.trim()) {
        return corps.erreur;
      }
    } catch {
      // Corps non-JSON ou vide : on garde le message par défaut.
    }
    return messageParDefaut;
  }

  function basculerChargement(bouton, enCours, texteNormal) {
    bouton.disabled = enCours;
    bouton.textContent = enCours ? "Veuillez patienter…" : texteNormal;
  }

  function afficherEtapeIdentification() {
    formIdentification.hidden = false;
    formDemande.hidden = true;
    zoneConfirmation.hidden = true;
    viderMessage(zoneMessageDemande);
  }

  function afficherEtapeDemande(nom, typeClient) {
    nomClientEl.textContent = nom;
    qualiteClientEl.textContent = typeClient;
    formIdentification.hidden = true;
    formDemande.hidden = false;
    zoneConfirmation.hidden = true;
    viderMessage(zoneMessageIdentification);
  }

  function afficherEtapeConfirmation() {
    formIdentification.hidden = true;
    formDemande.hidden = true;
    zoneConfirmation.hidden = false;
  }

  formIdentification.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    viderMessage(zoneMessageIdentification);

    const telephone = champTelephone.value.trim();
    if (!telephone) {
      afficherMessage(zoneMessageIdentification, "Merci de saisir votre numéro de téléphone.", "erreur");
      return;
    }

    basculerChargement(boutonIdentification, true, "Continuer");
    try {
      const reponse = await fetch(`${API_BASE}/identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telephone }),
      });

      if (reponse.status === 404) {
        afficherMessage(zoneMessageIdentification, MESSAGE_NON_ENREGISTRE, "erreur");
        return;
      }

      if (!reponse.ok) {
        const message = await messageErreurDepuisReponse(reponse, MESSAGE_ERREUR_GENERIQUE);
        afficherMessage(zoneMessageIdentification, message, "erreur");
        return;
      }

      const corps = await reponse.json();
      telephoneConfirme = telephone;
      afficherEtapeDemande(corps.nom, corps.typeClient);
    } catch {
      afficherMessage(zoneMessageIdentification, MESSAGE_ERREUR_GENERIQUE, "erreur");
    } finally {
      basculerChargement(boutonIdentification, false, "Continuer");
    }
  });

  formDemande.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    viderMessage(zoneMessageDemande);

    if (champsProduits.length === 0) {
      afficherMessage(zoneMessageDemande, MESSAGE_PRODUITS_INDISPONIBLES, "erreur");
      return;
    }

    const lignes = composerLignes();
    if (lignes.length === 0) {
      afficherMessage(zoneMessageDemande, "Merci d'indiquer au moins 1 bac au total, sur l'un des produits.", "erreur");
      return;
    }

    if (!champDateSouhaitee.value) {
      afficherMessage(zoneMessageDemande, "Merci d'indiquer une date souhaitée.", "erreur");
      return;
    }

    const corpsRequete = {
      telephone: telephoneConfirme,
      dateSouhaitee: champDateSouhaitee.value,
      lignes,
    };
    const commentaireLibre = champNote.value.trim();
    if (commentaireLibre) corpsRequete.note = commentaireLibre;

    basculerChargement(boutonDemande, true, "Envoyer ma demande");
    try {
      const reponse = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpsRequete),
      });

      if (reponse.status === 404) {
        // Le numéro a pu être désactivé entre l'identification et l'envoi —
        // on revérifie côté serveur à chaque étape, jamais de confiance
        // aveugle dans l'état affiché à l'écran.
        afficherMessage(zoneMessageIdentification, MESSAGE_NON_ENREGISTRE, "erreur");
        afficherEtapeIdentification();
        return;
      }

      if (!reponse.ok) {
        const message = await messageErreurDepuisReponse(reponse, MESSAGE_ERREUR_GENERIQUE);
        afficherMessage(zoneMessageDemande, message, "erreur");
        return;
      }

      formDemande.reset();
      reinitialiserChampsProduits();
      afficherEtapeConfirmation();
    } catch {
      afficherMessage(zoneMessageDemande, MESSAGE_ERREUR_GENERIQUE, "erreur");
    } finally {
      basculerChargement(boutonDemande, false, "Envoyer ma demande");
    }
  });

  boutonChangerNumero.addEventListener("click", () => {
    telephoneConfirme = "";
    champTelephone.value = "";
    formDemande.reset();
    reinitialiserChampsProduits();
    afficherEtapeIdentification();
    champTelephone.focus();
  });

  boutonNouvelleDemande.addEventListener("click", () => {
    telephoneConfirme = "";
    formIdentification.reset();
    formDemande.reset();
    reinitialiserChampsProduits();
    afficherEtapeIdentification();
  });
})();
