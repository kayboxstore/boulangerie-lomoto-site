(() => {
  "use strict";

  const annee = document.getElementById("annee");
  if (annee) annee.textContent = new Date().getFullYear();

  const boutonMenu = document.getElementById("bouton-menu");
  const nav = document.getElementById("nav-principale");
  if (!boutonMenu || !nav) return;

  const mediaMobile = window.matchMedia("(max-width: 820px)");

  function fermerMenu() {
    nav.classList.add("nav-fermee");
    boutonMenu.setAttribute("aria-expanded", "false");
  }

  function ouvrirMenu() {
    nav.classList.remove("nav-fermee");
    boutonMenu.setAttribute("aria-expanded", "true");
  }

  function appliquerEtatEcran(estMobile) {
    if (estMobile) {
      boutonMenu.hidden = false;
      fermerMenu();
    } else {
      boutonMenu.hidden = true;
      boutonMenu.setAttribute("aria-expanded", "false");
      nav.classList.remove("nav-fermee");
    }
  }

  appliquerEtatEcran(mediaMobile.matches);
  mediaMobile.addEventListener("change", (evenement) => appliquerEtatEcran(evenement.matches));

  boutonMenu.addEventListener("click", () => {
    const estOuvert = boutonMenu.getAttribute("aria-expanded") === "true";
    if (estOuvert) fermerMenu();
    else ouvrirMenu();
  });
})();
