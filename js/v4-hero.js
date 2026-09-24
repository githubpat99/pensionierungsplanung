/* Hero-/Hintergrundbild (V4) – zentral gekapselt.
 *
 * Verbindliche Assets (keine externen Bilder, keine Ersatzbilder):
 *   public/images/Background.png          → Mobile (primäre Referenz, 940 × 1672)
 *   public/images/Background_Desktop.png  → Desktop (2172 × 724)
 * Das Mobile-Bild beginnt oben gut erkennbar und ist unten bereits weich in Creme
 * auslaufend vorbereitet; die Darstellung ergänzt nur einen leichten Schleier für die
 * Lesbarkeit. Kein Parallax, keine Animation, kein Fixieren – das Bild scrollt normal mit.
 *
 * Die Komponente hängt das Bild genau einmal in `#v4Hero` ein und steuert danach nur die
 * Intensität über `data-mode`:
 *   start – Schnellstart (Empty State von «Mein Plan»): Bild klar erkennbar
 *   calm  – «Mein Plan» und alle Detailseiten: dezenter visueller Übergang
 * Der Modus wird aus dem Inhalt abgeleitet, nicht je Screen gesetzt: kein Screen
 * implementiert den Hero selbst. */
(function (root) {
  const mobileAsset = 'public/images/Background.png';
  const desktopAsset = 'public/images/Background_Desktop.png';
  const hostId = 'v4Hero';
  let observer = null;

  /* Der Schnellstart ist der einzige Zustand mit dem Schnellstart-Formular. */
  function mode() {
    const app = document.getElementById('app');
    return app && app.querySelector('.v4-start') ? 'start' : 'calm';
  }

  function sync() {
    const host = document.getElementById(hostId);
    if (host) host.dataset.mode = mode();
  }

  function mount() {
    const host = document.getElementById(hostId);
    if (!host) return null;
    if (!host.querySelector('img')) {
      host.innerHTML = `<picture class="v4-hero-media"><source media="(min-width:700px)" srcset="${desktopAsset}"><img class="v4-hero-image" src="${mobileAsset}" alt="" width="940" height="1672" fetchpriority="high" decoding="sync"></picture>`;
    }
    sync();
    const app = document.getElementById('app');
    if (app && typeof MutationObserver === 'function') {
      if (observer) observer.disconnect();
      observer = new MutationObserver(sync);
      observer.observe(app, {childList:true});
    }
    return host;
  }

  root.RetirementHero = {mobileAsset, desktopAsset, asset:mobileAsset, mount, sync, mode};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})(globalThis);
