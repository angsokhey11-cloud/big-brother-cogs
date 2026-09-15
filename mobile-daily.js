/* BIG BROTHER — Daily COGS Mobile V1 */
(function(){
'use strict';

const $=id=>document.getElementById(id);
const state={report:null,loading:false,collapsed:new Set()};

function n(value){const x=Number(value);return Number.isFinite(x)?x:0}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function qty(value){return n(value).toLocaleString('en-US',{maximumFractionDigits:2})}
function money(value){return '$'+n(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function cost(value){const x=n(value);return Math.abs(x)<0.000001?'$0.00':'$'+x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6})}
function clean(value){return String(value??'').trim()}
function todayPhnomPenh(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Phnom_Penh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  let y='',m='',d='';
  parts.forEach(p=>{if(p.type==='year')y=p.value;if(p.type==='month')m=p.value;if(p.type==='day')d=p.value});
  return y+'-'+m+'-'+d;
}
function visibleDate(value){
  const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return value||'';
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return m[3]+'-'+months[Number(m[2])-1]+'-'+m[1];
}
function setStatus(text,type=''){$('status').textContent=text||'';$('status').className='status'+(type?' '+type:'')}
function setError(text){const msg=clean(text);$('errorBox').hidden=!msg;$('errorBox').textContent=msg}
function setLoading(flag){
  state.loading=!!flag;
  $('loadingBox').hidden=!flag;
  ['reportDate','todayBtn','refreshBtn','topRefreshBtn'].forEach(id=>{const el=$(id);if(el)el.disabled=!!flag});
}
function statusBadge(row){
  const status=clean(row.costStatus||'OK').toUpperCase();
  if(status==='OK')return '<span class="badge ok">OK</span>';
  if(status==='MISSING_COST')return '<span class="badge warning">⚠ MISSING COST</span>';
  return '<span class="badge error">'+esc(status)+'</span>';
}
function renderSummary(){
  const totals=state.report?.totals||{};
  $('sumPurchased').textContent=qty(totals.purchasedSoldQty);
  $('sumZero').textContent=qty(totals.zeroCostSoldQty);
  $('sumTotal').textContent=qty(totals.totalSoldQty);
  $('sumLocations').textContent=qty(state.report?.locationCount);
  $('sumCOGS').textContent=money(totals.dailyCOGSUSD);
  $('grandCOGS').textContent=money(totals.dailyCOGSUSD);
  $('grandMeta').textContent=qty(totals.totalSoldQty)+' total net Qty sold · Purchased inventory cost only';
  $('summary').hidden=false;
  $('grandCard').hidden=false;
}
function renderQuality(){
  const q=state.report?.dataQuality||{};
  const box=$('quality');
  if(!q.hasIssues){box.hidden=true;box.innerHTML='';return}
  box.hidden=false;
  box.innerHTML='<strong>⚠ COGS Data Quality Warning</strong>'+
    'Purchased stock with a missing historical cost is NOT treated as Zero-Cost. '+
    'Missing Cost Rows: <b>'+qty(q.missingCostRowCount)+'</b> · '+
    'Missing Cost Qty: <b>'+qty(q.missingCostQty)+'</b> · '+
    'Unknown Source Rows: <b>'+qty(q.unknownSourceRowCount)+'</b> · '+
    'Zero-Cost Value Errors: <b>'+qty(q.zeroCostNonzeroValueRowCount)+'</b>';
}
function filteredLocations(){
  const query=$('search').value.trim().toLowerCase();
  const locations=Array.isArray(state.report?.locations)?state.report.locations:[];
  if(!query)return locations;
  return locations.map(location=>{
    const locationMatch=[location.locationCode,location.locationName].join(' ').toLowerCase().includes(query);
    const products=(Array.isArray(location.products)?location.products:[]).filter(product=>{
      if(locationMatch)return true;
      return [product.productCode,product.productName,product.sku].join(' ').toLowerCase().includes(query);
    });
    return {...location,products};
  }).filter(location=>location.products.length>0);
}
function productRow(product){
  return '<article class="product-row">'+
    '<div class="product-top">'+
      '<div class="product-name"><strong>'+esc(product.productName||'-')+'</strong><span>'+esc(product.productCode||product.sku||'-')+(product.unit?' · '+esc(product.unit):'')+'</span></div>'+
      statusBadge(product)+
    '</div>'+
    '<div class="product-metrics">'+
      '<div class="metric"><small>Purchased Sold</small><strong>'+qty(product.purchasedSoldQty)+'</strong></div>'+
      '<div class="metric zero"><small>Zero-Cost Sold</small><strong>'+qty(product.zeroCostSoldQty)+'</strong></div>'+
      '<div class="metric total"><small>Total Sold</small><strong>'+qty(product.totalSoldQty)+'</strong></div>'+
      '<div class="metric"><small>Purchased Cost</small><strong>'+cost(product.purchasedUnitCost)+'</strong></div>'+
      '<div class="metric cogs"><small>Total COGS</small><strong>'+money(product.totalCOGSUSD)+'</strong></div>'+
      '<div class="metric"><small>Transactions</small><strong>'+qty(product.transactionCount)+'</strong></div>'+
    '</div>'+
  '</article>';
}
function locationCard(location,index){
  const products=Array.isArray(location.products)?location.products:[];
  const key=clean(location.locationCode)||String(index);
  const collapsed=state.collapsed.has(key);
  return '<section class="location-card'+(collapsed?' collapsed':'')+'" data-location-key="'+esc(key)+'">'+
    '<header class="location-head">'+
      '<div class="location-title"><strong>📍 '+esc(location.locationName||location.locationCode||'Location')+'</strong><span>'+esc(location.locationCode||'')+'</span></div>'+
      '<div class="location-actions">'+
        '<div class="location-cogs"><small>Location COGS</small><strong>'+money(location.locationCOGSUSD)+'</strong></div>'+
        '<button type="button" class="location-toggle" data-toggle-location="'+esc(key)+'" aria-label="Toggle location">⌄</button>'+
      '</div>'+
    '</header>'+
    '<div class="location-body">'+
      '<div class="location-stats">'+
        '<div class="location-stat"><small>Purchased Sold</small><strong>'+qty(location.purchasedSoldQty)+'</strong></div>'+
        '<div class="location-stat zero"><small>Zero-Cost Sold</small><strong>'+qty(location.zeroCostSoldQty)+'</strong></div>'+
        '<div class="location-stat"><small>Total Sold</small><strong>'+qty(location.totalSoldQty)+'</strong></div>'+
      '</div>'+
      '<div>'+products.map(productRow).join('')+'</div>'+
    '</div>'+
  '</section>';
}
function bindLocationToggles(){
  $('content').querySelectorAll('[data-toggle-location]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key=btn.dataset.toggleLocation;
      if(state.collapsed.has(key))state.collapsed.delete(key);else state.collapsed.add(key);
      const card=btn.closest('.location-card');
      if(card)card.classList.toggle('collapsed',state.collapsed.has(key));
    });
  });
}
function renderContent(){
  if(!state.report)return;
  const locations=filteredLocations();
  if(!locations.length){
    $('content').innerHTML='<div class="empty">No COGS activity found for <strong>'+esc(visibleDate(state.report.reportDate))+'</strong>.</div>';
    return;
  }
  $('content').innerHTML=locations.map(locationCard).join('');
  bindLocationToggles();
}
function render(){renderSummary();renderQuality();renderContent()}
function clearReport(){
  state.report=null;
  $('summary').hidden=true;
  $('quality').hidden=true;
  $('quality').innerHTML='';
  $('content').innerHTML='';
  $('grandCard').hidden=true;
}
async function loadReport(){
  if(state.loading)return;
  const date=$('reportDate').value;
  if(!date){setError('Report Date is required.');return}
  setLoading(true);
  setError('');
  setStatus('Loading Daily COGS...');
  try{
    if(!window.BBCogsAdapter||typeof window.BBCogsAdapter.dailyReport!=='function')throw new Error('COGS Supabase Adapter is not available.');
    const data=await window.BBCogsAdapter.dailyReport(date);
    if(!data||data.success!==true)throw new Error('Daily COGS Report returned an invalid response.');
    state.report=data;
    render();
    setStatus('Daily COGS loaded · '+(data.version||'DAILY-COGS-REPORT-V1')+' · Generated '+(data.generatedAt||''),'ok');
  }catch(error){
    console.error(error);
    clearReport();
    setError(clean(error?.message||error)||'Could not load Daily COGS Report.');
    setStatus(clean(error?.message||error),'error');
  }finally{
    setLoading(false);
  }
}

$('refreshBtn').addEventListener('click',loadReport);
$('topRefreshBtn').addEventListener('click',loadReport);
$('reportDate').addEventListener('change',loadReport);
$('todayBtn').addEventListener('click',()=>{$('reportDate').value=todayPhnomPenh();loadReport()});
$('search').addEventListener('input',renderContent);
$('reportDate').value=todayPhnomPenh();
loadReport();
})();
