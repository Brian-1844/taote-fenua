// =====================================================================
// Taote Fenua — espace professionnel
// Connexion par e-mail + mot de passe ; un professionnel ne voit et ne
// modifie que les établissements auxquels l'administrateur l'a relié.
// =====================================================================
import {
  isDemo, DEMO_IDENTIFIANTS, sessionActuelle, surChangementSession, seConnecter, seDeconnecter,
  motDePasseOublie, changerMotDePasse, mesEtablissements, publierStatut, enregistrerFiche,
  reinitialiserDemo,
} from './api.js';
import { forcerLangue } from './i18n.js';
import { esc, icone, NIVEAUX, MODES, JOURS_LONGS, ORDRE_JOURS, ilYa, estPerime, TYPES } from './ui.js';

// L'espace pro reste en français, quel que soit le choix fait dans l'annuaire
forcerLangue('fr');

const zone = document.getElementById('pro');

// Lien reçu par e-mail (invitation ou mot de passe oublié) : on le repère
// AVANT que Supabase ne nettoie l'adresse.
const paramsLien = new URLSearchParams(location.hash.slice(1));
let doitChoisirMotDePasse = ['invite', 'recovery'].includes(paramsLien.get('type'));
const erreurLien = paramsLien.get('error_description');

let etablissements = [];
let courant = null;

// ---------------------------------------------------------------------
async function demarrer() {
  await surChangementSession((evenement) => {
    if (evenement === 'PASSWORD_RECOVERY') { doitChoisirMotDePasse = true; afficher(); }
    if (evenement === 'SIGNED_OUT') afficher();
  });
  afficher();
}

async function afficher() {
  const session = await sessionActuelle();
  if (!session) return vueConnexion(erreurLien ? `Le lien n'est plus valable (${erreurLien}). Demandez-en un nouveau.` : '');
  if (doitChoisirMotDePasse) return vueNouveauMotDePasse(session);
  try {
    etablissements = await mesEtablissements();
  } catch (err) {
    console.error(err);
    zone.innerHTML = `<div class="section"><div class="message message-erreur" role="alert">Impossible de charger vos établissements. Vérifiez votre connexion.</div></div>`;
    return;
  }
  if (!etablissements.length) return vueSansEtablissement(session);
  courant = etablissements.find((e) => e.id === courant?.id) || etablissements[0];
  vueTableauDeBord(session);
}

// ---------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------
function vueConnexion(message = '') {
  zone.innerHTML = `
    <div class="section bloc">
      <h2>Connexion</h2>
      <p class="carte-meta" style="margin:0">Réservé aux professionnels de santé référencés. Votre accès vous est envoyé par e-mail par l'administrateur.</p>
      ${isDemo ? `<div class="message message-ok">Mode démo : identifiant <b>${esc(DEMO_IDENTIFIANTS.email)}</b>, mot de passe <b>${esc(DEMO_IDENTIFIANTS.motdepasse)}</b></div>` : ''}
      ${message ? `<div class="message message-erreur" role="alert">${esc(message)}</div>` : ''}
      <form class="formulaire" id="f-connexion" novalidate>
        <div class="champ">
          <label for="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autocomplete="username" inputmode="email" required>
        </div>
        <div class="champ">
          <label for="mdp">Mot de passe</label>
          <input id="mdp" name="mdp" type="password" autocomplete="current-password" required>
        </div>
        <div id="erreur" role="alert"></div>
        <button class="bouton bouton-principal" type="submit">Se connecter</button>
      </form>
      <button type="button" class="bouton-lien" id="oubli">Mot de passe oublié ?</button>
    </div>
    <p class="source" style="padding:14px 16px">Vous êtes professionnel de santé et souhaitez figurer dans l'annuaire ? Contactez l'administrateur de Taote Fenua.</p>`;

  const f = zone.querySelector('#f-connexion');
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const bouton = f.querySelector('button[type="submit"]');
    const err = f.querySelector('#erreur');
    err.innerHTML = '';
    if (!f.email.value || !f.mdp.value) { err.innerHTML = erreur('Saisissez votre e-mail et votre mot de passe.'); return; }
    bouton.disabled = true; bouton.textContent = 'Connexion…';
    try {
      await seConnecter(f.email.value, f.mdp.value);
      await afficher();
    } catch (e) {
      err.innerHTML = erreur(e.message);
      bouton.disabled = false; bouton.textContent = 'Se connecter';
    }
  });
  zone.querySelector('#oubli').addEventListener('click', () => vueOubli(f.email.value));
}

function vueOubli(emailPrerempli = '') {
  zone.innerHTML = `
    <div class="section bloc">
      <h2>Mot de passe oublié</h2>
      <p class="carte-meta" style="margin:0">Saisissez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <form class="formulaire" id="f-oubli" novalidate>
        <div class="champ">
          <label for="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autocomplete="username" value="${esc(emailPrerempli)}" required>
        </div>
        <div id="retour" role="status"></div>
        <button class="bouton bouton-principal" type="submit">Recevoir le lien</button>
      </form>
      <button type="button" class="bouton-lien" id="annuler">Retour à la connexion</button>
    </div>`;
  const f = zone.querySelector('#f-oubli');
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const retour = f.querySelector('#retour');
    if (!f.email.value.includes('@')) { retour.innerHTML = erreur('Adresse e-mail invalide.'); return; }
    const bouton = f.querySelector('button[type="submit"]');
    bouton.disabled = true;
    try {
      await motDePasseOublie(f.email.value);
      // Même message que l'adresse existe ou non : on ne révèle pas qui a un compte.
      retour.innerHTML = `<div class="message message-ok">Si cette adresse correspond à un compte, un e-mail vient d'être envoyé. Pensez à regarder dans les indésirables.${isDemo ? ' (En mode démo, aucun e-mail n\'est envoyé.)' : ''}</div>`;
    } catch (e) {
      retour.innerHTML = erreur(e.message);
      bouton.disabled = false;
    }
  });
  zone.querySelector('#annuler').addEventListener('click', () => vueConnexion());
}

function vueNouveauMotDePasse(session) {
  zone.innerHTML = `
    <div class="section bloc">
      <h2>Choisissez votre mot de passe</h2>
      <p class="carte-meta" style="margin:0">Compte : <b>${esc(session.email)}</b>. Au moins 8 caractères ; évitez votre date de naissance ou le nom du cabinet.</p>
      <form class="formulaire" id="f-mdp" novalidate>
        <div class="champ">
          <label for="mdp1">Nouveau mot de passe</label>
          <input id="mdp1" type="password" autocomplete="new-password" minlength="8" required>
        </div>
        <div class="champ">
          <label for="mdp2">Confirmez le mot de passe</label>
          <input id="mdp2" type="password" autocomplete="new-password" minlength="8" required>
        </div>
        <div id="retour" role="alert"></div>
        <button class="bouton bouton-principal" type="submit">Enregistrer</button>
      </form>
    </div>`;
  const f = zone.querySelector('#f-mdp');
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const retour = f.querySelector('#retour');
    if (f.mdp1.value !== f.mdp2.value) { retour.innerHTML = erreur('Les deux mots de passe ne sont pas identiques.'); return; }
    try {
      await changerMotDePasse(f.mdp1.value);
      doitChoisirMotDePasse = false;
      history.replaceState(null, '', location.pathname);
      toast('Mot de passe enregistré.');
      afficher();
    } catch (e) { retour.innerHTML = erreur(e.message); }
  });
}

function vueSansEtablissement(session) {
  zone.innerHTML = `
    <div class="section bloc">
      <h2>Compte en attente</h2>
      <p style="margin:0">Vous êtes connecté avec <b>${esc(session.email)}</b>, mais ce compte n'est relié à aucun établissement pour l'instant.</p>
      <p class="carte-meta" style="margin:0">Contactez l'administrateur de Taote Fenua pour qu'il associe votre cabinet à votre compte.</p>
      <button type="button" class="bouton bouton-secondaire" id="deco">Se déconnecter</button>
    </div>`;
  zone.querySelector('#deco').addEventListener('click', deconnexion);
}

// ---------------------------------------------------------------------
// Tableau de bord
// ---------------------------------------------------------------------
function vueTableauDeBord(session) {
  const e = courant;
  const s = e.statut || { niveau: 'peu', sans_rdv_aujourdhui: true };
  const majTexte = e.statut?.maj_le
    ? `Statut publié ${ilYa(e.statut.maj_le)}${estPerime(e.statut) ? ' — trop ancien, il n\'est plus affiché au public' : ''}`
    : 'Aucun statut publié pour le moment';

  zone.innerHTML = `
    <div class="titre-page" style="padding-top:18px">
      ${etablissements.length > 1 ? `
        <div class="champ"><label for="choix-etab">Établissement</label>
          <select id="choix-etab">${etablissements.map((x) => `<option value="${esc(x.id)}" ${x.id === e.id ? 'selected' : ''}>${esc(x.nom)}</option>`).join('')}</select>
        </div>` : ''}
      <h1>${esc(e.nom)}</h1>
      <div class="sous">${esc(e.specialite || TYPES[e.type])} · ${esc(e.commune)}</div>
    </div>

    ${isDemo ? `<div class="bandeau bandeau-info" role="note">${icone('info')}<div>Mode démo : vos changements restent dans ce navigateur et apparaissent dans l'annuaire.</div></div>` : ''}

    <section class="section bloc" aria-labelledby="t-statut">
      <div>
        <h2 id="t-statut">Comment est la salle d'attente ?</h2>
        <div class="carte-meta" id="maj">${esc(majTexte)}</div>
      </div>
      <div class="niveaux" role="group" aria-label="Niveau d'attente">
        ${Object.entries(NIVEAUX).map(([cle, n]) => `
          <button type="button" class="niveau niveau-${cle}" data-niveau="${cle}" aria-pressed="${s.niveau === cle}">
            <span class="l"><span class="t">${esc(n.label)}</span><span class="s">${esc(n.sous)}</span></span>
            ${icone('coche', 26)}
          </button>`).join('')}
      </div>
      <p class="carte-meta" style="margin:0">Un appui suffit : le statut est publié tout de suite.</p>
    </section>

    <section class="section bloc" aria-labelledby="t-details">
      <h2 id="t-details">Précisions (facultatif)</h2>
      <form class="formulaire" id="f-details">
        <div class="deux-champs">
          <div class="champ"><label for="attente">Attente (min)</label>
            <input id="attente" type="number" inputmode="numeric" min="0" max="600" step="5" value="${esc(s.attente_min ?? '')}"></div>
          <div class="champ"><label for="personnes">Personnes en salle</label>
            <input id="personnes" type="number" inputmode="numeric" min="0" max="200" value="${esc(s.personnes ?? '')}"></div>
        </div>
        ${e.mode_accueil !== 'sur_rdv' ? `
        <label class="interrupteur"><span>Consultations sans rendez-vous aujourd'hui</span>
          <input type="checkbox" id="sansrdv" ${s.sans_rdv_aujourdhui !== false ? 'checked' : ''}></label>` : ''}
        <button class="bouton bouton-secondaire" type="submit">Publier les précisions</button>
      </form>
    </section>

    <section class="section bloc" aria-labelledby="t-fiche">
      <h2 id="t-fiche">Ma fiche</h2>
      <p class="carte-meta" style="margin:0">Le nom et le type d'établissement ne peuvent être changés que par l'administrateur.</p>
      <form class="formulaire" id="f-fiche">
        <div class="champ"><label for="specialite">Spécialité affichée</label>
          <input id="specialite" name="specialite" value="${esc(e.specialite ?? '')}" placeholder="ex. Médecin généraliste"></div>
        <div class="champ"><label for="mode_accueil">Accueil des patients</label>
          <select id="mode_accueil" name="mode_accueil">
            ${Object.entries(MODES).map(([k, v]) => `<option value="${k}" ${e.mode_accueil === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select></div>
        <div class="deux-champs">
          <div class="champ"><label for="tel_fixe">Téléphone fixe</label>
            <input id="tel_fixe" name="tel_fixe" type="tel" inputmode="tel" value="${esc(e.tel_fixe ?? '')}" placeholder="40 XX XX XX"></div>
          <div class="champ"><label for="tel_mobile">Mobile</label>
            <input id="tel_mobile" name="tel_mobile" type="tel" inputmode="tel" value="${esc(e.tel_mobile ?? '')}" placeholder="87 XX XX XX"></div>
        </div>
        <div class="deux-champs">
          <div class="champ"><label for="pk">PK</label>
            <input id="pk" name="pk" value="${esc(e.pk ?? '')}" placeholder="ex. 15,2"></div>
          <div class="champ"><label for="cote">Côté</label>
            <select id="cote" name="cote">
              <option value="" ${!e.cote ? 'selected' : ''}>—</option>
              <option value="mer" ${e.cote === 'mer' ? 'selected' : ''}>Côté mer</option>
              <option value="montagne" ${e.cote === 'montagne' ? 'selected' : ''}>Côté montagne</option>
            </select></div>
        </div>
        <div class="champ"><label for="adresse">Adresse ou lieu</label>
          <input id="adresse" name="adresse" value="${esc(e.adresse ?? '')}" placeholder="ex. Centre commercial …, 1er étage"></div>
        <div class="champ"><label for="repere">Repère</label>
          <input id="repere" name="repere" value="${esc(e.repere ?? '')}" placeholder="ex. en face de l'école"></div>
        <div class="champ">
          <span class="label">Position sur la carte</span>
          <span class="aide" id="pos-texte">${e.lat != null ? `Enregistrée (${esc(e.lat.toFixed(4))}, ${esc(e.lng.toFixed(4))})` : 'Non enregistrée'}</span>
          <button type="button" class="bouton bouton-secondaire" id="ma-position">${icone('viser', 18)} Utiliser ma position actuelle (au cabinet)</button>
        </div>
        <div class="champ"><label for="infos">Informations pratiques</label>
          <textarea id="infos" name="infos" placeholder="Parking, accès fauteuil roulant, documents à apporter…">${esc(e.infos ?? '')}</textarea></div>

        <div class="champ">
          <span class="label">Horaires d'ouverture</span>
          <span class="aide">Jusqu'à deux plages par jour. Laissez vide si fermé.</span>
          <div id="horaires">${ORDRE_JOURS.map((j) => ligneHoraires(j, e.horaires?.[j] || [])).join('')}</div>
        </div>
        <div id="retour-fiche" role="status"></div>
        <button class="bouton bouton-principal" type="submit">Enregistrer ma fiche</button>
      </form>
    </section>

    <section class="section bloc" aria-labelledby="t-compte">
      <h2 id="t-compte">Mon compte</h2>
      <p class="carte-meta" style="margin:0">Connecté : ${esc(session.email)}</p>
      <div class="grille2">
        <button type="button" class="bouton bouton-secondaire" id="changer-mdp">Changer le mot de passe</button>
        <button type="button" class="bouton bouton-secondaire" id="deco">Se déconnecter</button>
      </div>
      ${isDemo ? '<button type="button" class="bouton-lien" id="reset-demo">Remettre la démo à zéro</button>' : ''}
    </section>
    <div style="height:24px"></div>`;

  // Choix de l'établissement
  zone.querySelector('#choix-etab')?.addEventListener('change', (ev) => {
    courant = etablissements.find((x) => x.id === ev.target.value);
    vueTableauDeBord(session);
  });

  // Statut en un appui
  zone.querySelectorAll('[data-niveau]').forEach((b) => b.addEventListener('click', async () => {
    const precedent = zone.querySelector('[data-niveau][aria-pressed="true"]');
    zone.querySelectorAll('[data-niveau]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    try {
      courant.statut = await publierStatut(courant.id, { ...lireDetails(), niveau: b.dataset.niveau });
      zone.querySelector('#maj').textContent = "Statut publié à l'instant";
      toast(`Publié : ${NIVEAUX[b.dataset.niveau].label}`);
    } catch (err) {
      console.error(err);
      zone.querySelectorAll('[data-niveau]').forEach((x) => x.setAttribute('aria-pressed', String(x === precedent)));
      toast("Échec de la publication. Vérifiez votre connexion.");
    }
  }));

  zone.querySelector('#f-details').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const niveau = zone.querySelector('[data-niveau][aria-pressed="true"]')?.dataset.niveau || 'peu';
    try {
      courant.statut = await publierStatut(courant.id, { ...lireDetails(), niveau });
      zone.querySelector('#maj').textContent = "Statut publié à l'instant";
      toast('Précisions publiées.');
    } catch (err) { console.error(err); toast("Échec de la publication. Vérifiez votre connexion."); }
  });

  zone.querySelector('#ma-position').addEventListener('click', (ev) => {
    const bouton = ev.currentTarget;
    if (!navigator.geolocation) { toast("Localisation indisponible sur cet appareil."); return; }
    bouton.disabled = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      courant._nouvellePosition = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
      zone.querySelector('#pos-texte').textContent = `Nouvelle position : ${courant._nouvellePosition.lat.toFixed(4)}, ${courant._nouvellePosition.lng.toFixed(4)} — pensez à enregistrer`;
      bouton.disabled = false;
    }, () => { bouton.disabled = false; toast('Position refusée ou introuvable.'); }, { enableHighAccuracy: true, timeout: 15000 });
  });

  zone.querySelector('#f-fiche').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.currentTarget;
    const retour = f.querySelector('#retour-fiche');
    const horaires = lireHoraires();
    if (horaires.erreur) { retour.innerHTML = erreur(horaires.erreur); return; }
    const champs = {
      specialite: f.specialite.value.trim(),
      mode_accueil: f.mode_accueil.value,
      tel_fixe: f.tel_fixe.value.trim(),
      tel_mobile: f.tel_mobile.value.trim(),
      pk: f.pk.value.trim(),
      cote: f.cote.value,
      adresse: f.adresse.value.trim(),
      repere: f.repere.value.trim(),
      infos: f.infos.value.trim(),
      horaires: horaires.valeur,
      ...(courant._nouvellePosition || {}),
    };
    const bouton = f.querySelector('button[type="submit"]');
    bouton.disabled = true;
    try {
      await enregistrerFiche(courant.id, champs);
      Object.assign(courant, champs);
      delete courant._nouvellePosition;
      retour.innerHTML = '<div class="message message-ok">Fiche enregistrée. Elle est visible tout de suite dans l\'annuaire.</div>';
    } catch (err) {
      console.error(err);
      retour.innerHTML = erreur("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
    }
    bouton.disabled = false;
  });

  zone.querySelector('#changer-mdp').addEventListener('click', () => { doitChoisirMotDePasse = true; vueNouveauMotDePasse(session); });
  zone.querySelector('#deco').addEventListener('click', deconnexion);
  zone.querySelector('#reset-demo')?.addEventListener('click', () => { reinitialiserDemo(); toast('Démo remise à zéro.'); afficher(); });
}

function ligneHoraires(jour, plages) {
  const p = [plages[0] || ['', ''], plages[1] || ['', '']];
  const plage = (i) => `
    <div class="plage">
      <label class="cache" for="h-${jour}-${i}-a">${JOURS_LONGS[jour]}, plage ${i + 1}, début</label>
      <input type="time" id="h-${jour}-${i}-a" data-jour="${jour}" data-i="${i}" data-bord="a" value="${esc(p[i][0])}">
      <span class="tiret" aria-hidden="true">–</span>
      <label class="cache" for="h-${jour}-${i}-b">${JOURS_LONGS[jour]}, plage ${i + 1}, fin</label>
      <input type="time" id="h-${jour}-${i}-b" data-jour="${jour}" data-i="${i}" data-bord="b" value="${esc(p[i][1])}">
    </div>`;
  return `<div class="jour-horaires"><span class="nom-jour">${JOURS_LONGS[jour]}</span><div class="plages">${plage(0)}${plage(1)}</div></div>`;
}

function lireHoraires() {
  const valeur = {};
  for (const j of ORDRE_JOURS) {
    valeur[j] = [];
    for (const i of [0, 1]) {
      const a = zone.querySelector(`[data-jour="${j}"][data-i="${i}"][data-bord="a"]`).value;
      const b = zone.querySelector(`[data-jour="${j}"][data-i="${i}"][data-bord="b"]`).value;
      if (!a && !b) continue;
      if (!a || !b) return { erreur: `${JOURS_LONGS[j]} : indiquez l'heure de début ET de fin.` };
      if (b <= a) return { erreur: `${JOURS_LONGS[j]} : l'heure de fin doit être après l'heure de début.` };
      valeur[j].push([a, b]);
    }
    if (valeur[j].length === 2 && valeur[j][1][0] < valeur[j][0][1]) {
      return { erreur: `${JOURS_LONGS[j]} : les deux plages se chevauchent.` };
    }
  }
  return { valeur };
}

function lireDetails() {
  const nombre = (id) => {
    const v = zone.querySelector(id)?.value;
    return v === '' || v == null ? null : Math.max(0, Math.round(Number(v)));
  };
  const sansRdv = zone.querySelector('#sansrdv');
  return {
    attente_min: nombre('#attente'),
    personnes: nombre('#personnes'),
    sans_rdv_aujourdhui: sansRdv ? sansRdv.checked : false,
  };
}

async function deconnexion() {
  await seDeconnecter();
  etablissements = []; courant = null;
  vueConnexion();
}

const erreur = (m) => `<div class="message message-erreur">${esc(m)}</div>`;

function toast(texte) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = texte;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

demarrer();
