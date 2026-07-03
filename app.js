// NCLH branded version - sponsor column removed - generated 2026-07-02
const COLORS = ['#1e5aa8','#6f42c1','#3588ff','#1db9b6','#099268','#94a3b8','#334155'];
const STATUS_ORDER = ['Backlog','Queued','In Progress','In UAT','Done','Cancelled','Canceled'];
const ACTIVE_STATUSES = ['Backlog','Queued','In Progress','In UAT'];
let rawData = Array.isArray(window.INITIAL_DATA) ? window.INITIAL_DATA : [];
let charts = {};
let sortState = { completed: ['savings','desc'], active: ['savings','desc'] };

const el = id => document.getElementById(id);
const money = n => Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const num = n => Number(n||0).toLocaleString('en-US');
const clean = v => String(v ?? '').trim();
const statusClean = s => clean(s).replace(/^\d+\.\s*/, '').replace('Canceled','Cancelled');
const lower = v => clean(v).toLowerCase();
const isParent = r => clean(r['Business Solution']) !== '' || Number(r.Level) === 0;
const savingsValue = r => Number(r['Total Savings/ Year'] || r['Extended Savings ($/Year)'] || 0) || 0;
const usersValue = r => Number(r['# of Users Impacted'] || 0) || 0;
const solutionName = r => clean(r.Summary) || clean(r.Description) || clean(r['Jira Issue Key']) || 'Untitled Solution';
const uniqueBy = (arr, fn) => [...new Map(arr.map(x => [fn(x), x])).values()];

function parentRows(data){ return uniqueBy(data.filter(isParent), r => `${solutionName(r)}|${clean(r.Department)}`); }
function ticketRows(data){ return data.filter(r => clean(r['Jira Issue Key']) || clean(r.Summary)); }
function currentFilters(){ return {
  category: el('categoryFilter').value, status: el('statusFilter').value, department: el('departmentFilter').value,
  priority: el('priorityFilter').value, year: el('yearFilter').value
};}
function applyFilters(data){
  const f = currentFilters();
  return data.filter(r =>
    (!f.category || clean(r['GTO Work Category']) === f.category) &&
    (!f.status || statusClean(r['Jira Status']) === f.status) &&
    (!f.department || clean(r.Department) === f.department) &&
    (!f.priority || clean(r.Priority) === f.priority) &&
    (!f.year || String(r.Year) === String(f.year))
  );
}
function optionsFor(field, transform=x=>clean(x), data=rawData){
  return [...new Set(data.map(r=>transform(r[field])).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
}
function fillSelect(id, values, all='All'){
  const s=el(id), old=s.value; s.innerHTML = `<option value="">${all}</option>` + values.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if(values.includes(old)) s.value=old;
}
function buildFilters(){
  fillSelect('categoryFilter', optionsFor('GTO Work Category'));
  fillSelect('statusFilter', [...new Set(rawData.map(r=>statusClean(r['Jira Status'])).filter(Boolean))].sort((a,b)=>(STATUS_ORDER.indexOf(a)<0?99:STATUS_ORDER.indexOf(a))-(STATUS_ORDER.indexOf(b)<0?99:STATUS_ORDER.indexOf(b))));
  fillSelect('departmentFilter', optionsFor('Department'));
  fillSelect('priorityFilter', optionsFor('Priority'));
  fillSelect('yearFilter', optionsFor('Year', v=>String(v||'')).reverse());
}
function update(){
  const filtered = applyFilters(rawData), parents = parentRows(filtered), tickets = ticketRows(filtered);
  const distinctDepartments = new Set(parents.map(r=>clean(r.Department)).filter(Boolean));
  el('kpiSolutions').textContent = num(parents.length);
  el('kpiTickets').textContent = num(tickets.length);
  el('kpiInitiatives').textContent = num(tickets.filter(r=>lower(r['GTO Work Category']).includes('initiative')).length);
  el('kpiEnhancements').textContent = num(tickets.filter(r=>lower(r['GTO Work Category']).includes('enhancement')).length);
  el('kpiKtlo').textContent = num(tickets.filter(r=>lower(r['GTO Work Category']).includes('ktlo') || lower(r['GTO Work Category']).includes('bau')).length);
  el('kpiSavings').textContent = money(parents.reduce((a,r)=>a+savingsValue(r),0));
  el('kpiDepartments').textContent = num(distinctDepartments.size);
  el('reportingYear').textContent = el('yearFilter').value || 'All';
  renderCharts(parents, tickets);
  renderTables(parents);
}
function grouped(arr, keyFn, valFn=()=>1){
  return arr.reduce((m,r)=>{const k=keyFn(r)||'Not Provided'; m[k]=(m[k]||0)+valFn(r); return m;},{});
}
function orderedEntries(obj, order=[]) {return Object.entries(obj).sort((a,b)=>{let ia=order.indexOf(a[0]), ib=order.indexOf(b[0]); ia=ia<0?99:ia; ib=ib<0?99:ib; return ia-ib || b[1]-a[1];});}
function chart(id, type, data, options){ if(charts[id]) charts[id].destroy(); charts[id] = new Chart(el(id), {type, data, options}); }
function renderCharts(parents){
  const status = orderedEntries(grouped(parents, r=>statusClean(r['Jira Status'])), STATUS_ORDER);
  chart('statusChart','bar',{labels:status.map(x=>x[0]),datasets:[{data:status.map(x=>x[1]),backgroundColor:status.map((_,i)=>COLORS[i%COLORS.length]),borderRadius:9}]},{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#e6edf7'}},x:{grid:{display:false}}}});
  const sav = orderedEntries(grouped(parents, r=>statusClean(r['Jira Status']), savingsValue), STATUS_ORDER);
  chart('savingsStatusChart','bar',{labels:sav.map(x=>x[0]),datasets:[{data:sav.map(x=>x[1]),backgroundColor:sav.map((_,i)=>COLORS[i%COLORS.length]),borderRadius:9}]},{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.raw)}}},scales:{x:{ticks:{callback:v=>money(v)},grid:{color:'#e6edf7'}},y:{grid:{display:false}}}});
  const type = Object.entries(grouped(parents, r=>clean(r['Financial Impact']) || clean(r['Efficiency Gains']) || clean(r['Type of Request']) || 'Not Provided')).sort((a,b)=>b[1]-a[1]).slice(0,7);
  chart('savingsTypeChart','doughnut',{labels:type.map(x=>x[0]),datasets:[{data:type.map(x=>x[1]),backgroundColor:COLORS,borderWidth:0}]},{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}});
}
function rowObj(r){return {name:solutionName(r), status:statusClean(r['Jira Status']), savings:savingsValue(r), dept:clean(r.Department)||'—', requestor:clean(r.Requestor)||'—', description:clean(r.Description)||clean(r['Primary Purpose'])||'—', type:clean(r['Financial Impact']) || clean(r['Efficiency Gains']) || clean(r['Type of Request']) || '—', users:usersValue(r), date:formatDate(r['Completed Date'])};}
function renderTables(parents){
  const completedSearch=lower(el('completedSearch').value), activeSearch=lower(el('activeSearch').value);
  let completed=parents.map(rowObj).filter(r=>r.status==='Done').filter(r=>JSON.stringify(r).toLowerCase().includes(completedSearch));
  let active=parents.map(rowObj).filter(r=>ACTIVE_STATUSES.includes(r.status)).filter(r=>JSON.stringify(r).toLowerCase().includes(activeSearch));
  completed = sortRows(completed, ...sortState.completed).slice(0,50);
  active = sortRows(active, ...sortState.active).slice(0,100);
  makeTable('completedTable', completed, [ ['name','Business Solution'],['savings','Annual Savings'],['dept','Department'],['requestor','Requestor'],['type','Type of Savings'],['users','Users Impacted'],['date','Completion Date'] ], 'completed');
  makeTable('activeTable', active, [ ['name','Business Solution'],['status','Status'],['savings','Annual Savings'],['dept','Department'],['requestor','Requestor'],['description','Description'],['type','Type of Savings'],['users','Users Impacted'] ], 'active');
  el('completedCount').textContent=`Showing ${completed.length} completed solutions`;
  el('activeCount').textContent=`Showing ${active.length} active solutions`;
}
function sortRows(rows,key,dir){return rows.sort((a,b)=>{let x=a[key],y=b[key]; if(typeof x==='number'||typeof y==='number'){x=Number(x)||0;y=Number(y)||0;} else {x=String(x);y=String(y);} return (x>y?1:x<y?-1:0)*(dir==='asc'?1:-1);});}
function makeTable(id, rows, cols, tableKey){
  const thead = `<thead><tr>${cols.map(([k,l])=>`<th data-table="${tableKey}" data-key="${k}">${l} ↕</th>`).join('')}</tr></thead>`;
  const body = rows.map(r=>`<tr>${cols.map(([k])=>`<td>${cell(k,r[k])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">No records match the selected filters.</td></tr>`;
  el(id).innerHTML = thead + `<tbody>${body}</tbody>`;
  el(id).querySelectorAll('th').forEach(th=>th.onclick=()=>{const t=th.dataset.table,k=th.dataset.key; const cur=sortState[t]; sortState[t]=[k, cur[0]===k && cur[1]==='desc'?'asc':'desc']; update();});
}
function cell(k,v){
  if(k==='name') return `<span class="solution-name">${escapeHtml(v)}</span>`;
  if(k==='status') return `<span class="status-pill ${statusClass(v)}">${escapeHtml(v)}</span>`;
  if(k==='savings') return `<span class="saving">${money(v)}</span>`;
  if(k==='users') return num(v);
  return escapeHtml(v);
}
function statusClass(s){s=lower(s); if(s==='done') return 'status-done'; if(s.includes('uat')) return 'status-uat'; if(s.includes('progress')) return 'status-progress'; if(s.includes('cancel')) return 'status-cancelled'; return '';}
function formatDate(v){ if(!v) return '—'; const d = new Date(v); return isNaN(d) ? clean(v) : d.toLocaleDateString('en-US'); }
function escapeHtml(v){return String(v ?? '').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function exportCsv(which){
  const table=el(which==='completed'?'completedTable':'activeTable'); let csv=[...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>'"'+td.textContent.replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`${which}-portfolio.csv`; a.click();
}
async function handleFile(file){
  const buf = await file.arrayBuffer(); const wb = XLSX.read(buf); const ws = wb.Sheets[wb.SheetNames[0]]; rawData = XLSX.utils.sheet_to_json(ws,{defval:''});
  localStorage.setItem('dashboardData', JSON.stringify(rawData)); localStorage.setItem('dashboardUpdated', new Date().toLocaleString());
  el('lastUpdated').textContent = localStorage.getItem('dashboardUpdated'); buildFilters(); update();
}
function init(){
  const stored=localStorage.getItem('dashboardData'); if(stored){try{rawData=JSON.parse(stored)}catch(e){}}
  el('lastUpdated').textContent = localStorage.getItem('dashboardUpdated') || new Date().toLocaleDateString('en-US');
  buildFilters(); ['categoryFilter','statusFilter','departmentFilter','priorityFilter','yearFilter'].forEach(id=>el(id).onchange=update);
  el('resetFilters').onclick=()=>{['categoryFilter','statusFilter','departmentFilter','priorityFilter','yearFilter'].forEach(id=>el(id).value=''); update();};
  el('completedSearch').oninput=update; el('activeSearch').oninput=update;
  el('fileInput').onchange=e=>e.target.files[0]&&handleFile(e.target.files[0]);
  document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportCsv(b.dataset.export));
  const upload=document.querySelector('.upload-card'); upload.ondragover=e=>{e.preventDefault(); upload.classList.add('drag')}; upload.ondragleave=()=>upload.classList.remove('drag'); upload.ondrop=e=>{e.preventDefault(); upload.classList.remove('drag'); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);};
  update();
}
document.addEventListener('DOMContentLoaded', init);
