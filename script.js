/* ============================================================
   JANNING GROUP – Gefährdungsbeurteilung  |  script.js
   ============================================================ */

const N8N_WEBHOOK = "https://n8n.node.janning-it.de/webhook/368921c2-1f7c-4c9c-911e-713601dd76d5";

// ---- AUTO DATE/TIME --------------------------------------------------------
function padZ(n) { return String(n).padStart(2, "0"); }

function setDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = padZ(now.getMonth() + 1);
  const day = padZ(now.getDate());
  const hours = padZ(now.getHours());
  const minutes = padZ(now.getMinutes());
  
  // Format: YYYY-MM-DDTHH:MM (for datetime-local input)
  const dateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
  document.getElementById("datum").value = dateStr;
}

setDateTime();
// User can now edit the date/time manually
// Auto-update disabled to allow manual editing


// ---- NACHUNTERNEHMER TOGGLE ------------------------------------------------
document.querySelectorAll('input[name="nachunternehmerJaNein"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const wrap = document.getElementById("nachunternehmerNameWrap");
    if (radio.value === "Ja" && radio.checked) {
      wrap.classList.remove("hidden");
      document.getElementById("nachunternehmerName").required = true;
    } else {
      wrap.classList.add("hidden");
      document.getElementById("nachunternehmerName").required = false;
      document.getElementById("nachunternehmerName").value = "";
    }
  });
});


// ============================================================
// MAP MODAL (Leaflet.js)
// ============================================================
let map = null;
let marker = null;
let selectedLat = null;
let selectedLng = null;
let selectedAddr = null;

const mapModal     = document.getElementById("mapModal");
const openMapBtn   = document.getElementById("openMapBtn");
const closeMapBtn  = document.getElementById("closeMapBtn");
const confirmMapBtn= document.getElementById("confirmMapBtn");
const mapSearchInput = document.getElementById("mapSearchInput");
const mapSearchBtn = document.getElementById("mapSearchBtn");
const selectedAddrDisplay = document.getElementById("selectedAddrDisplay");
const baustelleAddr = document.getElementById("baustelleAddr");
const baustelleLat  = document.getElementById("baustelleLat");
const baustelleLng  = document.getElementById("baustelleLng");

function initMap() {
  if (map) return;
  map = L.map("leafletMap").setView([52.5200, 7.4], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // Click to place marker
  map.on("click", async (e) => {
    placeMarker(e.latlng.lat, e.latlng.lng);
    const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
    updateSelectedAddr(addr, e.latlng.lat, e.latlng.lng);
  });
}

function placeMarker(lat, lng) {
  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41], iconAnchor: [12, 41],
      })
    }).addTo(map);
  }
}

function updateSelectedAddr(addr, lat, lng) {
  selectedAddr = addr;
  selectedLat  = lat;
  selectedLng  = lng;
  selectedAddrDisplay.textContent = addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  selectedAddrDisplay.classList.add("has-addr");
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=de`,
      { headers: { "Accept-Language": "de" } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function geocodeSearch(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=de`,
      { headers: { "Accept-Language": "de" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
    }
    return null;
  } catch {
    return null;
  }
}

openMapBtn.addEventListener("click", () => {
  mapModal.classList.remove("hidden");
  requestAnimationFrame(() => {
    initMap();
    setTimeout(() => map.invalidateSize(), 150);
  });
});

closeMapBtn.addEventListener("click", () => {
  mapModal.classList.add("hidden");
});

mapModal.addEventListener("click", (e) => {
  if (e.target === mapModal) mapModal.classList.add("hidden");
});

mapSearchBtn.addEventListener("click", async () => {
  const q = mapSearchInput.value.trim();
  if (!q) return;
  mapSearchBtn.textContent = "…";
  const result = await geocodeSearch(q);
  mapSearchBtn.textContent = "Suchen";
  if (result) {
    map.setView([result.lat, result.lng], 16);
    placeMarker(result.lat, result.lng);
    updateSelectedAddr(result.display_name, result.lat, result.lng);
  } else {
    alert("Adresse nicht gefunden. Bitte versuchen Sie eine andere Eingabe.");
  }
});

mapSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); mapSearchBtn.click(); }
});

confirmMapBtn.addEventListener("click", () => {
  if (!selectedLat) { alert("Bitte wählen Sie einen Standort auf der Karte."); return; }
  baustelleAddr.value = selectedAddr || `${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
  baustelleLat.value  = selectedLat;
  baustelleLng.value  = selectedLng;
  mapModal.classList.add("hidden");
});


// ============================================================
// FORM DATA COLLECTION
// ============================================================
function collectFormData() {
  const form = document.getElementById("mainForm");
  const data = {};

  // ---- BEREICH 1 ----
data.formular_typ = "ErgaenzendeGefaehrdungsbeurteilungBaustelle";
  // Convert datetime-local format to German format
const datumInput = document.getElementById("datum").value;
if (datumInput) {
  const dt = new Date(datumInput);
  data.datum = padZ(dt.getDate()) + "." + 
               padZ(dt.getMonth() + 1) + "." + 
               dt.getFullYear() + "  " + 
               padZ(dt.getHours()) + ":" + 
               padZ(dt.getMinutes()) + " Uhr";
} else {
  data.datum = "";
}
  data.email               = document.getElementById("email").value.trim();
  data.nameAV              = document.getElementById("nameAV").value.trim();

  // Firma (multi-checkbox)
  const firmaChecked = [...document.querySelectorAll('input[name="firma"]:checked')].map(el => el.value);
  data.firma = firmaChecked.join(", ") || "";

  data.baustelle   = document.getElementById("baustelleAddr").value.trim();
  data.baustelleLat= document.getElementById("baustelleLat").value;
  data.baustelleLng= document.getElementById("baustelleLng").value;
  data.versorger   = document.getElementById("versorger").value.trim();
  data.sigeKoord   = document.getElementById("sigeKoord").value.trim();
  data.mitarbeiter = document.getElementById("mitarbeiter").value;
  data.unterschriftUnterweisung = (document.querySelector('input[name="unterschriftUnterweisung"]:checked') || {}).value || "";
  data.ausfuehrendeArbeiten = document.getElementById("ausfuehrendeArbeiten").value.trim();
  data.ersthelfer  = document.getElementById("ersthelfer").value.trim();
  data.nachunternehmerJaNein = (document.querySelector('input[name="nachunternehmerJaNein"]:checked') || {}).value || "";
  data.nachunternehmerName   = document.getElementById("nachunternehmerName").value.trim();

  // ---- BEREICH 2 Organisation ----
  data.org = {};
  for (let i = 1; i <= 4; i++) {
    const radio = document.querySelector(`input[name="org${i}"]:checked`);
    const bem   = (document.querySelector(`input[name="org${i}_bem"]`) || {}).value || "";
    data.org[`frage${i}`]          = radio ? radio.value : "";
    data.org[`frage${i}_bemerkung`]= bem;
  }

  // ---- BEREICH 3 Sicheres Arbeiten ----
  data.sicheresArbeiten = {};

  // SA1 – Speisepunkte
  const sa1_items = [...document.querySelectorAll('input[name^="sa1_"]:checked')]
    .filter(el => el.name !== "sa1_ne")
    .map(el => el.value);
  data.sicheresArbeiten.speisepunkte        = sa1_items.join(", ") || "";
  data.sicheresArbeiten.speisepunkte_ne     = document.querySelector('input[name="sa1_ne"]')?.checked ? true : false;
  data.sicheresArbeiten.speisepunkte_bem    = document.querySelector('input[name="sa1_bem"]')?.value || "";

  // SA2 – Sichtprüfung
  data.sicheresArbeiten.sichtpruefung       = document.querySelector('input[name="sa2"]')?.checked ? true : false;
  data.sicheresArbeiten.sichtpruefung_ne    = document.querySelector('input[name="sa2_ne"]')?.checked ? true : false;
  data.sicheresArbeiten.sichtpruefung_bem   = document.querySelector('input[name="sa2_bem"]')?.value || "";

  // SA3 – PSA
  const psaChecked = ['sa3','sa3_sh','sa3_ss','sa3_wv','sa3_gs','sa3_sb','sa3_ag','sa3_hg','sa3_as','sa3_so']
    .filter(n => document.querySelector(`input[name="${n}"]`)?.checked)
    .map(n => document.querySelector(`input[name="${n}"]`).value);

  const psaHgMat = document.querySelector('input[name="sa3_hg_mat"]')?.value || "";
  const psaSoTxt = document.querySelector('input[name="sa3_so_text"]')?.value || "";
  if (psaHgMat) psaChecked.push(`Schutzhandschuhe Material: ${psaHgMat}`);
  if (psaSoTxt) psaChecked.push(`Sonstiges PSA: ${psaSoTxt}`);

  data.sicheresArbeiten.psa                 = psaChecked.join(", ") || "";
  data.sicheresArbeiten.psa_ne              = document.querySelector('input[name="sa3_ne"]')?.checked ? true : false;
  data.sicheresArbeiten.psa_bem             = document.querySelector('input[name="sa3_bem"]')?.value || "";

  // ---- BEREICH 4 Gefährdungsbeurteilung ----
  data.gefaehrdung = {};
  for (let i = 1; i <= 8; i++) {
    const cb   = document.querySelector(`input[name="gef${i}"]`);
    const mass = document.querySelector(`input[name="gef${i}_mass"]`)?.value || "";
    data.gefaehrdung[`gefahr${i}`]           = cb?.checked ? cb.value : "";
    data.gefaehrdung[`gefahr${i}_massnahme`] = mass;
  }

  return data;
}


// ============================================================
// VALIDATION
// ============================================================
function validateForm() {
  let valid = true;

  // Remove old invalid states
  document.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll(".invalid-msg").forEach(el => el.remove());

  function markInvalid(el, msg) {
    el.classList.add("invalid");
    const span = document.createElement("span");
    span.className = "invalid-msg";
    span.textContent = msg || "Pflichtfeld";
    el.parentNode.insertBefore(span, el.nextSibling);
    valid = false;
  }

  // Datum – always filled automatically
  
  // Email
  const emailField = document.getElementById("email");
  if (!emailField.value.trim()) {
    markInvalid(emailField, "Bitte E-Mail-Adresse eingeben.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
    markInvalid(emailField, "Bitte gültige E-Mail-Adresse eingeben.");
  }
  
  // Name AV
  const nameAV = document.getElementById("nameAV");
  if (!nameAV.value.trim()) markInvalid(nameAV, "Bitte Namen des Arbeitsverantwortlichen eingeben.");

  // Firma – at least one checked
  const firmaChecked = document.querySelectorAll('input[name="firma"]:checked');
  if (firmaChecked.length === 0) {
    const checkGroup = document.querySelector('.checkbox-group');
    const span = document.createElement("span");
    span.className = "invalid-msg";
    span.textContent = "Bitte mindestens eine Firma auswählen.";
    checkGroup.parentNode.appendChild(span);
    valid = false;
  }

  // Baustelle
  const bAddr = document.getElementById("baustelleAddr");
  if (!bAddr.value.trim()) {
    const span = document.createElement("span");
    span.className = "invalid-msg";
    span.textContent = "Bitte Baustelle auf der Karte auswählen.";
    bAddr.parentNode.parentNode.appendChild(span);
    valid = false;
  }

  // Mitarbeiter
  const mit = document.getElementById("mitarbeiter");
  if (!mit.value || parseInt(mit.value) < 1) markInvalid(mit, "Bitte Mitarbeiteranzahl angeben.");

  // Unterschrift Unterweisung
  const uuChecked = document.querySelector('input[name="unterschriftUnterweisung"]:checked');
  if (!uuChecked) {
    const group = document.querySelector('.radio-group');
    const span = document.createElement("span");
    span.className = "invalid-msg";
    span.textContent = "Bitte Auswahl treffen.";
    group.parentNode.appendChild(span);
    valid = false;
  }
  
  // Ersthelfer
  const ersthelfer = document.getElementById("ersthelfer");
  if (!ersthelfer.value.trim()) markInvalid(ersthelfer, "Bitte Name des Ersthelfers eingeben.");

  // Nachunternehmer
  const nuChecked = document.querySelector('input[name="nachunternehmerJaNein"]:checked');
  if (!nuChecked) {
    const group = document.querySelectorAll('.radio-group')[1];
    if (group) {
      const span = document.createElement("span");
      span.className = "invalid-msg";
      span.textContent = "Bitte Auswahl treffen.";
      group.parentNode.appendChild(span);
      valid = false;
    }
  }

  // Nachunternehmer Name if "Ja"
  if (nuChecked && nuChecked.value === "Ja") {
    const nuName = document.getElementById("nachunternehmerName");
    if (!nuName.value.trim()) markInvalid(nuName, "Bitte Name des Nachunternehmers eingeben.");
  }

  // Organisation – each row must have a radio selected
  for (let i = 1; i <= 4; i++) {
    const orgChecked = document.querySelector(`input[name="org${i}"]:checked`);
    if (!orgChecked) {
      const row = document.querySelector(`input[name="org${i}"]`).closest("tr");
      const td = row.querySelector(".center");
      if (!td.querySelector(".invalid-msg")) {
        const span = document.createElement("span");
        span.className = "invalid-msg";
        span.textContent = "Pflicht!";
        row.querySelector("td").appendChild(span);
        valid = false;
      }
    }
  }

  return valid;
}


// ============================================================
// FORM SUBMIT
// ============================================================
document.getElementById("mainForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    // Scroll to first invalid
    const firstInvalid = document.querySelector(".invalid, .invalid-msg");
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = document.getElementById("submitBtn");
  const msgEl = document.getElementById("formMessage");

  // Set loading state
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span><span class="submit-text">Wird gesendet …</span>`;
  msgEl.classList.add("hidden");
  msgEl.classList.remove("success", "error");

  const formData = collectFormData();

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      msgEl.textContent = "✓  Formular wurde erfolgreich übermittelt! Vielen Dank.";
      msgEl.classList.add("success");
      msgEl.classList.remove("hidden");
      msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
      // Optionally reset form
      // document.getElementById("mainForm").reset();
      // setDateTime();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    msgEl.textContent = `✗  Fehler beim Senden: ${err.message || "Verbindung fehlgeschlagen"}. Bitte versuchen Sie es erneut.`;
    msgEl.classList.add("error");
    msgEl.classList.remove("hidden");
    msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="submit-text">Formular absenden</span>
      <svg class="submit-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>`;
  }
});

// ============================================================
// VORLAGEN (TEMPLATES) FÜR TÄTIGKEITEN
// ============================================================

const templates = {
  rohrbau: {
    ausfuehrendeArbeiten: "Verlegung und Installation von Rohrleitungen, Anschlussarbeiten, Druckprüfungen",
    org1: "Ja", org2: "Ja", org3: "Ja", org4: "Ja",
    sa1_bsv: true, sa1_esg: true, sa2: true, sa3: true,
    sa3_sh: true, sa3_ss: true, sa3_wv: true, sa3_sb: true, sa3_hg: true, sa3_hg_mat: "Leder",
    gef1: true, gef1_mass: "Absturzsicherung durch Geländer und PSA",
    gef2: true, gef2_mass: "Verbauarbeiten nach DIN 4124, regelmäßige Kontrolle",
    gef5: true, gef5_mass: "Einweisung in Maschinenbedienung, Sicherheitsabstände einhalten"
  },
  tiefbau: {
    ausfuehrendeArbeiten: "Erdarbeiten, Grabenarbeiten, Kanalbau, Straßenbau, Pflasterarbeiten",
    org1: "Ja", org2: "Ja", org3: "Ja", org4: "Ja",
    sa1_bsv: true, sa1_esg: true, sa2: true, sa3: true,
    sa3_sh: true, sa3_ss: true, sa3_wv: true, sa3_sb: true, sa3_hg: true, sa3_hg_mat: "Leder",
    gef1: true, gef1_mass: "Absturzsicherungen an Baugruben, PSAgA",
    gef2: true, gef2_mass: "Verbauarbeiten, Böschungswinkel prüfen",
    gef5: true, gef5_mass: "Einweisung Baumaschinen, Sicherheitsabstände",
    gef7: true, gef7_mass: "Absperrungen, Verkehrssicherung nach RSA"
  },
  bohrung: {
    ausfuehrendeArbeiten: "Horizontalbohrung, Kabelverlegung, Spülbohrverfahren, Pilotbohrung",
    org1: "Ja", org2: "Ja", org3: "Ja", org4: "Nicht erforderlich",
    sa1_bsv: true, sa1_esg: true, sa2: true, sa3: true,
    sa3_sh: true, sa3_ss: true, sa3_wv: true, sa3_gs: true, sa3_sb: true, sa3_hg: true, sa3_hg_mat: "Nitril",
    gef2: true, gef2_mass: "Baugrundgutachten beachten, Bohrflüssigkeit kontrollieren",
    gef4: true, gef4_mass: "Bentonit: Hautschutz, Handschuhe tragen",
    gef5: true, gef5_mass: "Einweisung Bohrgerät, Not-Aus zugänglich"
  },
  lager: {
    ausfuehrendeArbeiten: "Warenannahme, Einlagerung, Kommissionierung, Versand, Staplerfahrten",
    org1: "Ja", org2: "Ja", org3: "Nicht erforderlich", org4: "Nicht erforderlich",
    sa2: true, sa3: true, sa3_ss: true, sa3_wv: true, sa3_hg: true, sa3_hg_mat: "Textil",
    gef1: true, gef1_mass: "Regale sicher aufgestellt, Leitern nach TRBS 2121",
    gef5: true, gef5_mass: "Staplerschein, Fußgängerwege markiert",
    gef7: true, gef7_mass: "Warnweste im gesamten Lager"
  },
  fernwaerme: {
    ausfuehrendeArbeiten: "Verlegung Fernwärmeleitungen, Dämmarbeiten, Schweißarbeiten, Druckprüfungen",
    org1: "Ja", org2: "Ja", org3: "Ja", org4: "Ja",
    sa1_bsv: true, sa1_tt: true, sa2: true, sa3: true,
    sa3_sh: true, sa3_ss: true, sa3_wv: true, sa3_sb: true, sa3_hg: true, sa3_hg_mat: "Hitzebeständig", sa3_as: true,
    gef2: true, gef2_mass: "Verbauarbeiten, Leitungspläne vorhanden",
    gef3: true, gef3_mass: "Schweißerlaubnis, Feuerlöscher bereit",
    gef4: true, gef4_mass: "Dämmaterial: Atemschutz FFP2",
    gef8: true, gef8_mass: "Heiße Leitungen: Schutzhandschuhe, Abkühlzeit"
  },
  glasfaser: {
    ausfuehrendeArbeiten: "Glasfaserverlegung, Spleiß- und Montagearbeiten, Kabeleinzug",
    org1: "Ja", org2: "Ja", org3: "Ja", org4: "Ja",
    sa1_bsv: true, sa2: true, sa3: true,
    sa3_sh: true, sa3_ss: true, sa3_wv: true, sa3_sb: true, sa3_hg: true, sa3_hg_mat: "Schnittschutz",
    gef1: true, gef1_mass: "Absturzsicherung bei Arbeiten an Masten/Schächten",
    gef4: true, gef4_mass: "Glasfasersplitter: Schutzbrille, Hautschutz",
    gef7: true, gef7_mass: "Verkehrssicherung, Warnung vor Lasergeräten"
  }
};

// Template Buttons Event Listener
document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const templateName = btn.getAttribute('data-template');
    const template = templates[templateName];
    if (!template) return;
    // Direkt Template anwenden - ohne Bestätigung
    applyTemplate(template);
    btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--accent)';
    setTimeout(() => { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }, 600);
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function applyTemplate(t) {
  if (t.ausfuehrendeArbeiten) document.getElementById('ausfuehrendeArbeiten').value = t.ausfuehrendeArbeiten;
  for (let i = 1; i <= 4; i++) if (t[`org${i}`]) { const r = document.querySelector(`input[name="org${i}"][value="${t[`org${i}`]}"]`); if (r) r.checked = true; }
  ['sa1_bsv','sa1_esg','sa1_tt','sa1_ksv','sa1_prcd','sa2','sa3','sa3_sh','sa3_ss','sa3_wv','sa3_gs','sa3_sb','sa3_ag','sa3_hg','sa3_as','sa3_so'].forEach(n => { const c = document.querySelector(`input[name="${n}"]`); if (c && t[n]) c.checked = true; });
  if (t.sa3_hg_mat) document.querySelector('input[name="sa3_hg_mat"]').value = t.sa3_hg_mat;
  for (let i = 1; i <= 8; i++) { if (t[`gef${i}`]) { const c = document.querySelector(`input[name="gef${i}"]`); if (c) c.checked = true; } if (t[`gef${i}_mass`]) { const inp = document.querySelector(`input[name="gef${i}_mass"]`); if (inp) inp.value = t[`gef${i}_mass`]; } }
}

// ============================================================
// AUTO-HIDE HEADER ON SCROLL
// ============================================================
let lastScrollTop = 0;
let scrollThreshold = 100; // Erst nach 100px scrollen reagieren
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Nur reagieren wenn genug gescrollt wurde
  if (Math.abs(scrollTop - lastScrollTop) < 5) return;
  
  if (scrollTop > lastScrollTop && scrollTop > scrollThreshold) {
    // Runterscrollen - Header verstecken
    header.classList.add('header-hidden');
  } else {
    // Hochscrollen - Header zeigen
    header.classList.remove('header-hidden');
  }
  
  lastScrollTop = scrollTop;
});
