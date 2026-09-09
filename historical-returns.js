/* Ten complete calendar years of MSCI World gross returns in CHF, deflated by Swiss CPI. */
(function(root){
  const observations=[
    {year:2016,nominal:9.81,inflation:-0.4},
    {year:2017,nominal:18.00,inflation:0.5},
    {year:2018,nominal:-7.14,inflation:0.9},
    {year:2019,nominal:26.13,inflation:0.4},
    {year:2020,nominal:6.34,inflation:-0.7},
    {year:2021,nominal:26.11,inflation:0.6},
    {year:2022,nominal:-16.46,inflation:2.8},
    {year:2023,nominal:13.18,inflation:2.1},
    {year:2024,nominal:28.34,inflation:1.1},
    {year:2025,nominal:6.30,inflation:0.2}
  ].map(row=>({...row,real:(1+row.nominal/100)/(1+row.inflation/100)*100-100}));
  const realReturns=observations.map(row=>row.real);
  const paths={
    pessimistic:[...realReturns].sort((a,b)=>a-b),
    optimistic:[...realReturns].sort((a,b)=>b-a)
  };
  root.HistoricalReturns={observations,paths,from:2016,to:2025};
  if(typeof module!=='undefined')module.exports=root.HistoricalReturns;
})(globalThis);
