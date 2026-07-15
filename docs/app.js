
const D=window.MBF_DATA;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const badge=(t,c='')=>`<span class="badge ${c}">${esc(t)}</span>`;
const statusClass=v=>v==='verified'?'verified':'pending';

const mediaType=(url='',declared='')=>{
  const u=String(url).toLowerCase().split('?')[0].split('#')[0];
  const d=String(declared).toLowerCase();
  if(/youtube\.com|youtu\.be/.test(u))return 'youtube';
  if(/vimeo\.com/.test(u))return 'vimeo';
  if(/\.(mp4|webm|ogg|mov|m4v)$/.test(u)||/video/.test(d))return 'video';
  if(/\.(png|jpe?g|gif|webp|svg|avif)$/.test(u)||/(image|photo|rendering|site plan|map)/.test(d))return 'image';
  if(/\.pdf$/.test(u)||/pdf/.test(d))return 'pdf';
  return '';
};
const viewerAttrs=(url,type='',title='')=>{
  const kind=mediaType(url,type);
  return kind?`href="${esc(url)}" data-viewer-url="${esc(url)}" data-viewer-type="${kind}" data-viewer-title="${esc(title)}"`:`href="${esc(url)}" target="_blank" rel="noopener"`;
};

function youtubeEmbed(url){
  try{
    const u=new URL(url);
    let id=u.hostname.includes('youtu.be')?u.pathname.slice(1):u.searchParams.get('v');
    if(!id&&u.pathname.includes('/embed/'))id=u.pathname.split('/embed/')[1].split('/')[0];
    return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`:url;
  }catch{return url;}
}
function vimeoEmbed(url){
  const m=String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m?`https://player.vimeo.com/video/${m[1]}?autoplay=1`:url;
}
function openMediaViewer(url,kind,title='Media'){
  const modal=$('#media-viewer');
  const body=$('#media-viewer-body');
  $('#media-viewer-title').textContent=title||'Media';
  body.innerHTML='';
  if(kind==='image') body.innerHTML=`<img class="viewer-image" src="${esc(url)}" alt="${esc(title)}">`;
  else if(kind==='video') body.innerHTML=`<video class="viewer-video" controls autoplay playsinline preload="metadata"><source src="${esc(url)}">Your browser cannot play this video. <a href="${esc(url)}" target="_blank" rel="noopener">Open the source</a>.</video>`;
  else if(kind==='youtube') body.innerHTML=`<iframe class="viewer-frame" src="${esc(youtubeEmbed(url))}" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  else if(kind==='vimeo') body.innerHTML=`<iframe class="viewer-frame" src="${esc(vimeoEmbed(url))}" title="${esc(title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  else if(kind==='pdf') body.innerHTML=`<iframe class="viewer-frame" src="${esc(url)}#view=FitH" title="${esc(title)}"></iframe>`;
  else body.innerHTML=`<iframe class="viewer-frame" src="${esc(url)}" title="${esc(title)}"></iframe>`;
  $('#media-viewer-source').href=url;
  modal.hidden=false;
  document.body.classList.add('modal-open');
  $('#media-viewer-close').focus();
}
function closeMediaViewer(){
  const modal=$('#media-viewer');
  modal.hidden=true;
  $('#media-viewer-body').innerHTML='';
  document.body.classList.remove('modal-open');
}

function evidenceBlock(q){
  const titles=(q.evidence_titles||'').split('||').filter(Boolean);
  const urls=(q.evidence_urls||'').split('||').filter(Boolean);
  const codes=(q.evidence_codes||'').split('||').filter(Boolean);
  if(!titles.length)return '';
  return `<details class="evidence"><summary>View evidence</summary><ul class="evidence-list">${
    titles.map((t,i)=>`<li><a ${viewerAttrs(urls[i]||'#','',t)}>${esc(t)}</a> <span class="meta">${esc(codes[i]||'')}</span></li>`).join('')
  }</ul></details>`;
}

function renderMetrics(){
  const p=D.project;
  const vals={
    meetings:p.meeting_count, agenda:p.agenda_item_count, documents:p.document_count,
    features:p.feature_count, funding:p.funding_event_count, media:p.media_count,
    questions:p.verified_question_count, timestamps:D.meta.verified_timestamps, timeline:D.timeline.length
  };
  Object.entries(vals).forEach(([k,v])=>document.querySelectorAll(`[data-metric="${k}"]`).forEach(el=>el.textContent=v));
}

function renderTimeline(){
  $('#timeline-grid').innerHTML=D.timeline.map(t=>`
    <article class="milestone">
      <div class="meta">${esc(t.year)}</div>
      <h3>${esc(t.label)}</h3>
      <p>${esc(t.summary)}</p>
      <details><summary>${t.records.length} record${t.records.length===1?'':'s'}</summary>
        <ul class="evidence-list">
          ${t.records.map(r=>`<li><a ${viewerAttrs(r.official_url,'',r.title)}>${esc(r.meeting_date)} — ${esc(r.title)}</a></li>`).join('')}
        </ul>
      </details>
    </article>`).join('');
}

function renderFeatures(){
  const groups={};
  D.features.forEach(f=>(groups[f.phase_name]??=[]).push(f));
  $('#features-wrap').innerHTML=Object.entries(groups).map(([phase,rows])=>`
    <div class="feature-group"><h3>${esc(phase)}</h3><div class="feature-grid">${
      rows.map(f=>`<div class="feature"><strong>${esc(f.name)}</strong><p>${esc(f.description||'')}</p>${badge(f.verification_status,statusClass(f.verification_status))}</div>`).join('')
    }</div></div>`).join('');
}

function renderMeetings(){
  const q=($('#meeting-search').value||'').toLowerCase();
  const filter=$('#meeting-filter').value;
  const rows=D.meetings.filter(r=>{
    const hay=[r.meeting_date,r.item_number,r.title,r.category,r.recommendation,r.notes].join(' ').toLowerCase();
    return hay.includes(q) && (!filter || r.category===filter);
  });
  $('#meeting-list').innerHTML=rows.length?rows.map(r=>`
    <article class="card">
      <div class="meta">${esc(r.meeting_date)} · Item ${esc(r.item_number)}</div>
      <h3>${esc(r.title)}</h3>
      ${badge(r.category||'Agenda item')}${badge(r.verification_status,statusClass(r.verification_status))}
      <p>${esc(r.recommendation||r.notes||'')}</p>
      <a ${viewerAttrs(r.official_url,'',r.title)}><strong>Open official record →</strong></a>
    </article>`).join(''):'<div class="empty">No matching records.</div>';
}

function renderQuestions(){
  const q=($('#question-search').value||'').toLowerCase();
  const rows=D.questions.filter(r=>[r.question,r.short_answer,r.detailed_answer,r.category].join(' ').toLowerCase().includes(q));
  $('#question-list').innerHTML=rows.length?rows.map(r=>`
    <article class="card">
      <div class="meta">${esc(r.category)} · ${esc(r.archive_code)}</div>
      <h3>${esc(r.question)}</h3>
      ${badge(r.verification_status,statusClass(r.verification_status))}
      <p><strong>${esc(r.short_answer||'')}</strong></p>
      <p>${esc(r.detailed_answer||'')}</p>
      ${evidenceBlock(r)}
    </article>`).join(''):'<div class="empty">No matching questions.</div>';
}

function renderFunding(){
  $('#funding-list').innerHTML=D.funding.map(r=>`
    <article class="card">
      <div class="meta">${esc(r.event_date||'')} · ${esc(r.phase_name||'')}</div>
      <h3>${esc(r.event_type)}</h3>
      ${r.amount!=null?`<p><strong>${money(r.amount)}</strong></p>`:''}
      <p>${esc(r.amount_status||'')}</p>
      <p>${esc(r.purpose||'')}</p>
      ${badge(r.verification_status,statusClass(r.verification_status))}
    </article>`).join('');
}

function renderMedia(){
  const target=$('#media-list');
  if(!target)return;
  const rows=D.media||[];
  target.innerHTML=rows.length?rows.map(r=>{
    const kind=mediaType(r.official_url,r.media_type);
    const action=kind==='video'||kind==='youtube'||kind==='vimeo'?'Play video in browser':kind==='image'?'View image in browser':'Open official media page';
    return `<article class="card media-card">
      <div class="meta">${esc(r.media_date||'Undated')} · ${esc(r.archive_code)}</div>
      <h3>${esc(r.title)}</h3>
      ${badge(r.media_type||'Media')}${badge(r.verification_status,statusClass(r.verification_status))}
      <p>${esc(r.description||'')}</p>
      <a ${viewerAttrs(r.official_url,r.media_type,r.title)}><strong>${esc(action)} →</strong></a>
    </article>`;
  }).join(''):'<div class="empty">No media records are currently indexed.</div>';
}

function renderSources(){
  const q=($('#source-search').value||'').toLowerCase();
  const rows=D.documents.filter(r=>[r.title,r.document_type,r.summary,r.publisher,r.archive_code].join(' ').toLowerCase().includes(q));
  $('#source-list').innerHTML=rows.length?rows.map(r=>`
    <article class="card">
      <div class="meta">${esc(r.document_date||'Undated')} · ${esc(r.archive_code)}</div>
      <h3>${esc(r.title)}</h3>
      ${badge(r.document_type||'Source')}${badge('Evidence '+r.evidence_level)}${badge(r.verification_status,statusClass(r.verification_status))}
      <p>${esc(r.summary||'')}</p>
      <a ${viewerAttrs(r.official_url,r.document_type,r.title)}><strong>Open source →</strong></a>
    </article>`).join(''):'<div class="empty">No matching sources.</div>';
}

renderMetrics();renderTimeline();renderFeatures();renderMeetings();renderQuestions();renderFunding();renderMedia();renderSources();
$('#meeting-search').addEventListener('input',renderMeetings);$('#meeting-filter').addEventListener('change',renderMeetings);
$('#question-search').addEventListener('input',renderQuestions);$('#source-search').addEventListener('input',renderSources);

function combinedSearch(query){
  const q=(query||'').trim().toLowerCase();
  const out=[];
  if(!q){$('#combined-results').innerHTML='<div class="empty">Enter a search term to explore the current evidence.</div>';return;}
  D.questions.filter(r=>[r.question,r.short_answer,r.detailed_answer,r.category].join(' ').toLowerCase().includes(q)).slice(0,6).forEach(r=>out.push({type:'Verified question',title:r.question,body:r.short_answer||r.detailed_answer,href:'#questions',status:r.verification_status}));
  D.meetings.filter(r=>[r.meeting_date,r.item_number,r.title,r.category,r.recommendation,r.notes].join(' ').toLowerCase().includes(q)).slice(0,6).forEach(r=>out.push({type:'Council record',title:r.title,body:`${r.meeting_date} · Item ${r.item_number} · ${r.recommendation||r.notes||''}`,href:r.official_url,status:r.verification_status,external:true}));
  D.documents.filter(r=>[r.title,r.document_type,r.summary,r.publisher,r.archive_code].join(' ').toLowerCase().includes(q)).slice(0,6).forEach(r=>out.push({type:'Evidence source',title:r.title,body:r.summary||`${r.document_type||'Source'} · ${r.document_date||'Undated'}`,href:r.official_url,status:r.verification_status,external:true}));
  D.features.filter(r=>[r.name,r.description,r.phase_name].join(' ').toLowerCase().includes(q)).slice(0,4).forEach(r=>out.push({type:'Project feature',title:r.name,body:`${r.phase_name}: ${r.description||''}`,href:'#features',status:r.verification_status}));
  D.funding.filter(r=>[r.event_type,r.event_date,r.phase_name,r.purpose,r.amount_status].join(' ').toLowerCase().includes(q)).slice(0,4).forEach(r=>out.push({type:'Funding event',title:r.event_type,body:`${r.event_date||''} · ${r.purpose||r.amount_status||''}`,href:'#funding',status:r.verification_status}));
  $('#combined-results').innerHTML=out.length?out.slice(0,18).map(r=>`<article class="result-card"><div class="result-type">${esc(r.type)}</div><h3>${esc(r.title)}</h3>${badge(r.status||'research',statusClass(r.status))}<p>${esc(r.body||'')}</p><a href="${esc(r.href||'#')}" ${r.external?'target="_blank" rel="noopener"':''}><strong>${r.external?'Open source':'View section'} →</strong></a></article>`).join(''):'<div class="empty">No current Stewart Park records matched that search. This may identify a future evidence gap.</div>';
}

const menuButton=$('#menu-button');
menuButton.addEventListener('click',()=>{const nav=$('#primary-nav');const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});
$$('#primary-nav a').forEach(a=>a.addEventListener('click',()=>{$('#primary-nav').classList.remove('open');menuButton.setAttribute('aria-expanded','false')}));
$('#combined-search').addEventListener('input',e=>combinedSearch(e.target.value));
$('#clear-search').addEventListener('click',()=>{$('#combined-search').value='';combinedSearch('');$('#combined-search').focus()});
$('#global-search-form').addEventListener('submit',e=>{e.preventDefault();const q=$('#global-search').value;$('#combined-search').value=q;combinedSearch(q);location.hash='search';});
$$('[data-query]').forEach(b=>b.addEventListener('click',()=>{const q=b.dataset.query;$('#global-search').value=q;$('#combined-search').value=q;combinedSearch(q);location.hash='search'}));


document.addEventListener('click',e=>{
  const link=e.target.closest('[data-viewer-url]');
  if(link){
    e.preventDefault();
    openMediaViewer(link.dataset.viewerUrl,link.dataset.viewerType,link.dataset.viewerTitle||link.textContent.trim());
    return;
  }
  if(e.target.closest('[data-close-viewer]'))closeMediaViewer();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#media-viewer').hidden)closeMediaViewer();});
