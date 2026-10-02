// =====================================================================
// Taote Fenua — application publique
// Pages : #/ (annuaire) · #/e/<id> (fiche) · #/gardes/medecin · #/gardes/pharmacie
// =====================================================================
import { CONFIG } from './config.js';
import {
  isDemo, listerEtablissements, lireEtablissement, listerGardes,
  envoyerSignalement, signalementsRecents,
} from './api.js';
import { t, changerLangue, langueActuelle } from './i18n.js';
import {
  esc, icone, pastille, pastilleHTML, etatOuverture, adresseCourte, telHref, mapsHref,
  distanceKm, kmTexte, normaliser, ilYa, estPerime, TYPES, MODES,
  JOURS_LONGS, ORDRE_JOURS, maintenantTahiti, heure,
} from './ui.js';

const app = document.getElementById('app');

// ---------------------------------------------------------------------
// État des filtres (la commune choisie est retenue d'une visite à l'autre)
// ---------------------------------------------------------------------
const filtres = {
  q: '',
  commune: (() => { try { return localStorage.getItem('taote-commune') || ''; } catch { return ''; } })(),
  type: 'tous',
  ouvert: false,
  sansRdv: false,
  position: null,
};
let donnees = { liste: [], horsLigne: false };

// ---------------------------------------------------------------------
// Routeur
// ---------------------------------------------------------------------
async function router() {
  const route = location.hash.replace(/^#/, '') || '/';
  const [, page, param] = route.split('/');
  marquerNav(page === 'gardes' ? 'gardes' : 'annuaire');
  window.scrollTo(0, 0);
  try {
    if (page === 'e' && param) await pageFiche(decodeURIComponent(param));
    else if (page === 'gardes') await pageGardes(param === 'pharmacie' ? 'pharmacie' : 'medecin');
    else await pageAnnuaire();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="section"><div class="message message-erreur" role="alert">
      Impossible de charger les données. Vérifiez votre connexion puis rechargez la page.</div></div>`;
  }
  traduireStatique();
}

function marquerNav(cle) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === cle) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function traduireStatique() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
}

function boutonsLangue() {
  const l = langueActuelle();
  return `<div class="langues" role="group" aria-label="Langue">
    <button type="button" data-langue="fr" aria-pressed="${l === 'fr'}">FR</button>
    <button type="button" data-langue="ty" aria-pressed="${l === 'ty'}">Reo</button>
  </div>`;
}

function brancherLangue() {
  app.querySelectorAll('[data-langue]').forEach((b) => b.addEventListener('click', () => {
    changerLangue(b.dataset.langue);
    router();
  }));
}

function noteDonnees() {
  let html = '';
  if (isDemo) html += `<div class="bandeau bandeau-info" role="note">${icone('info')}<div>${esc(t('mode_demo'))}</div></div>`;
  if (donnees.horsLigne) {
    const le = donnees.le ? new Date(donnees.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '?';
    html += `<div class="bandeau bandeau-info" role="status">${icone('alerte')}<div>${esc(t('hors_ligne', le))}</div></div>`;
  }
  return html;
}

// ---------------------------------------------------------------------
// Page 1 : annuaire
// ---------------------------------------------------------------------
async function pageAnnuaire() {
  donnees = await listerEtablissements();
  const communes = [...new Set(donnees.liste.map((e) => e.commune))].sort((a, b) => a.localeCompare(b, 'fr'));

  const puceType = (val, cle) =>
    `<button type="button" class="puce" data-type="${val}" aria-pressed="${filtres.type === val}">${esc(t(cle))}</button>`;

  app.innerHTML = `
    <header class="entete">
      <div class="entete-ligne">
        <div>
          <div class="salut">${esc(t('salut'))}</div>
          <h1 class="marque">${esc(CONFIG.APP_NOM)}</h1>
        </div>
        ${boutonsLangue()}
      </div>
      <label class="champ-recherche">
        ${icone('recherche')}
        <span class="cache">Rechercher</span>
        <input id="q" type="search" autocomplete="off" placeholder="${esc(t('recherche'))}" value="${esc(filtres.q)}">
      </label>
      <div class="ligne-lieu">
        <label class="cache" for="commune">Commune</label>
        <select id="commune" class="select-sombre">
          <option value="">${esc(t('toutes_communes'))}</option>
          ${communes.map((c) => `<option value="${esc(c)}" ${c === filtres.commune ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <button type="button" id="geo" class="bouton-contour-sombre" aria-pressed="${!!filtres.position}">
          ${icone('viser', 18)} ${esc(t('autour_de_moi'))}
        </button>
      </div>
    </header>

    <div class="puces" role="group" aria-label="Filtres">
      <button type="button" class="puce" data-bascule="ouvert" aria-pressed="${filtres.ouvert}">${esc(t('ouvert_maintenant'))}</button>
      <button type="button" class="puce" data-bascule="sansRdv" aria-pressed="${filtres.sansRdv}">${esc(t('sans_rdv'))}</button>
      ${puceType('tous', 'tous')}
      ${puceType('medecin', 'generalistes')}
      ${puceType('pharmacie', 'pharmacies')}
      ${puceType('dentiste', 'dentistes')}
      ${puceType('autres', 'autres')}
    </div>

    ${noteDonnees()}

    <a class="bandeau bandeau-garde" href="#/gardes/medecin">
      ${icone('alerte', 22)}
      <div><span class="titre">${esc(t('gardes_titre'))}</span><span class="sous">${esc(t('gardes_sous_titre'))}</span></div>
      ${icone('suivant', 18)}
    </a>

    <div class="compte" id="compte" aria-live="polite"></div>
    <div class="liste" id="resultats"></div>
  `;

  brancherLangue();
  app.querySelector('#q').addEventListener('input', (e) => { filtres.q = e.target.value; afficherResultats(); });
  app.querySelector('#commune').addEventListener('change', (e) => {
    filtres.commune = e.target.value;
    try { localStorage.setItem('taote-commune', filtres.commune); } catch { /* ignoré */ }
    afficherResultats();
  });
  app.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
    filtres.type = b.dataset.type;
    app.querySelectorAll('[data-type]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    afficherResultats();
  }));
  app.querySelectorAll('[data-bascule]').forEach((b) => b.addEventListener('click', () => {
    filtres[b.dataset.bascule] = !filtres[b.dataset.bascule];
    b.setAttribute('aria-pressed', String(filtres[b.dataset.bascule]));
    afficherResultats();
  }));
  app.querySelector('#geo').addEventListener('click', localiser);

  afficherResultats();
}

function localiser(e) {
  const bouton = e.currentTarget;
  if (filtres.position) {
    filtres.position = null;
    bouton.setAttribute('aria-pressed', 'false');
    afficherResultats();
    return;
  }
  if (!navigator.geolocation) { toast("La localisation n'est pas disponible sur cet appareil."); return; }
  bouton.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      filtres.position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      filtres.commune = '';
      const sel = app.querySelector('#commune'); if (sel) sel.value = '';
      bouton.disabled = false;
      bouton.setAttribute('aria-pressed', 'true');
      afficherResultats();
    },
    () => { bouton.disabled = false; toast('Position refusée ou introuvable. Choisissez votre commune.'); },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  );
}

function filtrer(liste) {
  const q = normaliser(filtres.q);
  return liste
    .map((e) => ({ e, d: filtres.position ? distanceKm(filtres.position, e) : null, o: etatOuverture(e.horaires) }))
    .filter(({ e, o }) => {
      if (filtres.commune && e.commune !== filtres.commune) return false;
      if (filtres.type === 'autres' && ['medecin', 'pharmacie', 'dentiste'].includes(e.type)) return false;
      if (!['tous', 'autres'].includes(filtres.type) && e.type !== filtres.type) return false;
      if (filtres.ouvert && o.ouvert !== true) return false;
      if (filtres.sansRdv && e.mode_accueil === 'sur_rdv') return false;
      if (q) {
        const texte = normaliser([e.nom, e.specialite, TYPES[e.type], e.commune, e.ile].join(' '));
        if (!q.split(/\s+/).every((mot) => texte.includes(mot))) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.d != null && b.d != null) return a.d - b.d;
      if ((a.o.ouvert === true) !== (b.o.ouvert === true)) return a.o.ouvert === true ? -1 : 1;
      return a.e.nom.localeCompare(b.e.nom, 'fr');
    });
}

function afficherResultats() {
  const res = filtrer(donnees.liste);
  const zone = app.querySelector('#resultats');
  const compte = app.querySelector('#compte');
  if (!zone) return;
  compte.textContent = t('resultats', res.length) + (filtres.position ? ' · triés par distance' : '');
  if (!res.length) { zone.innerHTML = `<p class="vide">${esc(t('aucun_resultat'))}</p>`; return; }
  zone.innerHTML = res.map(({ e, d, o }) => carteEtab(e, d, o)).join('');
}

function carteEtab(e, d, o) {
  const p = pastille(e);
  const s = e.statut;
  let detail = '';
  if (p.direct && s && ['peu', 'beaucoup'].includes(s.niveau)) {
    const morceaux = [];
    if (s.attente_min != null) morceaux.push(`<b>≈ ${esc(s.attente_min)} min</b>`);
    if (s.personnes != null) morceaux.push(`${esc(s.personnes)} personne${s.personnes > 1 ? 's' : ''}`);
    if (morceaux.length) detail = `<div class="carte-ligne"><span>${morceaux.join(' · ')}</span></div>`;
  }
  const maj = p.direct && s?.maj_le ? ` · mis à jour ${ilYa(s.maj_le)}` : '';
  return `
    <a class="carte" href="#/e/${encodeURIComponent(e.id)}">
      <div class="carte-tete">
        <div>
          <div class="carte-nom">${esc(e.nom)}</div>
          <div class="carte-meta">${esc(e.specialite || TYPES[e.type])}${d != null ? ` · ${kmTexte(d)}` : ''}</div>
        </div>
        ${pastilleHTML(p)}
      </div>
      ${detail}
      <div class="carte-ligne"><span>${esc(adresseCourte(e))}</span>${e.tel_fixe || e.tel_mobile ? `<span>${esc(e.tel_fixe || e.tel_mobile)}</span>` : ''}</div>
      <div class="carte-pied">${esc(o.texte)} · ${esc(MODES[e.mode_accueil] || '')}${esc(maj)}</div>
    </a>`;
}

// ---------------------------------------------------------------------
// Page 2 : fiche d'un établissement
// ---------------------------------------------------------------------
async function pageFiche(id) {
  const { etab: e, horsLigne } = await lireEtablissement(id);
  donnees.horsLigne = horsLigne;
  if (!e) {
    app.innerHTML = `${barreRetour('#/', '')}<p class="vide">Cet établissement n'existe pas ou n'est plus référencé.</p>`;
    return;
  }
  const o = etatOuverture(e.horaires);
  const p = pastille(e);
  const s = e.statut;
  const statutFrais = s && !estPerime(s);
  const { jour } = maintenantTahiti();

  const blocStatut = (() => {
    if (e.mode_accueil === 'sur_rdv') {
      return `<div class="bloc-sombre"><div>${pastilleHTML(p)}</div>
        <div class="separateur" style="border:0;padding:0">Consultations <b>uniquement sur rendez-vous</b>. Appelez pour obtenir un créneau.</div></div>`;
    }
    const chiffres = statutFrais && ['peu', 'beaucoup'].includes(s.niveau) && (s.attente_min != null || s.personnes != null)
      ? `<div class="grille2">
          ${s.attente_min != null ? `<div><div class="chiffre">≈ ${esc(s.attente_min)} min</div><div class="doux">${esc(t('temps_attente'))}</div></div>` : ''}
          ${s.personnes != null ? `<div><div class="chiffre">${esc(s.personnes)}</div><div class="doux">${esc(t('personnes_salle'))}</div></div>` : ''}
        </div>` : '';
    const maj = statutFrais ? `<div class="doux" style="text-align:right">mis à jour par l'établissement<br>${esc(ilYa(s.maj_le))}</div>`
      : `<div class="doux" style="text-align:right">pas de mise à jour récente</div>`;
    return `<div class="bloc-sombre">
      <div class="entete-ligne">${pastilleHTML(p)}${maj}</div>
      ${chiffres}
      <div class="separateur">${esc(MODES[e.mode_accueil])}${statutFrais && s.sans_rdv_aujourdhui === false && e.mode_accueil !== 'sur_rdv' ? " · <b>pas de consultation sans rendez-vous aujourd'hui</b>" : ''}</div>
    </div>`;
  })();

  const horaires = ORDRE_JOURS.map((j) => {
    const plages = (e.horaires?.[j] || []).filter((x) => x?.[0] && x?.[1]);
    const texte = plages.length ? plages.map(([a, b]) => `${heure(a)} – ${heure(b)}`).join(' · ') : t('ferme');
    const cls = j === jour ? 'aujourdhui' : plages.length ? '' : 'ferme';
    return `<div class="${cls}"><span>${esc(JOURS_LONGS[j])}${j === jour ? ` (${esc(t('aujourdhui'))})` : ''}</span><span>${esc(texte)}</span></div>`;
  }).join('');

  const tel = e.tel_fixe || e.tel_mobile;

  app.innerHTML = `
    ${barreRetour('#/', e.specialite || TYPES[e.type])}
    <div class="titre-page">
      <h1>${esc(e.nom)}</h1>
      <div class="sous">${esc(e.commune)}${e.ile && e.ile !== 'Tahiti' ? ` · ${esc(e.ile)}` : ''} · ${esc(o.texte)}</div>
    </div>
    ${noteDonnees()}
    <div class="section">${blocStatut}</div>

    <div class="section grille2">
      ${tel ? `<a class="bouton bouton-principal" href="${esc(telHref(tel))}">${icone('tel')} ${esc(t('appeler'))}</a>` : '<span></span>'}
      <a class="bouton bouton-secondaire" href="${esc(mapsHref(e))}" target="_blank" rel="noopener">${icone('route')} ${esc(t('itineraire'))}</a>
    </div>

    <section class="section bloc" aria-labelledby="t-loc">
      <h2 id="t-loc">${esc(t('localisation'))}</h2>
      <div>
        <div class="ligne-info">${icone('lieu')}<div>
          <div class="fort">${esc(adresseCourte(e))}</div>
          ${e.pk && e.adresse ? `<div class="doux">${esc(e.adresse)}</div>` : ''}
          ${e.repere ? `<div class="doux">${esc(e.repere)}</div>` : ''}
          ${e.infos ? `<div class="doux">${esc(e.infos)}</div>` : ''}
        </div></div>
        ${e.tel_fixe ? `<a class="ligne-info" href="${esc(telHref(e.tel_fixe))}">${icone('tel')}<div><div class="fort">${esc(e.tel_fixe)}</div><div class="doux">Fixe</div></div></a>` : ''}
        ${e.tel_mobile ? `<a class="ligne-info" href="${esc(telHref(e.tel_mobile))}">${icone('mobile')}<div><div class="fort">${esc(e.tel_mobile)}</div><div class="doux">Mobile</div></div></a>` : ''}
        <a class="ligne-info" href="${esc(mapsHref(e))}" target="_blank" rel="noopener">${icone('sortie')}<div class="fort">${esc(t('ouvrir_maps'))}</div></a>
      </div>
    </section>

    <section class="section bloc" aria-labelledby="t-hor">
      <h2 id="t-hor">${esc(t('horaires'))}</h2>
      <div class="table-horaires">${horaires}</div>
    </section>

    ${e.mode_accueil !== 'sur_rdv' ? `
    <section class="section bloc" aria-labelledby="t-sig">
      <div>
        <h2 id="t-sig">${esc(t('salle_attente_q'))}</h2>
        <div class="carte-meta">${esc(t('salle_attente_aide'))}</div>
      </div>
      <div class="grille3" id="tranches">
        <button type="button" class="choix-tranche" data-tranche="0-3">0 – 3</button>
        <button type="button" class="choix-tranche" data-tranche="4-8">4 – 8</button>
        <button type="button" class="choix-tranche" data-tranche="9+">9 et +</button>
      </div>
      <div id="sig-info" class="carte-meta" aria-live="polite"></div>
    </section>` : ''}
    <div style="height:16px"></div>
  `;

  const zoneInfo = app.querySelector('#sig-info');
  if (zoneInfo) {
    const afficherSignalements = async () => {
      const sig = await signalementsRecents(e.id).catch(() => []);
      if (!sig.length) { zoneInfo.textContent = ''; return; }
      const freq = {};
      sig.forEach((x) => { freq[x.tranche] = (freq[x.tranche] || 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
      zoneInfo.textContent = `${t('signalements_recents', sig.length)} · le plus souvent : ${top.replace('-', ' à ').replace('+', ' et plus')} personnes`;
    };
    afficherSignalements();
    app.querySelectorAll('[data-tranche]').forEach((b) => b.addEventListener('click', async () => {
      app.querySelectorAll('[data-tranche]').forEach((x) => { x.disabled = true; });
      try {
        await envoyerSignalement(e.id, b.dataset.tranche);
        toast(t('merci_signalement'));
        afficherSignalements();
      } catch (err) {
        toast(err.message || "L'envoi a échoué.");
        app.querySelectorAll('[data-tranche]').forEach((x) => { x.disabled = false; });
      }
    }));
  }
}

function barreRetour(href, texte) {
  return `<div class="barre-retour"><a href="${esc(href)}" aria-label="${esc(t('retour'))}">${icone('retour', 22)}</a><span>${esc(texte)}</span></div>`;
}

// ---------------------------------------------------------------------
// Page 3 : gardes (médecins / pharmacies)
// ---------------------------------------------------------------------
async function pageGardes(type) {
  const { liste, horsLigne } = await listerGardes(type);
  donnees.horsLigne = horsLigne;
  const maintenant = Date.now();
  const enCours = liste.filter((g) => Date.parse(g.debut) <= maintenant);
  const aVenir = liste.filter((g) => Date.parse(g.debut) > maintenant);

  const commune = normaliser(filtres.commune);
  const estMien = (g) => commune && normaliser(g.secteur).split('·').map((x) => x.trim()).some((x) => x && (commune.includes(x) || x.includes(commune)));
  const miens = enCours.filter(estMien);
  const autres = enCours.filter((g) => !estMien(g));

  const carte = (g, mien) => `
    <div class="carte carte-garde ${mien ? 'mien' : ''}">
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
        ${mien ? `<span class="etiquette">${esc(t('votre_secteur'))}</span>` : ''}
        <span class="carte-nom">${esc(g.secteur)}</span>
        <span style="font-size:14px">${esc(g.nom)}${g.adresse ? ` · ${esc(g.adresse)}` : ''}</span>
        <span class="carte-meta">${esc(g.horaires_texte || periode(g))}</span>
        ${g.lat != null ? `<a href="${esc(mapsHref(g))}" target="_blank" rel="noopener" style="font-size:14px">${esc(t('itineraire'))}</a>` : ''}
      </div>
      ${g.tel ? `<a class="bouton-rond ${mien ? 'principal' : ''}" href="${esc(telHref(g.tel))}" aria-label="${esc(`${t('appeler')} ${g.nom}`)}">${icone('tel')}</a>` : ''}
    </div>`;

  const sources = [...new Set(liste.map((g) => g.source).filter(Boolean))];

  app.innerHTML = `
    ${barreRetour('#/', t('gardes'))}
    <div class="titre-page"><h1>${esc(t(type === 'pharmacie' ? 'pharmacies_garde' : 'medecins_garde'))}</h1></div>
    <nav class="onglets" aria-label="Type de garde">
      <a href="#/gardes/medecin" ${type === 'medecin' ? 'aria-current="page"' : ''}>${esc(t('medecins'))}</a>
      <a href="#/gardes/pharmacie" ${type === 'pharmacie' ? 'aria-current="page"' : ''}>${esc(t('pharmacies'))}</a>
    </nav>
    <div class="bandeau bandeau-danger" role="note" style="margin-top:0">${icone('alerte', 22)}<div><b>${esc(t('urgence', CONFIG.NUMERO_URGENCE))}</b></div>
      <a class="bouton-rond principal" style="background:#8E1F17" href="tel:${esc(CONFIG.NUMERO_URGENCE)}" aria-label="Appeler le ${esc(CONFIG.NUMERO_URGENCE)}">${icone('tel')}</a></div>
    ${noteDonnees()}
    ${!liste.length ? `<p class="vide">${esc(t('aucune_garde'))}</p>` : ''}
    ${miens.length ? `<div class="liste" style="margin-top:12px">${miens.map((g) => carte(g, true)).join('')}</div>` : ''}
    ${autres.length ? `<div class="titre-section">${esc(miens.length ? t('autres_secteurs') : 'En ce moment')}</div><div class="liste">${autres.map((g) => carte(g, false)).join('')}</div>` : ''}
    ${aVenir.length ? `<div class="titre-section">Prochainement</div><div class="liste">${aVenir.map((g) => carte(g, false)).join('')}</div>` : ''}
    ${sources.length ? `<p class="source">${esc(t('source'))} : ${esc(sources.join(', '))}</p>` : ''}
    ${!commune && liste.length ? `<p class="source">Astuce : choisissez votre commune dans l'annuaire pour voir votre secteur en premier.</p>` : ''}
  `;
}

function periode(g) {
  const f = (iso) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'Pacific/Tahiti', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return `${f(g.debut)} → ${f(g.fin)}`;
}

// ---------------------------------------------------------------------
function toast(texte) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = texte;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

changerLangue(langueActuelle());
window.addEventListener('hashchange', router);
router();
