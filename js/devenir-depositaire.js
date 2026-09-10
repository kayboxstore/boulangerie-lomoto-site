(() => {
  "use strict";

  // API de gestion interne — CORS déjà ouvert spécifiquement pour ce chemin
  // public, aucun proxy nécessaire depuis ce site. Même hôte que commander.js.
  const API_URL = "https://gestion.boulangerie-lomoto.com/api/public/inscription-depositaire";

  const MESSAGE_ERREUR_GENERIQUE =
    "Une erreur est survenue. Merci de réessayer dans un instant.";
  const MESSAGE_LIMITE =
    "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.";

  const formInscription = document.getElementById("formulaire-inscription");
  const zoneMessageInscription = document.getElementById("zone-message-inscription");
  const zoneConfirmation = document.getElementById("zone-confirmation");
  const boutonInscription = document.getElementById("bouton-inscription");
  const boutonNouvelleInscription = document.getElementById("bouton-nouvelle-inscription");

  const champNom = document.getElementById("nom");
  const champTelephone = document.getElementById("telephone");
  const champAdresse = document.getElementById("adresse");

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

  function afficherEtapeFormulaire() {
    formInscription.hidden = false;
    zoneConfirmation.hidden = true;
    viderMessage(zoneMessageInscription);
  }

  function afficherEtapeConfirmation() {
    formInscription.hidden = true;
    zoneConfirmation.hidden = false;
  }

  formInscription.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    viderMessage(zoneMessageInscription);

    const nom = champNom.value.trim();
    const telephone = champTelephone.value.trim();
    const adresse = champAdresse.value.trim();

    if (!nom || !telephone || !adresse) {
      afficherMessage(zoneMessageInscription, "Merci de remplir les 3 champs : nom, téléphone et adresse.", "erreur");
      return;
    }

    basculerChargement(boutonInscription, true, "Envoyer ma demande");
    try {
      const reponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, telephone, adresse }),
      });

      if (!reponse.ok) {
        const message = await messageErreurDepuisReponse(reponse, MESSAGE_ERREUR_GENERIQUE);
        afficherMessage(zoneMessageInscription, message, "erreur");
        return;
      }

      formInscription.reset();
      afficherEtapeConfirmation();
    } catch {
      afficherMessage(zoneMessageInscription, MESSAGE_ERREUR_GENERIQUE, "erreur");
    } finally {
      basculerChargement(boutonInscription, false, "Envoyer ma demande");
    }
  });

  boutonNouvelleInscription.addEventListener("click", () => {
    formInscription.reset();
    afficherEtapeFormulaire();
  });
})();
