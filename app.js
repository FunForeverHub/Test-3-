let raw = loadInitialData();
const charts = {};
const money = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0);
const num = v => new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(v||0);
const doneStatuses = new Set(['Done','Complete','Completed','Closed']);
const canceledStatuses = new Set(['Canceled','Cancelled','Cancel','Cancelled / Rejected','Rejected']);
const activeStatuses = new Set(['Backlog','Queued','In Progress','In UAT']);
const statusOrder = ['Backlog','Queued','In Progress','In UAT','Done','Cancelled','Canceled'];
const categoryMap = {
  initiatives: ['Initiative', 'Initiatives'],
  ktlo: ['BAU/KTLO', 'KTLO', 'BAU-KTLO', 'BAU / KTLO'],
  enhancements: ['Enhancement', 'Enhancements']
};

function loadInitialData(){
  try {
    const saved = localStorage.getItem('smartsheetDashboardData');
    if(saved) return JSON.parse(saved);
  } catch(e) { console.warn('Stored data could not be loaded.', e); }
  return window.DASHBOARD_DATA;
}
function clean(v){ return (v === undefined || v === null || v === '') ? 'Blank' : String(v).trim(); }
function cleanDisplay(v){ const x = clean(v); return x === 'Blank' ? '' : x; }
function unique(arr){ return [...new Set(arr.map(clean).filter(x => x && x !== 'Blank'))].sort((a,b)=>a.localeCompare(b)); }
function val(id){ return document.getElementById(id).value; }
function ticketKey(d){ return clean(d.jiraIssueKey) !== 'Blank' ? clean(d.jiraIssueKey) : `row-${d.row}`; }
function distinctTickets(arr){ return new Set(arr.map(ticketKey)).size; }
function solutionKey(d){ return clean(d.solutionId) !== 'Blank' ? clean(d.solutionId) : clean(d.businessSolution); }
function distinctSolutions(arr){ const m = new Map(); arr.forEach(d => { const k = solutionKey(d); if(k !== 'Blank' && !m.has(k)) m.set(k, d); }); return [...m.values()]; }
function byStatusSort(a,b){ return (statusOrder.indexOf(a) === -1 ? 99 : statusOrder.indexOf(a)) - (statusOrder.indexOf(b) === -1 ? 99 : statusOrder.indexOf(b)); }

function refreshSourceInfo(){
  const el = document.getElementById('sourceInfo');
  const source = raw?.metadata?.sourceFile || 'packaged data';
  const stamp = raw?.metadata?.uploadedAt ? ` Uploaded ${raw.metadata.uploadedAt}.` : '';
  el.textContent = `Data source: ${source}.${stamp}`;
}
function fillSelect(id, values){
  const el=document.getElementById(id);
  const current = el.value || 'All';
  el.innerHTML = '<option value="All">All</option>';
  values.forEach(v=>{const o=document.createElement('option'); o.value=v; o.textContent=v; el.appendChild(o);});
  el.value = values.includes(current) ? current : 'All';
}
function populateFilters(){
  fillSelect('categoryFilter', unique(raw.tickets.map(d=>d.gtoCategory)));
  fillSelect('statusFilter', unique(raw.tickets.map(d=>d.jiraStatus)));
  fillSelect('departmentFilter', unique(raw.tickets.map(d=>d.department)));
  fillSelect('priorityFilter', unique(raw.tickets.map(d=>d.priority)));
  fillSelect('yearFilter', unique(raw.tickets.map(d=>d.year)));
}

['categoryFilter','statusFilter','departmentFilter','priorityFilter','yearFilter'].forEach(id => document.getElementById(id).addEventListener('change', render));
document.getElementById('resetBtn').addEventListener('click', () => { ['categoryFilter','statusFilter','departmentFilter','priorityFilter','yearFilter'].forEach(id => document.getElementById(id).value='All'); render(); });
document.getElementById('completedSearch').addEventListener('input', renderTables);
document.getElementById('activeSearch').addEventListener('input', renderTables);
document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
document.getElementById('restoreDataBtn').addEventListener('click', () => {
  localStorage.removeItem('smartsheetDashboardData');
  raw = window.DASHBOARD_DATA;
  populateFilters();
  refreshSourceInfo();
  render();
});

function filters(){ return { category:val('categoryFilter'), status:val('statusFilter'), department:val('departmentFilter'), priority:val('priorityFilter'), year:val('yearFilter') }; }
function passCommon(d,f){
  return (f.category==='All'||clean(d.gtoCategory)===f.category) &&
         (f.status==='All'||clean(d.jiraStatus)===f.status) &&
         (f.department==='All'||clean(d.department)===f.department) &&
         (f.priority==='All'||clean(d.priority)===f.priority) &&
         (f.year==='All'||String(clean(d.year))===String(f.year));
}
function filteredData(){
  const f = filters();
  return {
    tickets: raw.tickets.filter(d => passCommon(d,f)),
    solutions: distinctSolutions(raw.initiatives.filter(d => passCommon(d,f)))
  };
}
function countCategory(tickets, names){ return distinctTickets(tickets.filter(d => names.includes(clean(d.gtoCategory)))); }
function groupCountUnique(arr, key, idFn){ const seen={}; arr.forEach(d=>{const k=clean(d[key]); if(k==='Blank') return; const id=idFn(d); seen[k] ||= new Set(); seen[k].add(id);}); return Object.fromEntries(Object.keys(seen).map(k => [k, seen[k].size])); }
function groupSum(arr, key, valueKey){ const m={}; arr.forEach(d=>{const k=clean(d[key]); if(k==='Blank') return; m[k]=(m[k]||0)+(+d[valueKey]||0);}); return m; }
function chart(id,type,labels,data,opts={}){
  if(charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type,
    data:{ labels, datasets:[{ label:opts.label||'', data, borderWidth:1, borderRadius:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:!!opts.legend} }, scales: opts.noScales ? {} : { y:{beginAtZero:true,ticks:{precision:0, callback: opts.moneyAxis ? value => money(value) : undefined}}, x:{ticks:{autoSkip:false,maxRotation:45,minRotation:0}} } }
  });
}

function render(){
  const {tickets, solutions} = filteredData();
  const uniqueSolutions = distinctSolutions(solutions);
  document.getElementById('kpiParentSolutions').textContent = num(uniqueSolutions.length);
  document.getElementById('kpiTickets').textContent = num(distinctTickets(tickets));
  document.getElementById('kpiInitiatives').textContent = num(countCategory(tickets, categoryMap.initiatives));
  document.getElementById('kpiEnhancements').textContent = num(countCategory(tickets, categoryMap.enhancements));
  document.getElementById('kpiKTLO').textContent = num(countCategory(tickets, categoryMap.ktlo));
  document.getElementById('kpiSavings').textContent = money(uniqueSolutions.reduce((s,d)=>s+(+d.savings||0),0));
  document.getElementById('kpiDepartments').textContent = num(unique(uniqueSolutions.map(d=>d.department)).length);

  const byStatus = groupCountUnique(uniqueSolutions, 'jiraStatus', solutionKey);
  const statusLabels = Object.keys(byStatus).sort(byStatusSort);
  chart('solutionsByStatus','bar',statusLabels,statusLabels.map(k=>byStatus[k]),{label:'Business Solutions'});

  const savingsStatus = groupSum(uniqueSolutions, 'jiraStatus', 'savings');
  const savingsLabels = Object.keys(savingsStatus).sort(byStatusSort);
  chart('savingsByStatus','bar',savingsLabels,savingsLabels.map(k=>savingsStatus[k]),{label:'Annual Savings', moneyAxis:true});

  const savingsType = groupCountUnique(uniqueSolutions, 'financialImpact', solutionKey);
  const typeEntries = Object.entries(savingsType).sort((a,b)=>b[1]-a[1]);
  chart('typeOfSavings','doughnut',typeEntries.map(x=>x[0]),typeEntries.map(x=>x[1]),{legend:true,noScales:true});

  const byCategory = groupCountUnique(tickets, 'gtoCategory', ticketKey);
  const catEntries = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  chart('ticketsByCategory','doughnut',catEntries.map(x=>x[0]),catEntries.map(x=>x[1]),{legend:true,noScales:true});
  renderTables();
}
function renderTables(){
  const {solutions} = filteredData();
  const uniqueSolutions = distinctSolutions(solutions);
  const completedQ = document.getElementById('completedSearch').value.toLowerCase();
  const activeQ = document.getElementById('activeSearch').value.toLowerCase();
  const completed = uniqueSolutions.filter(d=>doneStatuses.has(clean(d.jiraStatus)) && JSON.stringify(d).toLowerCase().includes(completedQ)).sort((a,b)=>(+b.savings||0)-(+a.savings||0)).slice(0,10);
  const active = uniqueSolutions.filter(d=>activeStatuses.has(clean(d.jiraStatus)) && JSON.stringify(d).toLowerCase().includes(activeQ)).sort((a,b)=>(+b.savings||0)-(+a.savings||0));
  rowFill('completedTable', completed, d=>`<tr><td><strong>${esc(d.businessSolution)}</strong><br>${badge(d.jiraStatus)}</td><td>${esc(d.department)}</td><td>${esc(d.requestor)}</td><td>${esc(d.executiveSponsor)}</td><td class="num savings">${money(d.savings)}</td><td>${esc(d.financialImpact)}</td><td class="num">${num(d.usersImpacted)}</td><td>${esc(formatDate(d.completedDate))}</td></tr>`, 8);
  rowFill('activeTable', active, d=>`<tr><td><strong>${esc(d.businessSolution)}</strong></td><td>${esc(d.description)}</td><td>${esc(d.department)}</td><td>${esc(d.requestor)}</td><td>${esc(d.executiveSponsor)}</td><td>${badge(d.jiraStatus)}</td><td class="num savings">${money(d.savings)}</td><td class="num">${num(d.usersImpacted)}</td><td>${esc(d.financialImpact)}</td></tr>`, 9);
}
function rowFill(tableId, arr, fn, cols){ document.querySelector(`#${tableId} tbody`).innerHTML = arr.length ? arr.map(fn).join('') : `<tr><td colspan="${cols}">No matching records.</td></tr>`; }
function esc(v){ return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function badge(s){ let cls='status '; const st=clean(s); if(doneStatuses.has(st)) cls+='done'; else if(canceledStatuses.has(st)) cls+='cancel'; else if(st.includes('Backlog')) cls+='backlog'; else if(st.includes('Progress')||st.includes('UAT')||st.includes('Queued')) cls+='progress'; return `<span class="${cls}">${esc(st)}</span>`; }
function formatDate(v){ if(!v || clean(v)==='Blank') return ''; const d = new Date(v); return isNaN(d) ? String(v).split(' ')[0] : d.toLocaleDateString('en-US'); }

function handleFileUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const workbook = XLSX.read(new Uint8Array(e.target.result), {type:'array', cellDates:true});
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:'', raw:false});
      const parsed = normalizeRows(rows, file.name);
      raw = parsed;
      try { localStorage.setItem('smartsheetDashboardData', JSON.stringify(parsed)); } catch(err) { console.warn('Data was loaded, but could not be saved in browser storage.', err); }
      populateFilters();
      refreshSourceInfo();
      render();
      alert(`Dashboard refreshed with ${num(parsed.metadata.totalRows)} rows and ${num(parsed.metadata.totalBusinessSolutions)} business solutions.`);
    } catch(err) {
      console.error(err);
      alert('I could not read this file. Please upload the Smartsheet Excel export with the same column structure.');
    }
  };
  reader.readAsArrayBuffer(file);
}
function pick(row, names){
  for(const n of names){ if(Object.prototype.hasOwnProperty.call(row,n)) return row[n]; }
  const keys = Object.keys(row);
  for(const n of names){ const found = keys.find(k => k.toLowerCase().trim() === n.toLowerCase().trim()); if(found) return row[found]; }
  return '';
}
function parseMoney(v){ if(typeof v === 'number') return v; const s = String(v||'').replace(/[$,]/g,'').trim(); const n = parseFloat(s); return isNaN(n) ? 0 : n; }
function parseNum(v){ if(typeof v === 'number') return v; const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; }
function isParentRow(row){
  const level = parseNum(pick(row,['Level']));
  const businessFlag = String(pick(row,['Business Solution'])).trim();
  return level === 0 || /(^|\s)1$/.test(businessFlag) || businessFlag === '1';
}
function normalizeRows(rows, sourceFile){
  const tickets = [];
  const parents = [];
  let currentParent = null;
  let currentId = null;
  rows.forEach((row, idx) => {
    const parent = isParentRow(row);
    const displayName = cleanDisplay(pick(row,['Workspace Name','Summary','Business Solution'])) || `Business Solution ${parents.length+1}`;
    if(parent || !currentParent){
      currentId = `BS-${idx+2}`;
      currentParent = displayName;
    }
    const d = {
      row: idx + 2,
      solutionId: currentId,
      businessSolution: currentParent,
      isParent: !!parent,
      jiraIssueKey: cleanDisplay(pick(row,['Jira Issue Key','Issue Key','Key'])),
      jiraStatus: clean(pick(row,['Jira Status','Status'])),
      workspaceStatus: cleanDisplay(pick(row,['Workspace Status'])),
      summary: cleanDisplay(pick(row,['Summary'])),
      gtoCategory: clean(pick(row,['GTO Work Category','GTO Category','Category'])),
      issueType: cleanDisplay(pick(row,['Issue Type'])),
      typeOfRequest: cleanDisplay(pick(row,['Type of Request'])),
      department: clean(pick(row,['Department'])),
      priority: clean(pick(row,['Priority'])),
      assignee: cleanDisplay(pick(row,['Assignee','Task Assigned To'])),
      sprint: cleanDisplay(pick(row,['Sprint'])),
      financialImpact: clean(pick(row,['Financial Impact','Type of Savings'])),
      savings: parseMoney(pick(row,['Total Savings/ Year','Total Savings/Year','Annual Savings','Savings'])),
      efficiencyGains: parseNum(pick(row,['Efficiency Gains'])),
      usersImpacted: parseNum(pick(row,['# of Users Impacted','Users Impacted'])),
      hoursSavedPerWeekUser: parseNum(pick(row,['Hours saved per week and user (approximate)'])),
      extendedSavings: parseMoney(pick(row,['Extended Savings ($/Year)','Extended Savings'])),
      previousSystem: cleanDisplay(pick(row,['Previous System'])),
      executiveSponsor: clean(pick(row,['Executive Sponsor','Business Sponsor','Sponsor'])),
      completedDate: cleanDisplay(pick(row,['Completed Date'])),
      month: cleanDisplay(pick(row,['Month'])),
      year: clean(pick(row,['Year'])),
      level: parseNum(pick(row,['Level'])),
      description: cleanDisplay(pick(row,['Description'])),
      requestor: cleanDisplay(pick(row,['Requestor']))
    };
    tickets.push(d);
    if(d.isParent) parents.push(d);
  });
  const ticketCounts = {};
  tickets.forEach(t => ticketCounts[t.solutionId] = (ticketCounts[t.solutionId] || 0) + 1);
  const initiatives = parents.map(p => ({...p, ticketCount: ticketCounts[p.solutionId] || 1}));
  return {
    metadata: {
      sourceFile,
      uploadedAt: new Date().toLocaleString('en-US'),
      totalRows: tickets.length,
      totalBusinessSolutions: initiatives.length,
      years: unique(tickets.map(d=>d.year)),
      departments: unique(tickets.map(d=>d.department)),
      statuses: unique(tickets.map(d=>d.jiraStatus)),
      categories: unique(tickets.map(d=>d.gtoCategory))
    },
    tickets,
    initiatives
  };
}

populateFilters();
refreshSourceInfo();
render();
