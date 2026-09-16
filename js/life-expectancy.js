/* BFS Periodensterbetafeln 2023, reference year 2023, indicator ex.
 * Source: https://www.bfs.admin.ch/asset/de/px-x-0102020300_102
 * API: https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-0102020300_102/px-x-0102020300_102.px
 * Retrieved 2026-09-12. Rows: [current age, remaining years male, female].
 * Equal sex weighting is our documented model assumption, not an official pooled BFS statistic.
 */
(function(root){
  const reference='bfs-period-2023';
  const rows=Object.freeze([
    [18, 64.64, 68.81],
    [19, 63.66, 67.83],
    [20, 62.68, 66.84],
    [21, 61.7, 65.85],
    [22, 60.72, 64.86],
    [23, 59.75, 63.87],
    [24, 58.77, 62.88],
    [25, 57.79, 61.89],
    [26, 56.81, 60.9],
    [27, 55.84, 59.91],
    [28, 54.86, 58.92],
    [29, 53.88, 57.93],
    [30, 52.91, 56.94],
    [31, 51.93, 55.95],
    [32, 50.96, 54.96],
    [33, 49.98, 53.97],
    [34, 49.01, 52.98],
    [35, 48.03, 52],
    [36, 47.06, 51.01],
    [37, 46.08, 50.03],
    [38, 45.11, 49.04],
    [39, 44.14, 48.06],
    [40, 43.17, 47.08],
    [41, 42.21, 46.1],
    [42, 41.24, 45.12],
    [43, 40.28, 44.14],
    [44, 39.32, 43.16],
    [45, 38.36, 42.19],
    [46, 37.4, 41.22],
    [47, 36.45, 40.25],
    [48, 35.5, 39.28],
    [49, 34.55, 38.31],
    [50, 33.61, 37.35],
    [51, 32.68, 36.38],
    [52, 31.74, 35.42],
    [53, 30.82, 34.47],
    [54, 29.9, 33.52],
    [55, 28.98, 32.57],
    [56, 28.07, 31.62],
    [57, 27.17, 30.68],
    [58, 26.27, 29.75],
    [59, 25.39, 28.81],
    [60, 24.5, 27.88],
    [61, 23.63, 26.96],
    [62, 22.77, 26.04],
    [63, 21.92, 25.13],
    [64, 21.08, 24.23],
    [65, 20.25, 23.33],
    [66, 19.43, 22.44],
    [67, 18.62, 21.56],
    [68, 17.82, 20.68],
    [69, 17.03, 19.82],
    [70, 16.24, 18.95],
    [71, 15.47, 18.1],
    [72, 14.71, 17.25],
    [73, 13.95, 16.42],
    [74, 13.22, 15.59],
    [75, 12.49, 14.78],
    [76, 11.78, 13.97],
    [77, 11.08, 13.18],
    [78, 10.4, 12.4],
    [79, 9.74, 11.64],
    [80, 9.1, 10.9],
    [81, 8.47, 10.17],
    [82, 7.87, 9.47],
    [83, 7.29, 8.79],
    [84, 6.74, 8.14],
    [85, 6.22, 7.52],
    [86, 5.73, 6.92],
    [87, 5.26, 6.37],
    [88, 4.82, 5.85],
    [89, 4.42, 5.36],
    [90, 4.04, 4.91],
    [91, 3.69, 4.5],
    [92, 3.38, 4.13],
    [93, 3.1, 3.78],
    [94, 2.84, 3.47],
    [95, 2.61, 3.19],
    [96, 2.41, 2.93],
    [97, 2.22, 2.69],
    [98, 2.04, 2.48],
    [99, 1.87, 2.28],
    [100, 1.72, 2.11],
  ].map(Object.freeze));
  function remainingYears(age){
    if(!Number.isInteger(age)||age<18||age>100)throw Error('Das aktuelle Alter muss zwischen 18 und 100 liegen.');
    const row=rows[age-18];return (row[1]+row[2])/2;
  }
  function defaultTargetAge(age,start=age){
    if(!Number.isInteger(start)||start<age||start>100)throw Error('Bitte das Pensionierungsalter prüfen.');
    return Math.max(Math.ceil(age+remainingYears(age)),start+1);
  }
  function updateAutomatic(state){
    if(state.horizonMode!=='automatic')return;
    state.planningAge=defaultTargetAge(state.currentAge,state.mode==='post'?state.currentAge:state.retirementAge);
    state.horizonReference=reference;
  }
  function explanation(state){
    if(state.horizonMode!=='automatic')return 'Dein gespeicherter Planungshorizont. Unter «Lebensphasen & Annahmen» anpassbar.';
    const extended=state.planningAge>Math.ceil(state.currentAge+remainingYears(state.currentAge));
    return extended?'Der statistische Referenzwert liegt vor oder am Planungsstart. Wir planen mindestens ein Ruhestandsjahr. Unter «Lebensphasen & Annahmen» anpassbar.':'Aus der durchschnittlichen Restlebenserwartung im heutigen Alter in der Schweiz abgeleitet. Unter «Lebensphasen & Annahmen» anpassbar.';
  }
  root.LifeExpectancy={reference,rows,remainingYears,defaultTargetAge,updateAutomatic,explanation};
  if(typeof module!=='undefined')module.exports=root.LifeExpectancy;
})(globalThis);
