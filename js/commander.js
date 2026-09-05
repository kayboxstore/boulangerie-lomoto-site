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

  // Ordre volontairement fixe (demandé tel quel) : sert à la fois à l'affichage
  // des 4 champs et à la composition du détail dans la note.
  const PRODUITS = [
    { id: "bacs-baguette-500", detailLabel: "Baguette 500Fc" },
    { id: "bacs-baguette-1000", detailLabel: "Baguette 1000Fc" },
    { id: "bacs-carre-1500", detailLabel: "Carré 1500Fc" },
    { id: "bacs-carre-1000", detailLabel: "Carré 1000Fc" },
  ];
  const champsProduits = PRODUITS.map((p) => document.getElementById(p.id));
  const totalBacsEl = document.getElementById("total-bacs");
  const LONGUEUR_MAX_NOTE = 500;

  function lireQuantite(champ) {
    const n = Number.parseInt(champ.value, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function recalculerTotal() {
    const total = champsProduits.reduce((somme, champ) => somme + lireQuantite(champ), 0);
    totalBacsEl.textContent = String(total);
    return total;
  }

  function composerDetailProduits() {
    const parties = PRODUITS.map((produit, i) => {
      const quantite = lireQuantite(champsProduits[i]);
      return quantite > 0 ? `${quantite} bac(s) ${produit.detailLabel}` : null;
    }).filter((partie) => partie !== null);
    return parties.length > 0 ? `Détail : ${parties.join(", ")}.` : "";
  }

  champsProduits.forEach((champ) => champ.addEventListener("input", recalculerTotal));
  recalculerTotal();

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

    const quantiteBacs = recalculerTotal();
    if (quantiteBacs < 1) {
      afficherMessage(zoneMessageDemande, "Merci d'indiquer au moins 1 bac au total, sur l'un des produits.", "erreur");
      return;
    }

    // Le détail auto-généré vient toujours en premier, le commentaire libre du
    // client (s'il y en a un) est ajouté à la suite — jamais l'un à la place
    // de l'autre.
    const detail = composerDetailProduits();
    const commentaireLibre = champNote.value.trim();
    let note = detail;
    if (commentaireLibre) note = note ? `${note}\n${commentaireLibre}` : commentaireLibre;
    if (note.length > LONGUEUR_MAX_NOTE) note = note.slice(0, LONGUEUR_MAX_NOTE);

    const corpsRequete = {
      telephone: telephoneConfirme,
      quantiteBacs,
    };
    if (champDateSouhaitee.value) corpsRequete.dateSouhaitee = champDateSouhaitee.value;
    if (note) corpsRequete.note = note;

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
      recalculerTotal();
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
    recalculerTotal();
    afficherEtapeIdentification();
    champTelephone.focus();
  });

  boutonNouvelleDemande.addEventListener("click", () => {
    telephoneConfirme = "";
    formIdentification.reset();
    formDemande.reset();
    recalculerTotal();
    afficherEtapeIdentification();
  });
})();
