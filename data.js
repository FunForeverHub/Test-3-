const packagedData = window.DASHBOARD_DATA || [];
let rawData = loadLocalData() || packagedData;
let currentCompleted = [];
let currentActive = [];
let sortState = {completed:{key:'savings',dir:'desc'}, active:{key:'savings',dir:'desc'}};
const charts = {};
const statusOrder = ['Backlog','Queued','In Progress','In UAT','Done','Cancelled','Canceled'];
const statusColors = {'Backlog':'#9aa4b2','Queued':'#59a9ff','In Progress':'#1e5aa8','In UAT':'#7147d8','Done':'#0f8f5f','Cancelled':'#4b5563','Canceled':'#4b5563'};
const palette = ['#0b3d91','#7147d8','#59a9ff','#19b7a6','#9b5de5','#1e5aa8','#0f8f5f'];

function val(row, name){ return row[name] ?? ''; }
function text(row, name){ const v = val(row,name); return v === null || v === undefined || String(v).trim()==='' ? '' : String(v).trim(); }
function num(row, name){ const v = val(row,name); if(v === '' || v == null) return 0; const n = Number(String(v).replace(/[$,]/g,'')); return isNaN(n) ? 0 : n; }
function normStatus(v){ v = String(v || '').replace(/^\d+\.\s*/, '').trim(); if(v.toLowerCase()==='canceled') return 'Cancelled'; return v || 'Unknown'; }
function category(row){ const v = text(row,'GTO Work Category'); return v === 'BAU/KTLO' ? 'KTLO' : (v || 'Uncategorized'); }
function isParent(row){ const b = val(row,'Business Solution'); const level = Number(val(row,'Level')); return String(b).trim()==='1' || level===0; }
function solutionName(row){ return text(row,'Summary') || text(row,'Workspace Name') || text(row,'Description') || 'Untitled Solution'; }
function typeSavings(row){ return text(row,'Financial Impact') || text(row,'Business Impact Category') || 'Not specified'; }
function cleanCell(v){ return String(v || '').trim() || '—'; }
function fmtMoney(n){ return Number(n || 0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}); }
function fmtNum(n){ return Number(n || 0).toLocaleString('en-US'); }
function unique(arr){ return [...new Set(arr.filter(x=>x && x !== '—'))]; }
function parentRows(data){ return data.filter(isParent).filter(r=>solutionName(r)); }
function activeStatuses(){ return new Set(['Backlog','Queued','In Progress','In UAT']); }
function completedStatuses(){ return new Set(['Done']); }
function statusSort(a,b){ return (statusOrder.indexOf(a) < 0 ? 999 : statusOrder.indexOf(a)) - (statusOrder.indexOf(b) < 0 ? 999 : statusOrder.indexOf(b)); }
function byCountMap(rows, getter){ const m = {}; rows.forEach(r=>{ const k = getter(r); if(k) m[k]=(m[k]||0)+1; }); return m; }
function bySumMap(rows, getter, amount){ const m = {}; rows.forEach(r=>{ const k = getter(r); if(k) m[k]=(m[k]||0)+amount(r); }); return m; }
function asRows(map, order){ let keys = Object.keys(map); if(order) keys.sort((a,b)=>order.indexOf(a)-order.indexOf(b)); else keys.sort((a,b)=>map[b]-map[a]); return keys.map(k=>[k,map[k]]); }

function loadLocalData(){ try{ const s = localStorage.getItem('dashboardUploadedData'); return s ? JSON.parse(s) : null; }catch(e){ return null; } }
function saveLocalData(data, filename){ localStorage.setItem('dashboardUploadedData', JSON.stringify(data)); localStorage.setItem('dashboardUploadedName', filename || 'Uploaded File'); }
function clearLocalData(){ localStorage.removeItem('dashboardUploadedData'); localStorage.removeItem('dashboardUploadedName'); }

function init(){
  document.getElementById('fileUpload').addEventListener('change', handleUpload);
  document.getElementById('restoreDataBtn').addEventListener('click', ()=>{ clearLocalData(); rawData = packagedData; buildFilters(true); render(); });
  document.getElementById('resetBtn').addEventListener('click', ()=>{ document.querySelectorAll('.filterBar select').forEach(s=>s.value='All'); render(); });
  ['category','status','department','priority','year'].forEach(id=>document.getElementById(id+'Filter').addEventListener('change', render));
  document.getElementById('completedSearch').addEventListener('input', renderTables);
  document.getElementById('activeSearch').addEventListener('input', renderTables);
  document.querySelectorAll('th[data-sort]').forEach(th=>th.addEventListener('click',()=>handleSort(th)));
  document.querySelectorAll('button[data-export]').forEach(btn=>btn.addEventListener('click',()=>exportCsv(btn.dataset.export)));
  const name = localStorage.getItem('dashboardUploadedName'); if(name) document.getElementById('sourceInfo').textContent = name;
  document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  buildFilters(true); render();
}

function buildFilters(reset=false){
  const opts = {
    category: unique(rawData.map(category)).sort(),
    status: unique(rawData.map(r=>normStatus(text(r,'Jira Status')))).sort(statusSort),
    department: unique(rawData.map(r=>text(r,'Department'))).sort(),
    priority: unique(rawData.map(r=>text(r,'Priority'))).sort(),
    year: unique(rawData.map(r=>String(val(r,'Year')||'').trim())).sort()
  };
  Object.entries(opts).forEach(([id,values])=>{
    const sel = document.getElementById(id+'Filter'); const current = reset ? 'All' : sel.value;
    sel.innerHTML = '<option value="All">All</option>' + values.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
    sel.value = values.includes(current) ? current : 'All';
  });
}

function filteredData(){
  const f = {
    category: document.getElementById('categoryFilter').value,
    status: document.getElementById('statusFilter').value,
    department: document.getElementById('departmentFilter').value,
    priority: document.getElementById('priorityFilter').value,
    year: document.getElementById('yearFilter').value,
  };
  document.getElementById('reportingYear').textContent = f.year;
  return rawData.filter(r =>
    (f.category==='All'||category(r)===f.category) &&
    (f.status==='All'||normStatus(text(r,'Jira Status'))===f.status) &&
    (f.department==='All'||text(r,'Department')===f.department) &&
    (f.priority==='All'||text(r,'Priority')===f.priority) &&
    (f.year==='All'||String(val(r,'Year')||'').trim()===f.year)
  );
}

function render(){
  const rows = filteredData(); const parents = parentRows(rows);
  document.getElementById('kpiParentSolutions').textContent = fmtNum(unique(parents.map(solutionName)).length);
  document.getElementById('kpiTickets').textContent = fmtNum(rows.length);
  document.getElementById('kpiInitiatives').textContent = fmtNum(rows.filter(r=>category(r)==='Initiative').length);
  document.getElementById('kpiEnhancements').textContent = fmtNum(rows.filter(r=>category(r)==='Enhancement').length);
  document.getElementById('kpiKTLO').textContent = fmtNum(rows.filter(r=>category(r)==='KTLO').length);
  document.getElementById('kpiSavings').textContent = fmtMoney(parents.reduce((s,r)=>s+num(r,'Total Savings/ Year'),0));
  document.getElementById('kpiDepartments').textContent = fmtNum(unique(parents.map(r=>text(r,'Department'))).length || unique(rows.map(r=>text(r,'Department'))).length);
  renderCharts(rows, parents); prepTables(parents); renderTables();
}

function renderCharts(rows, parents){
  const statusCounts = byCountMap(parents, r=>normStatus(text(r,'Jira Status')));
  const statusSeries = statusOrder.filter(s=>statusCounts[s]).map(s=>[s,statusCounts[s]]);
  chartBar('solutionsByStatus', statusSeries.map(x=>x[0]), statusSeries.map(x=>x[1]), statusSeries.map(x=>statusColors[x[0]]||'#1e5aa8'), false);
  const savingsMap = bySumMap(parents, r=>normStatus(text(r,'Jira Status')), r=>num(r,'Total Savings/ Year'));
  const savingsSeries = statusOrder.filter(s=>savingsMap[s]!==undefined).map(s=>[s,savingsMap[s]]);
  chartBar('savingsByStatus', savingsSeries.map(x=>x[0]), savingsSeries.map(x=>x[1]), savingsSeries.map(x=>statusColors[x[0]]||'#1e5aa8'), true);
  const typeMap = byCountMap(parents, typeSavings); const typeSeries = asRows(typeMap).slice(0,7);
  chartDoughnut('typeOfSavings', typeSeries.map(x=>shortLabel(x[0])), typeSeries.map(x=>x[1]));
  const catMap = byCountMap(rows, category); const cats = ['Initiative','Enhancement','KTLO'].filter(k=>catMap[k]);
  chartBar('ticketsByCategory', cats, cats.map(k=>catMap[k]), ['#1e5aa8','#7147d8','#19b7a6'], false);
  const deptMap = byCountMap(rows, r=>text(r,'Department')); const depts = asRows(deptMap).slice(0,10);
  chartBar('departmentTickets', depts.map(x=>x[0]), depts.map(x=>x[1]), depts.map((_,i)=>palette[i%palette.length]), false);
}

function chartBar(id, labels, data, colors, money){
  if(charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {type:'bar', data:{labels, datasets:[{data, backgroundColor:colors, borderRadius:8, borderSkipped:false}]}, options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=> money?fmtMoney(c.raw):fmtNum(c.raw)}}}, scales:{x:{grid:{color:'#e8eef8'}, ticks:{callback:v=> money?fmtMoney(v):fmtNum(v)}}, y:{grid:{display:false}}}});
}
function chartDoughnut(id, labels, data){
  if(charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {type:'doughnut', data:{labels, datasets:[{data, backgroundColor:palette, borderColor:'#fff', borderWidth:3}]}, options:{responsive:true, maintainAspectRatio:false, cutout:'58%', plugins:{legend:{position:'right', labels:{boxWidth:12,font:{weight:'700'}}}}}});
}

function prepTables(parents){
  currentCompleted = parents.filter(r=>completedStatuses().has(normStatus(text(r,'Jira Status')))).map(rowObj).sort((a,b)=>b.savings-a.savings).slice(0,50);
  currentActive = parents.filter(r=>activeStatuses().has(normStatus(text(r,'Jira Status')))).map(rowObj).sort((a,b)=>b.savings-a.savings);
}
function rowObj(r){ return {solution:solutionName(r),status:normStatus(text(r,'Jira Status')),savings:num(r,'Total Savings/ Year'),department:cleanCell(text(r,'Department')),requestor:cleanCell(text(r,'Requestor')),description:cleanCell(text(r,'Description')),type:cleanCell(typeSavings(r)),users:num(r,'# of Users Impacted'),completed:formatDate(text(r,'Completed Date'))}; }
function renderTables(){
  renderTable('completed', currentCompleted, document.getElementById('completedSearch').value, ['solution','savings','department','requestor','type','users','completed']);
  renderTable('active', currentActive, document.getElementById('activeSearch').value, ['solution','status','savings','department','requestor','description','type','users']);
}
function renderTable(kind, data, search, cols){
  const table = document.getElementById(kind+'Table').querySelector('tbody');
  let filtered = !search ? data : data.filter(r=>Object.values(r).join(' ').toLowerCase().includes(search.toLowerCase()));
  const st = sortState[kind]; filtered = [...filtered].sort((a,b)=>compare(a[st.key],b[st.key],st.dir));
  table.innerHTML = filtered.slice(0,100).map(r=>'<tr>'+cols.map(c=>cell(c,r[c])).join('')+'</tr>').join('');
  document.getElementById(kind+'Count').textContent = `Showing ${Math.min(filtered.length,100)} of ${filtered.length} results`;
}
function cell(c,v){
  if(c==='solution') return `<td class="solution">${escapeHtml(v)}</td>`;
  if(c==='savings') return `<td class="money">${fmtMoney(v)}</td>`;
  if(c==='status') return `<td>${statusBadge(v)}</td>`;
  if(c==='type') return `<td><span class="typePill">${escapeHtml(shortLabel(v))}</span></td>`;
  if(c==='users') return `<td>${fmtNum(v)}</td>`;
  return `<td>${escapeHtml(v)}</td>`;
}
function statusBadge(s){ const cls = s==='Done'?'done':s==='In UAT'?'uat':s==='In Progress'?'progress':s==='Cancelled'?'cancel':''; return `<span class="badge ${cls}">${escapeHtml(s)}</span>`; }
function handleSort(th){ const kind = th.closest('table').id.includes('completed')?'completed':'active'; const key = th.dataset.sort; const st = sortState[kind]; st.dir = st.key===key && st.dir==='asc' ? 'desc' : 'asc'; st.key=key; renderTables(); }
function compare(a,b,dir){ if(typeof a==='number'||typeof b==='number'){return dir==='asc'?a-b:b-a} return dir==='asc'?String(a).localeCompare(String(b)):String(b).localeCompare(String(a)); }
function formatDate(v){ if(!v) return '—'; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('en-US'); }
function shortLabel(s){ return String(s||'').replace('Eliminates or reduces an existing cost (replacing an existing paid tool or vendor)','Reduces Existing Cost').replace('Avoids a new cost (replacing the need to purchase or build an external solution)','Avoids New Cost').replace('Efficiency gains (time savings only)','Efficiency Gains').replace('No financial impact','No Financial Impact'); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

function handleUpload(e){
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data,{type:'array', cellDates:true});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet,{defval:''});
    rawData = json; saveLocalData(json,file.name); document.getElementById('sourceInfo').textContent = file.name; buildFilters(true); render();
  };
  reader.readAsArrayBuffer(file);
}
function exportCsv(kind){
  const rows = kind==='completed'?currentCompleted:currentActive; const cols = kind==='completed'?['solution','savings','department','requestor','type','users','completed']:['solution','status','savings','department','requestor','description','type','users'];
  const csv = [cols.join(','),...rows.map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(','))].join('\n');
  const blob = new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${kind}-portfolio.csv`; a.click(); URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', init);
