/* Tabler Icons (MIT) als lokale Inline-SVGs.
 * Diese App hat keinen Build-Schritt und kein React; die offiziellen Tabler-Pfade
 * werden deshalb unverändert als SVG eingebunden (Outline, currentColor, 20 × 20 px,
 * stroke-width 1.75). Keine Emojis, keine zweite Icon-Sprache. */
(function(root){
  const paths = {
    calendarStats: ['M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4','M18 14v4h4','M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0','M15 3v4','M7 3v4','M3 11h16'],
    arrowsExchange: ['M7 10h14l-4 -4','M17 14h-14l4 4'],
    chartLine: ['M4 19l16 0','M4 15l4 -6l4 2l4 -5l4 4'],
    chartBar: ['M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6','M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10','M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14','M4 20h14'],
    coins: ['M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3','M9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4','M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0c1.856 -.536 3 -1.526 3 -2.598c0 -1.072 -1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0c-1.856 .536 -3 1.526 -3 2.598','M3 6v10c0 .888 .772 1.45 2 2','M3 11c0 .888 .772 1.45 2 2'],
    wallet: ['M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12','M20 12v4h-4a2 2 0 0 1 0 -4h4'],
    buildingBank: ['M3 21l18 0','M3 10l18 0','M5 6l7 -3l7 3','M4 10l0 11','M20 10l0 11','M8 14l0 3','M12 14l0 3','M16 14l0 3'],
    pigMoney: ['M15 11v.01','M5.173 8.378a3 3 0 1 1 4.656 -1.377','M16 4v3.803a6.019 6.019 0 0 1 2.658 3.197h1.341a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-1.342c-.336 .95 -.907 1.8 -1.658 2.473v2.027a1.5 1.5 0 0 1 -3 0v-.583a6.04 6.04 0 0 1 -1 .083h-4a6.04 6.04 0 0 1 -1 -.083v.583a1.5 1.5 0 0 1 -3 0v-2l0 -.027a6 6 0 0 1 4 -10.473h2.5l4.5 -3'],
    receiptTax: ['M9 14l6 -6','M9 8.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0','M14 13.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0','M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2'],
    shoppingCart: ['M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0','M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0','M17 17h-11v-14h-2','M6 5l14 1l-1 7h-13'],
    trendingUp: ['M3 17l6 -6l4 4l8 -8','M14 7l7 0l0 7'],
    chartDonut: ['M10 3.2a9 9 0 1 0 10.8 10.8a1 1 0 0 0 -1 -1h-3.8a4.1 4.1 0 1 1 -5 -5v-4a.9 .9 0 0 0 -1 -.8','M15 3.5a9 9 0 0 1 5.5 5.5h-4.5a9 9 0 0 0 -1 -1v-4.5'],
    chartDots3: ['M3 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0','M14 15a2 2 0 1 0 4 0a2 2 0 1 0 -4 0','M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0','M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0','M9 17l5 -1.5','M6.5 8.5l7.81 5.37','M7 7l8 -1'],
    cash: ['M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3','M7 10a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8','M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0'],
    listDetails: ['M13 5h8','M13 9h5','M13 15h8','M13 19h5','M3 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4','M3 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4'],
    circleCheck: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0','M9 12l2 2l4 -4'],
    infoCircle: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0','M12 9h.01','M11 12h1v4h1'],
    alertCircle: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0','M12 8v4','M12 16h.01'],
    chevronLeft: ['M15 6l-6 6l6 6'],
    chevronRight: ['M9 6l6 6l-6 6'],
    chevronDown: ['M6 9l6 6l6 -6'],
    chevronUp: ['M6 15l6 -6l6 6'],
    close: ['M18 6l-12 12','M6 6l12 12'],
    bulb: ['M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7','M9 16a5 5 0 1 1 6 0a3 3 0 0 0 -1 3a2 2 0 0 1 -4 0a3 3 0 0 0 -1 -3','M9.7 17h4.6'],
    user: ['M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0','M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2'],
    users: ['M9 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0','M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2','M16 3.13a4 4 0 0 1 0 7.75','M21 21v-2a4 4 0 0 0 -3 -3.85']
  };
  function icon(name, {size = 20, stroke = 1.75, className = 'v3-icon', label = ''} = {}) {
    const glyph = paths[name];
    if (!glyph) return '';
    const attrs = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
    return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"${attrs}>${glyph.map(d => `<path d="${d}"/>`).join('')}</svg>`;
  }
  root.Icons = {paths, icon};
  if (typeof module !== 'undefined') module.exports = root.Icons;
})(globalThis);
