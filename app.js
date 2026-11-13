(function(){
"use strict";
/* ---------- config ---------- */
const SUPABASE_URL="https://vybbibodpfhwngmayhjc.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5YmJpYm9kcGZod25nbWF5aGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1ODUxMTIsImV4cCI6MjExMDE2MTExMn0.YkKdsa99U0aeBNanITbXGPJFIZ54HRhmkJwjSjggCf4";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

/* ---------- constants ---------- */
const PHASES=["EYFS","Primary","Secondary","Sixth form","SEN"];
const WD=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const YEARS=["Nursery","Reception",...Array.from({length:13},(_,i)=>"Year "+(i+1))];
const PLAN={monthly:{label:"Monthly",price:"£20 / month"},yearly:{label:"Yearly",price:"£199 / year"}};
const CHECKS=[["id","ID and right to work"],["qts","Teacher registration"],["dbs","Criminal record check"],["refs","Two references"]];
const ROLES=["Headteacher","Deputy or assistant head","School business manager","Office manager","Cover or cover supervisor manager","Other"];
const REGIONS=["London","South East","South West","East of England","East Midlands","West Midlands","Yorkshire and the Humber","North West","North East","Wales","Scotland","Northern Ireland"];
const VTYPES=["Day-to-day","Short-term (up to 4 weeks)","Long-term (4 weeks or more)"];
const PAYS=["School payroll (PAYE)","Umbrella company","To agree with the teacher"];
const nationOf=r=>["Wales","Scotland","Northern Ireland"].includes(r)?r:"England";
const NATION={England:{reg:"Teacher reference number (TRN)",crim:"DBS certificate number",school:"URN"},Wales:{reg:"EWC registration number",crim:"DBS certificate number",school:"School reference number"},Scotland:{reg:"GTCS registration number",crim:"PVG scheme membership number",school:"SEED code"},"Northern Ireland":{reg:"GTCNI registration number",crim:"AccessNI certificate number",school:"DE reference number"}};
const LINKS={gias:u=>"https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/"+encodeURIComponent(u),trn:"https://check-a-teachers-record.education.gov.uk/check-records/sign-in",dbs:"https://secure.crbonline.gov.uk/crsc/check"};
const ICON={school:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10l9-6 9 6M5 10v10h14V10M10 20v-5h4v5"/></svg>',teacher:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'};
function urnHint(n){return n==="England"?`Your school's unique reference number, shown on <a href="https://get-information-schools.service.gov.uk/Search" target="_blank" rel="noopener">Get Information about Schools</a>.`:n==="Wales"?"Your school's URN or Welsh Government school number.":n==="Scotland"?"Your school's SEED code from the Scottish Government school list.":"Your school's Department of Education (NI) reference number."}

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const[y,m,d]=String(s).slice(0,10).split("-").map(Number);return new Date(y,m-1,d)};
const todayIso=iso(new Date());
const fmt=s=>s?parse(s).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}):"";
const fmtLong=s=>parse(s).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const fmtFull=s=>s?parse(s).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"—";
function mondayOf(s){const d=parse(s);const dow=d.getDay();d.setDate(d.getDate()+(dow===0?1:dow===6?2:1-dow));return d}
function weekDays(mon){return[0,1,2,3,4].map(i=>{const d=new Date(mon);d.setDate(d.getDate()+i);return iso(d)})}
function yearRange(arr){const a=[...new Set(arr||[])].sort((x,y)=>x-y);const out=[];let s=null,p=null;
  for(const n of a){if(s===null){s=p=n}else if(n===p+1){p=n}else{out.push([s,p]);s=p=n}}if(s!==null)out.push([s,p]);
  return out.map(([x,y])=>x===y?YEARS[x]:YEARS[x]+"–"+YEARS[y].replace("Year ","")).join(", ")}
const initials=n=>(n||"?").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
const hue=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h};
const avatar=(id,name,cls="")=>`<div class="avatar ${cls}" style="--h:${hue(id+name)}">${esc(initials(name))}</div>`;
const place=t=>{const a=[t.area,t.postcode].filter(Boolean).join(" ");return[a,t.region].filter(Boolean).join(", ")||"—"};
const timeAgo=at=>{const d=new Date(at);return iso(d)===todayIso?d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})};

/* ---------- geography ---------- */
const normT=x=>String(x||"").toLowerCase().replace(/[^a-z]/g,"");
const TOWNIDX={};for(const[k,v]of Object.entries(TOWNS))TOWNIDX[normT(k)]=[v,k];
function locate(q){q=String(q||"").trim();if(!q)return null;const u=q.toUpperCase().replace(/\s+/g," ");
  const m=u.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\s*\d[A-Z]{2})?$/);
  if(m&&PC[m[1]])return{lat:PC[m[1]][0],lon:PC[m[1]][1],label:m[1]};
  const n=normT(q);if(!n)return null;if(TOWNIDX[n])return{lat:TOWNIDX[n][0][0],lon:TOWNIDX[n][0][1],label:TOWNIDX[n][1]};
  if(n.length>=4){const k=Object.keys(TOWNIDX).find(x=>x.startsWith(n));if(k)return{lat:TOWNIDX[k][0][0],lon:TOWNIDX[k][0][1],label:TOWNIDX[k][1]}}
  return null}
function miles(a,b){const R=3958.8,r=x=>x*Math.PI/180;const h=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lon-a.lon)/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const teacherLoc=t=>locate(t.postcode)||locate(t.area);
const schoolLoc=sc=>sc?(locate((sc.postcode||"").trim().split(/\s+/)[0])||locate(sc.town)):null;
function applyNear(st,inputId,hintId,q){st.near=q;st.nearLoc=locate(q);const h=$(hintId);h.hidden=!(q.trim()&&!st.nearLoc);h.textContent=`We couldn't find “${q}”. Try a postcode district like ST8, a full postcode, or a town name.`;if($(inputId).value!==q)$(inputId).value=q}
const withinOk=(d,within,travel)=>within==="travel"?d<=(travel||10):d<=+within;

/* ---------- state ---------- */
const S={session:null,me:null,isAdmin:false,loaded:false,
  teachers:[],schools:{},verified:{},subs:{},checks:{},vacancies:[],apps:[],bookings:[],msgs:[],contacts:{},
  date:null,week:null,f:{phase:"",year:"",subject:"",region:"",free:true,near:"",nearLoc:null,within:"25"},
  vf:{q:"",phase:"",type:"",region:"",near:"",nearLoc:null,within:"25"},dist:{},vdist:{},
  blocked:[],role:null,tTab:"profile",aTab:"schools",inboxTab:"messages",activeChat:null,pendingBook:0,dirty:false,authMode:"signin",recovery:false};
(function(){const d=new Date();const dow=d.getDay();if(dow===6)d.setDate(d.getDate()+2);if(dow===0)d.setDate(d.getDate()+1);S.date=iso(d);S.week=mondayOf(S.date)})();

let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
function notice(html){const n=$("#notice");if(!html){n.hidden=true;return}n.innerHTML=html;n.hidden=false}
const myTeacher=()=>S.me?S.teachers.find(t=>t.id===S.me)||null:null;
const mySchool=()=>S.me?S.schools[S.me]||null:null;
const vOf=id=>S.verified[id]||null;
function isLive(id){const s=S.subs[id];if(s)return!!(s.paidUntil&&s.paidUntil>=todayIso);if(id===S.me||S.isAdmin)return false;return S.teachers.some(t=>t.id===id)}
const schoolOk=id=>vOf(id)?.status==="verified";
const canContact=()=>S.isAdmin||(!!mySchool()&&schoolOk(S.me));
const nameOf=id=>S.schools[id]?.name||S.teachers.find(t=>t.id===id)?.name||"Someone";
const isSchoolId=id=>!!S.schools[id];
function errMsg(e){const m=(e&&e.message)||"";if(/row-level security|permission|Not allowed/i.test(m))return"You don't have permission to do that yet.";if(/duplicate key/i.test(m))return"That's already been saved.";if(/fetch|network/i.test(m))return"Couldn't reach the server. Check your connection and try again.";return m||"Something went wrong. Try again."}
async function must(p){const r=await p;if(r.error)throw r.error;return r.data}

/* ---------- data mapping ---------- */
const mapTeacher=r=>({id:r.id,name:r.name,headline:r.headline,about:r.about,phases:r.phases||[],yearGroups:r.year_groups||[],subjects:r.subjects,quals:r.quals,years:r.years,region:r.region,area:r.area,postcode:r.postcode,radius:r.radius,rate:r.rate,days:r.days||[],blocked:(r.blocked||[]).map(String),paused:r.paused,plan:r.plan});
const mapSchool=r=>({id:r.id,name:r.name,urn:r.urn,region:r.region,town:r.town,postcode:r.postcode,contactName:r.contact_name,contactRole:r.contact_role,email:r.email,phone:r.phone,createdAt:r.created_at});
const mapVac=r=>({id:r.id,schoolId:r.school_id,title:r.title,type:r.type,phase:r.phase,start:r.start_date,end:r.end_date,rate:r.rate,pay:r.pay,subjects:r.subjects,desc:r.description,status:r.status,createdAt:r.created_at});
const mapApp=r=>({id:r.id,vacancyId:r.vacancy_id,teacherId:r.teacher_id,rate:r.rate,note:r.note,status:r.status,at:Date.parse(r.created_at)});
const mapBooking=r=>({id:r.id,schoolId:r.school_id,teacherId:r.teacher_id,dates:(r.dates||[]).map(String),role:r.role,notes:r.notes,status:r.status,reply:r.reply,createdAt:Date.parse(r.created_at)});
const mapMsg=r=>({id:r.id,from:r.sender_id,to:r.recipient_id,text:r.body,ref:r.ref,at:Date.parse(r.created_at),readAt:r.read_at});

async function loadPublic(){
  const[t,v,vac]=await Promise.all([sb.from("teachers").select("*"),sb.from("verifications").select("*"),sb.from("vacancies").select("*")]);
  S.teachers=(t.data||[]).map(mapTeacher);
  S.verified={};(v.data||[]).forEach(r=>S.verified[r.user_id]={status:r.status,items:r.items||{},note:r.note,checkedAt:r.checked_at,kind:r.kind});
  S.vacancies=(vac.data||[]).map(mapVac);
}
async function loadPrivate(){
  if(!S.me){S.schools={};S.subs={};S.checks={};S.apps=[];S.bookings=[];S.msgs=[];return}
  const[sc,su,ch,ap,bk,ms]=await Promise.all([sb.from("schools").select("*"),sb.from("subscriptions").select("*"),sb.from("teacher_checks").select("*"),sb.from("applications").select("*"),sb.from("bookings").select("*"),sb.from("messages").select("*").order("created_at",{ascending:true}).limit(2000)]);
  S.schools={};(sc.data||[]).forEach(r=>S.schools[r.id]=mapSchool(r));
  S.subs={};(su.data||[]).forEach(r=>S.subs[r.user_id]={plan:r.plan,status:r.status,paidUntil:r.paid_until,stripe:!!r.stripe_subscription_id});
  S.checks={};(ch.data||[]).forEach(r=>S.checks[r.teacher_id]={nation:r.nation,dob:r.dob,surname:r.surname,trn:r.reg_number,dbsNumber:r.crim_number,referees:r.referees||[],consent:r.consent,submittedAt:r.submitted_at});
  S.apps=(ap.data||[]).map(mapApp);S.bookings=(bk.data||[]).map(mapBooking);S.msgs=(ms.data||[]).map(mapMsg);
}
async function loadAll(){
  try{await Promise.all([loadPublic(),loadPrivate()]);S.loaded=true;notice("")}
  catch(e){S.loaded=true;notice("<span><b>Can't reach Direct Supply right now.</b> Check your connection and refresh the page.</span>")}
  renderAll();
}
async function refresh(kind){
  if(!S.me)return;
  if(kind==="messages"){const r=await sb.from("messages").select("*").order("created_at",{ascending:true}).limit(2000);if(!r.error)S.msgs=r.data.map(mapMsg)}
  if(kind==="applications"){const r=await sb.from("applications").select("*");if(!r.error)S.apps=r.data.map(mapApp)}
  if(kind==="bookings"){const r=await sb.from("bookings").select("*");if(!r.error)S.bookings=r.data.map(mapBooking)}
  renderAll();
}
let rtChannel=null;
function subscribeRealtime(){
  if(rtChannel){sb.removeChannel(rtChannel);rtChannel=null}
  if(!S.me)return;
  rtChannel=sb.channel("ds-"+S.me)
    .on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>refresh("messages"))
    .on("postgres_changes",{event:"*",schema:"public",table:"applications"},()=>refresh("applications"))
    .on("postgres_changes",{event:"*",schema:"public",table:"bookings"},()=>refresh("bookings"))
    .subscribe();
}

/* ---------- theme ---------- */
const root=document.documentElement;const mq=matchMedia("(prefers-color-scheme: dark)");
const curTheme=()=>root.dataset.theme||(mq.matches?"dark":"light");
function syncTheme(){$("#themeBtn").setAttribute("aria-label",curTheme()==="dark"?"Switch to light mode":"Switch to dark mode")}
try{const sv=localStorage.getItem("ds-theme");if(sv==="light"||sv==="dark")root.dataset.theme=sv}catch(_){}
$("#themeBtn").onclick=()=>{const n=curTheme()==="dark"?"light":"dark";root.dataset.theme=n;try{localStorage.setItem("ds-theme",n)}catch(_){}syncTheme()};
mq.addEventListener?.("change",syncTheme);syncTheme();

/* ---------- routing ---------- */
const VIEWS=["find","vacancies","inbox","account","admin"];
function route(){let v=location.hash.slice(1);if(v==="bookings")v="inbox";if(!VIEWS.includes(v)||(v==="admin"&&!S.isAdmin))v="find";
  VIEWS.forEach(x=>{$("#view-"+x).hidden=x!==v});
  document.querySelectorAll("nav a").forEach(a=>a.setAttribute("aria-current",a.dataset.view===v?"page":"false"))}
addEventListener("hashchange",()=>{route();scrollTo(0,0);if(S.loaded){renderInbox();if(!S.dirty&&!formFocused())renderAccount()}});route();

/* ---------- find teachers ---------- */
$("#fPhase").innerHTML+=PHASES.map(p=>`<option>${p}</option>`).join("");
$("#fYear").innerHTML+=YEARS.map((y,i)=>`<option value="${i}">${y}</option>`).join("");
$("#fRegion").innerHTML+=REGIONS.map(r=>`<option>${r}</option>`).join("");
$("#townList").innerHTML=Object.keys(TOWNS).sort().map(t=>`<option value="${esc(t)}">`).join("");
const bind=(id,key,ev,get)=>$(id).addEventListener(ev,e=>{S.f[key]=get(e);renderFind()});
bind("#fSubject","subject","input",e=>e.target.value.trim().toLowerCase());
bind("#fPhase","phase","change",e=>e.target.value);bind("#fYear","year","change",e=>e.target.value);
bind("#fRegion","region","change",e=>e.target.value);bind("#fFree","free","change",e=>e.target.checked);
let nearT;$("#fNear").addEventListener("input",e=>{clearTimeout(nearT);nearT=setTimeout(()=>{applyNear(S.f,"#fNear","#fNearHint",e.target.value);if(S.f.nearLoc){S.f.region="";$("#fRegion").value=""}renderFind()},250)});
$("#fWithin").addEventListener("change",e=>{S.f.within=e.target.value;renderFind()});
$("#prevWeek").onclick=()=>{S.week.setDate(S.week.getDate()-7);S.date=iso(S.week);renderFind()};
$("#nextWeek").onclick=()=>{S.week.setDate(S.week.getDate()+7);S.date=iso(S.week);renderFind()};
$("#days").addEventListener("click",e=>{const b=e.target.closest("[data-day]");if(b){S.date=b.dataset.day;renderFind()}});

function bookedMap(){const m={};for(const r of S.bookings){if(r.status!=="accepted")continue;(m[r.teacherId]=m[r.teacherId]||new Set());r.dates.forEach(d=>m[r.teacherId].add(d))}return m}
function avail(t,day,bm){if(t.paused)return"off";if(!(t.days||[]).includes(parse(day).getDay()))return"off";if((t.blocked||[]).includes(day))return"off";if(bm[t.id]&&bm[t.id].has(day))return"booked";return"free"}
function matches(t){const f=S.f;
  if(t.paused||(!isLive(t.id)&&t.id!==S.me))return false;
  if(f.phase&&!(t.phases||[]).includes(f.phase))return false;
  if(f.year!==""&&!(t.yearGroups||[]).includes(+f.year))return false;
  if(f.subject){const hay=[t.subjects,t.headline,t.about,t.quals,t.area,t.postcode,t.region,(t.phases||[]).join(" ")].join(" ").toLowerCase();if(!f.subject.split(/[ ,]+/).filter(Boolean).every(w=>hay.includes(w)))return false}
  if(f.region&&t.region!==f.region)return false;
  if(f.nearLoc){const tl=teacherLoc(t);if(!tl)return false;const d=miles(f.nearLoc,tl);S.dist[t.id]=d;if(!withinOk(d,f.within,t.radius))return false}
  return true}
function findBanner(){
  if(!S.loaded||S.isAdmin||myTeacher())return"";
  if(!S.me)return`<div class="banner hi"><span><b>Are you a school?</b> Create a free account to see teachers' contact details and book them.</span><a class="btn" href="#account">Create an account</a></div>`;
  const sc=mySchool();
  if(!sc)return`<div class="banner hi"><span><b>Finish setting up your account</b> to contact and book teachers.</span><a class="btn" href="#account">Continue</a></div>`;
  const v=vOf(S.me);
  if(v?.status==="rejected")return`<div class="banner"><span><b>We couldn't verify your school.</b> ${esc(v.note||"Check your details on your account page.")}</span><a class="btn secondary" href="#account">Review details</a></div>`;
  if(!schoolOk(S.me))return`<div class="banner hi"><span><b>Your school is being verified.</b> You'll be able to contact and book teachers once we've confirmed your details, usually within one working day.</span></div>`;
  return""}
const EXAMPLE={id:"_ex",name:"Sarah Holt",headline:"KS2 teacher, day-to-day and short blocks",phases:["Primary"],yearGroups:[5,6,7],area:"Leeds",postcode:"LS6",region:"Yorkshire and the Humber",radius:15,rate:165,years:8,days:[1,2,3,4]};
function renderFind(){
  if(!S.regionInit&&S.loaded){const sc=mySchool();const q=sc?((sc.postcode||"").trim().split(/\s+/)[0]||sc.town||""):"";if(q&&locate(q))applyNear(S.f,"#fNear","#fNearHint",q);else if(sc?.region){S.f.region=sc.region;$("#fRegion").value=sc.region}S.regionInit=true}
  S.dist={};
  const days=weekDays(S.week);const bm=bookedMap();const pool=S.teachers.filter(matches);
  $("#findBanner").innerHTML=findBanner();
  $("#weekTitle").textContent="Week of "+parse(days[0]).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  $("#days").innerHTML=days.map(d=>{const dt=parse(d);const n=pool.filter(t=>avail(t,d,bm)==="free").length;
    return`<button class="day${d<todayIso?" past":""}" data-day="${d}" aria-pressed="${d===S.date}"><span class="w">${d===todayIso?"Today":WD[dt.getDay()]}</span><span class="d">${dt.getDate()}</span><span class="n${n?"":" zero"}">${S.loaded?(n?n+" free":"None free"):"&nbsp;"}</span></button>`}).join("");
  const list=pool.filter(t=>!S.f.free||avail(t,S.date,bm)==="free").sort((a,b)=>{const o={free:0,booked:1,off:2};return(o[avail(a,S.date,bm)]-o[avail(b,S.date,bm)])||(S.f.nearLoc?(S.dist[a.id]??999)-(S.dist[b.id]??999):0)||((vOf(b.id)?.status==="verified")-(vOf(a.id)?.status==="verified"))||((a.rate||999)-(b.rate||999))});
  const el=$("#results");
  if(!S.loaded){$("#resultsTitle").textContent="Loading teachers…";el.innerHTML="";return}
  const anyone=S.teachers.some(t=>isLive(t.id)||t.id===S.me);
  $("#resultsTitle").textContent=!anyone?"No teachers listed yet":`${list.length} ${list.length===1?"teacher":"teachers"} ${S.f.free?"free on":"for"} ${fmtLong(S.date)}${S.f.nearLoc?` near ${S.f.nearLoc.label}`:""}`;
  if(!anyone){el.innerHTML=`<div class="empty"><h3>Teachers will appear here</h3><p>Supply teachers create an account, get verified and choose a plan. Once they're live, schools see them here. This is what a teacher looks like:</p><div style="width:100%">${cardHtml(EXAMPLE,days,{},true)}</div><a class="btn" href="#account">I'm a supply teacher</a></div>`;return}
  if(!list.length){el.innerHTML=`<div class="empty"><h3>No one matches on ${esc(fmt(S.date))}</h3><p>Try another day, a wider distance, or turn off “Free that day only”.</p></div>`;return}
  el.innerHTML=list.map(t=>cardHtml(t,days,bm,false)).join("")}
function credsHtml(t,example){const v=example?{status:"verified",items:{id:1,qts:1,dbs:1,refs:1}}:vOf(t.id);
  if(v&&v.status==="verified"){const ok=CHECKS.filter(([k])=>v.items?.[k]);return`<div class="creds"><span class="ok">✓ Verified by Direct Supply</span>${ok.map(([,l])=>`<span>${esc(l)}</span>`).join("")}</div>`}
  return`<div class="creds"><span>Checks not yet verified</span></div>`}
function cardHtml(t,days,bm,example){
  const st=avail(t,S.date,bm);const mine=t.id===S.me;
  const status=example?`<span class="badge b-hi">Example</span>`:st==="free"?`<span class="badge b-free"><span class="dot"></span>Free ${esc(fmt(S.date))}</span>`:st==="booked"?`<span class="badge b-booked"><span class="dot"></span>Booked</span>`:`<span class="badge b-off">Not working</span>`;
  const facts=[["Teaches",yearRange(t.yearGroups)||"—"],["Based in",place(t)+(S.f.nearLoc&&S.dist[t.id]!=null?` · ${Math.max(1,Math.round(S.dist[t.id]))} mi away`:"")],["Experience",t.years!=null&&t.years!==""?t.years+" years":"—"]];
  const strip=days.map(d=>{const a=avail(t,d,bm);return`<i class="${a}${d===S.date?" sel":""}" title="${esc(fmt(d))}: ${a==="free"?"free":a==="booked"?"booked":"not working"}">${WD[parse(d).getDay()][0]}</i>`}).join("");
  return`<article class="card${example?" example":""}">
    <div class="card-top">${avatar(t.id,t.name)}
      <div style="min-width:0"><div class="name-row"><h3>${esc(t.name||"Your name")}</h3>${status}${mine?`<span class="badge b-hi">You</span>`:""}${mine&&!isLive(t.id)?`<span class="badge b-booked">Only you can see this</span>`:""}</div>
        ${t.headline?`<p class="headline">${esc(t.headline)}</p>`:""}${credsHtml(t,example)}</div>
      ${t.rate?`<div class="price"><b>£${esc(t.rate)}</b><span>per day</span></div>`:""}</div>
    <dl class="facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <div class="card-foot"><div class="strip" aria-label="Availability this week"><span class="lab">This week</span>${strip}</div>
      ${example?"":`<button class="btn" data-profile="${esc(t.id)}">${canContact()?"View and contact":"View profile"}</button>`}</div>
  </article>`}
$("#results").addEventListener("click",e=>{const b=e.target.closest("[data-profile]");if(b)openProfile(b.dataset.profile)});

/* ---------- teacher profile dialog ---------- */
async function getContact(id){if(S.contacts[id])return S.contacts[id];const r=await sb.from("teacher_contacts").select("phone,email").eq("teacher_id",id).maybeSingle();if(r.data)S.contacts[id]=r.data;return r.data||null}
async function openProfile(id){
  const t=S.teachers.find(x=>x.id===id);if(!t)return;const st=avail(t,S.date,bookedMap());
  const subj=(t.subjects||"").split(",").map(s=>s.trim()).filter(Boolean);const v=vOf(t.id);
  const contactBox=canContact()?`<div class="contact-box" id="contactBox"><p class="small muted">Loading contact details…</p></div>`
    :`<div class="contact-box"><p><b>Contact details are shown to verified schools.</b></p><p class="small muted">${!S.me?"Create a free school account and we'll verify it, usually within one working day.":mySchool()?"Your school is still being verified.":"Only verified school accounts can see teachers' contact details."}</p>${!S.me?`<div><a class="btn" href="#account" data-close="profileDialog">Create an account</a></div>`:""}</div>`;
  $("#profileBody").innerHTML=`
    <div class="dlg-head"><div style="display:flex;gap:14px;align-items:center;min-width:0">${avatar(t.id,t.name,"lg")}<div style="min-width:0"><h2>${esc(t.name)}</h2>${t.headline?`<p class="headline">${esc(t.headline)}</p>`:""}</div></div><button class="x" data-close="profileDialog" aria-label="Close">✕</button></div>
    ${contactBox}
    <dl class="kv">
      <dt>Day rate</dt><dd>${t.rate?`<b class="mono">£${esc(t.rate)}</b> per day`:"Ask"}</dd>
      <dt>Teaches</dt><dd>${esc(yearRange(t.yearGroups)||"—")}</dd>
      <dt>Phases</dt><dd>${esc((t.phases||[]).join(", ")||"—")}</dd>
      <dt>Based in</dt><dd>${esc(place(t))}${t.radius?`, travels up to ${esc(t.radius)} miles`:""}</dd>
      <dt>Experience</dt><dd>${t.years!=null&&t.years!==""?esc(t.years)+" years":"—"}</dd>
      ${t.quals?`<dt>Qualifications</dt><dd>${esc(t.quals)}</dd>`:""}
    </dl>
    <div class="dlg-sec"><h3>Checks</h3>${v?.status==="verified"?`<div class="checklist">${CHECKS.map(([k,l])=>`<div><span class="mk ${v.items?.[k]?"done":"todo"}">${v.items?.[k]?"✓":"–"}</span>${esc(l)}${v.items?.[k]?"":" <span class=\"muted\">(not checked)</span>"}</div>`).join("")}<p class="small muted">Checked ${esc(fmtFull(v.checkedAt))}.</p></div>`:`<p class="small muted">Direct Supply hasn't verified this teacher's checks yet.</p>`}</div>
    ${subj.length?`<div class="dlg-sec"><h3>Subjects</h3><div class="tags">${subj.map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div></div>`:""}
    ${t.about?`<div class="dlg-sec"><h3>About</h3><p>${esc(t.about)}</p></div>`:""}
    ${canContact()&&t.id!==S.me?`<div class="row-actions"><button class="btn" data-request="${esc(t.id)}" ${st==="free"?"":"disabled"}>Send booking request</button><button class="btn secondary" data-message="${esc(t.id)}">Message</button>${st!=="free"?`<span class="small muted">${st==="booked"?"Booked":"Not working"} on ${esc(fmt(S.date))}</span>`:""}</div>`:""}`;
  $("#profileDialog").showModal();
  if(canContact()){const c=await getContact(id);const box=$("#contactBox");if(!box)return;
    const line=(lab,val)=>val?`<div class="contact-line"><div style="min-width:0"><span class="lab">${lab}</span><code>${esc(val)}</code></div><button class="btn secondary sm" data-copy="${esc(val)}">Copy</button></div>`:"";
    box.innerHTML=c?`${line("Phone",c.phone)}${line("Email",c.email)}<p class="small muted">Contact ${esc((t.name||"").split(" ")[0])} directly, or send a booking request to keep a record here. Complete your own pre-employment checks before they start.</p>`:`<p class="small muted">This teacher hasn't added contact details yet. Send them a message instead.</p>`}}
$("#profileDialog").addEventListener("click",e=>{const b=e.target.closest("[data-request]");if(b){$("#profileDialog").close();openRequest(b.dataset.request)}});
document.addEventListener("click",e=>{const c=e.target.closest("[data-close]");if(c)$("#"+c.dataset.close).close()});
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));

/* ---------- booking requests ---------- */
let reqTeacher=null;
function openRequest(id){
  const t=S.teachers.find(x=>x.id===id);const sc=mySchool();if(!t||!canContact())return;reqTeacher=t;const bm=bookedMap();
  $("#reqTitle").textContent="Request "+(t.name||"this teacher");
  $("#reqDays").innerHTML=weekDays(S.week).map(d=>{const ok=avail(t,d,bm)==="free"&&d>=todayIso;
    return`<label style="${ok?"":"opacity:.45"}"><input type="checkbox" value="${d}" ${ok?"":"disabled"} ${d===S.date&&ok?"checked":""}> ${esc(fmt(d))}</label>`}).join("");
  $("#reqFrom").textContent=sc?`Sent from ${sc.name}. ${(t.name||"").split(" ")[0]||"They"} will see your school's phone and email.`:"";
  $("#reqStatus").textContent="";$("#reqDialog").showModal()}
$("#reqForm").addEventListener("submit",async e=>{
  e.preventDefault();const t=reqTeacher;if(!t)return;
  const dates=[...document.querySelectorAll("#reqDays input:checked")].map(i=>i.value);
  if(!dates.length){$("#reqStatus").textContent="Pick at least one day.";return}
  $("#sendReq").disabled=true;
  try{await must(sb.from("bookings").insert({teacher_id:t.id,dates,role:$("#rRole").value.trim()||null,notes:$("#rNotes").value.trim()||null}));
    $("#rRole").value="";$("#rNotes").value="";$("#reqDialog").close();toast("Request sent to "+(t.name||"teacher"));refresh("bookings")}
  catch(err){$("#reqStatus").textContent=errMsg(err)}finally{$("#sendReq").disabled=false}});

/* ---------- account ---------- */
const formFocused=()=>{const a=document.activeElement;return!!(a&&a.closest&&a.closest("#accountRoot,#adminBody")&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))};
function renderAccount(){
  S.dirty=false;const el=$("#accountRoot");
  if(S.recovery)return renderRecovery(el);
  if(!S.session)return renderAuth(el);
  if(!S.loaded){el.innerHTML=`<p class="muted">Loading…</p>`;return}
  const t=myTeacher(),sc=mySchool();
  if(t||S.role==="teacher")return renderTeacherAccount(el,t);
  if(sc||S.role==="school")return renderSchoolAccount(el,sc);
  el.innerHTML=`<div class="page-head"><h1>Set up your account</h1><p>Signed in as ${esc(S.session.user.email)}. Tell us who you are. You can't change this later.</p></div>
    <div class="roles">
      <button class="role" data-role="school"><span class="ico">${ICON.school}</span><h2>I'm a school</h2><p>Free for schools.</p><ul><li>See teachers' phone and email</li><li>Book cover and post vacancies</li><li>Verified against official school records</li></ul><span class="go">Set up school account →</span></button>
      <button class="role" data-role="teacher"><span class="ico">${ICON.teacher}</span><h2>I'm a supply teacher</h2><p>£20 a month or £199 a year.</p><ul><li>Keep your whole day rate</li><li>Set your own days and rate, and apply for vacancies</li><li>Get a verified badge schools trust</li></ul><span class="go">Set up teacher account →</span></button>
    </div>${signOutRow()}`}
const signOutRow=()=>`<p class="small muted" style="margin-top:20px">Signed in as ${esc(S.session?.user?.email||"")}. <button class="btn link small" data-signout>Sign out</button></p>`;

function renderAuth(el){
  const up=S.authMode==="signup",reset=S.authMode==="reset";
  el.innerHTML=`<form class="auth-card" id="authForm" novalidate>
    <div><h1 style="font-size:26px">${reset?"Reset your password":up?"Create your account":"Sign in"}</h1><p class="muted small" style="margin-top:4px">${reset?"We'll email you a link to set a new password.":up?"Free for schools. Supply teachers choose a plan once their profile is ready.":"Welcome back to Direct Supply."}</p></div>
    <div class="f"><label for="aEmail">Email</label><input class="input" id="aEmail" type="email" autocomplete="email" required></div>
    ${reset?"":`<div class="f"><label for="aPass">Password</label><input class="input" id="aPass" type="password" autocomplete="${up?"new-password":"current-password"}" minlength="8" required>${up?`<span class="hint">At least 8 characters.</span>`:""}</div>`}
    <button class="btn lg" type="submit" id="aSubmit">${reset?"Send reset link":up?"Create account":"Sign in"}</button>
    <p class="small" id="aStatus" role="status"></p>
    <p class="small muted">${reset?`<button type="button" class="btn link small" data-auth="signin">Back to sign in</button>`:up?`Already have an account? <button type="button" class="btn link small" data-auth="signin">Sign in</button>`:`New here? <button type="button" class="btn link small" data-auth="signup">Create an account</button> · <button type="button" class="btn link small" data-auth="reset">Forgotten password?</button>`}</p>
  </form>`}
function renderRecovery(el){
  el.innerHTML=`<form class="auth-card" id="recoverForm" novalidate><div><h1 style="font-size:26px">Set a new password</h1></div>
    <div class="f"><label for="rPass">New password</label><input class="input" id="rPass" type="password" autocomplete="new-password" minlength="8"></div>
    <button class="btn lg" type="submit">Save password</button><p class="small" id="rStatus"></p></form>`}
const redirectUrl=()=>location.origin+location.pathname+"#account";
$("#accountRoot").addEventListener("submit",async e=>{
  e.preventDefault();const id=e.target.id;
  if(id==="authForm"){
    const email=$("#aEmail").value.trim(),pass=$("#aPass")?.value||"",st=$("#aStatus");st.style.color="";
    if(!/^\S+@\S+\.\S+$/.test(email)){st.textContent="Enter a valid email address.";st.style.color="var(--booked)";return}
    if(S.authMode!=="reset"&&pass.length<8){st.textContent="Your password needs at least 8 characters.";st.style.color="var(--booked)";return}
    $("#aSubmit").disabled=true;st.textContent="Please wait…";
    try{
      if(S.authMode==="signup"){const r=await sb.auth.signUp({email,password:pass,options:{emailRedirectTo:redirectUrl()}});if(r.error)throw r.error;
        if(!r.data.session)st.textContent="Check your email and click the link to confirm your account, then come back and sign in.";}
      else if(S.authMode==="reset"){const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});if(r.error)throw r.error;st.textContent="If that email has an account, a reset link is on its way."}
      else{const r=await sb.auth.signInWithPassword({email,password:pass});if(r.error)throw r.error}
    }catch(err){st.style.color="var(--booked)";st.textContent=/Invalid login/i.test(err.message)?"That email and password don't match.":/not confirmed/i.test(err.message)?"Confirm your email first: check your inbox for our link.":errMsg(err)}
    finally{const b=$("#aSubmit");if(b)b.disabled=false}
    return}
  if(id==="recoverForm"){const p=$("#rPass").value;if(p.length<8){$("#rStatus").textContent="At least 8 characters.";return}
    const r=await sb.auth.updateUser({password:p});if(r.error){$("#rStatus").textContent=errMsg(r.error);return}
    S.recovery=false;toast("Password updated");renderAccount();return}
  if(id==="schoolForm")saveSchool();if(id==="profileForm")saveProfile();if(id==="checksForm")saveChecks()});
$("#accountRoot").addEventListener("click",e=>{
  const au=e.target.closest("[data-auth]");if(au){S.authMode=au.dataset.auth;renderAccount();return}
  if(e.target.closest("[data-signout]")){sb.auth.signOut();return}
  const r=e.target.closest("[data-role]");if(r){S.role=r.dataset.role;renderAccount();scrollTo(0,0);return}
  const b=e.target.closest("[data-back]");if(b){S.role=null;renderAccount();return}
  const s=e.target.closest("[data-ttab]");if(s){S.tTab=s.dataset.ttab;renderAccount();return}
  const a=e.target.closest("[data-addblock]");if(a){const v=$("#lBlockDate").value;if(v&&!S.blocked.includes(v)){S.blocked.push(v);S.dirty=true;renderBlocked()}$("#lBlockDate").value="";return}
  const u=e.target.closest("[data-unblock]");if(u){S.blocked=S.blocked.filter(d=>d!==u.dataset.unblock);S.dirty=true;renderBlocked();return}
  const pay=e.target.closest("[data-subscribe]");if(pay){startCheckout(pay.dataset.subscribe,pay);return}
  if(e.target.closest("[data-portal]")){openPortal(e.target.closest("[data-portal]"));return}
  const d=e.target.closest("[data-delete]");if(d){deleteAccount(d)}});
$("#accountRoot").addEventListener("change",e=>{
  if(e.target.id==="cNation"){const n=NATION[e.target.value];$("#cTrnLabel").textContent=n.reg;$("#cDbsLabel").textContent=n.crim}
  if(e.target.id==="sRegion"){const n=nationOf(e.target.value);$("#sUrnLabel").textContent=NATION[n].school;$("#sUrnHint").innerHTML=urnHint(n)}});
$("#accountRoot").addEventListener("input",e=>{if(e.target.closest("form")&&!["authForm","recoverForm"].includes(e.target.closest("form").id))S.dirty=true});

/* school account */
function schoolStatus(){const v=vOf(S.me);
  if(v?.status==="verified")return`<div class="banner" style="margin:0"><span><span class="badge b-free"><span class="dot"></span>Verified</span> Your school is verified. You can contact and book teachers.</span><a class="btn" href="#find">Find teachers</a></div>`;
  if(v?.status==="rejected")return`<div class="banner" style="margin:0"><span><span class="badge b-booked">Not verified</span> ${esc(v.note||"We couldn't confirm these details. Check them and save again.")}</span></div>`;
  return`<div class="banner hi" style="margin:0"><span><span class="badge b-hi">Awaiting verification</span> We'll check your school against the official school register and ring the school office to confirm you work there.</span></div>`}
function renderSchoolAccount(el,sc){
  const s=sc||{};
  el.innerHTML=`<div class="page-head"><h1>${sc?esc(sc.name):"Set up your school"}</h1><p>${sc?"Your school's details and verification status.":"Free for schools. We verify every school before it can see teachers' contact details."}</p></div>
  ${sc?schoolStatus():""}
  <form class="panel" id="schoolForm" autocomplete="off" novalidate style="${sc?"margin-top:14px":""}">
    <div class="group" style="border:0;padding:0"><h3>Your school</h3>
      <div class="grid2">
        <div class="f"><label for="sRegion">Region</label><select class="input" id="sRegion"><option value="">Choose…</option>${REGIONS.map(r=>`<option ${s.region===r?"selected":""}>${r}</option>`).join("")}</select></div>
        <div class="f"><label for="sName">School name</label><input class="input" id="sName" maxlength="100" value="${esc(s.name)}" placeholder="e.g. St Mary's CE Primary School"></div>
        <div class="f"><label for="sUrn" id="sUrnLabel">${esc(NATION[nationOf(s.region)].school)}</label><input class="input mono" id="sUrn" maxlength="14" value="${esc(s.urn)}"><span class="hint" id="sUrnHint">${urnHint(nationOf(s.region))}</span></div>
        <div class="f"><label for="sTown">Town</label><input class="input" id="sTown" maxlength="60" list="townList" value="${esc(s.town)}"></div>
        <div class="f"><label for="sPostcode">Postcode</label><input class="input mono" id="sPostcode" maxlength="9" value="${esc(s.postcode)}"></div>
      </div>
    </div>
    <div class="group"><h3>You</h3>
      <div class="grid2">
        <div class="f"><label for="sContact">Your full name</label><input class="input" id="sContact" maxlength="60" value="${esc(s.contactName)}"></div>
        <div class="f"><label for="sRole">Your role</label><select class="input" id="sRole">${ROLES.map(r=>`<option ${s.contactRole===r?"selected":""}>${r}</option>`).join("")}</select></div>
        <div class="f"><label for="sEmail">School email</label><input class="input" id="sEmail" type="email" maxlength="100" value="${esc(s.email||S.session.user.email)}" placeholder="name@yourschool.sch.uk"><span class="hint">Use your school address, not a personal one.</span></div>
        <div class="f"><label for="sPhone">School office phone</label><input class="input mono" id="sPhone" type="tel" maxlength="20" value="${esc(s.phone)}"></div>
      </div>
      <label class="consent"><input type="checkbox" id="sConfirm" ${sc?"checked":""}> I work at this school and I'm authorised to arrange supply cover for it.</label>
    </div>
    <div class="savebar"><span class="small muted" id="schoolStatus">${sc?"Keep these details up to date so teachers can reach you.":"We'll verify your school, usually within one working day."}</span>
      <div class="btns">${sc?`<button type="button" class="btn danger" data-delete="school">Delete account</button>`:`<button type="button" class="btn secondary" data-back>Back</button>`}<button class="btn" type="submit" id="saveSchool">${sc?"Save changes":"Create school account"}</button></div></div>
  </form>${signOutRow()}`}
async function saveSchool(){
  const st=$("#schoolStatus");const v=id=>$(id).value.trim();
  const body={id:S.me,region:$("#sRegion").value,name:v("#sName"),urn:v("#sUrn"),town:v("#sTown")||null,postcode:v("#sPostcode").toUpperCase()||null,contact_name:v("#sContact"),contact_role:$("#sRole").value,email:v("#sEmail"),phone:v("#sPhone"),updated_at:new Date().toISOString()};
  const miss=[!body.region&&"your region",!body.name&&"school name",!/^[A-Za-z0-9\/ -]{4,14}$/.test(body.urn)&&"your school reference number",!body.contact_name&&"your name",!/^\S+@\S+\.\S+$/.test(body.email)&&"a school email",!body.phone&&"the office phone",!$("#sConfirm").checked&&"the confirmation tick"].filter(Boolean);
  if(miss.length){st.textContent="Add "+miss.join(", ")+".";st.style.color="var(--booked)";return}
  const prev=mySchool();$("#saveSchool").disabled=true;st.style.color="";st.textContent="Saving…";
  try{const row=await must(sb.from("schools").upsert(body).select().single());S.schools[S.me]=mapSchool(row);S.dirty=false;S.role=null;
    toast(prev?"School details saved":"School account created. We'll verify it soon");renderAll()}
  catch(err){st.textContent=errMsg(err);st.style.color="var(--booked)"}finally{const b=$("#saveSchool");if(b)b.disabled=false}}

/* teacher account */
function teacherSteps(t){
  const c=S.checks[S.me];const v=vOf(S.me);const live=isLive(S.me);
  const s1=t?["done","Done"]:["todo","To do"];
  const s2=v?.status==="verified"?["done","Verified"]:v?.status==="rejected"?["bad","Needs attention"]:c?["wait","Submitted"]:["todo","To do"];
  const s3=live?["done","Live"]:["todo","Not live"];
  const st=(k,n,lab,[cls,txt])=>`<button class="step" data-ttab="${k}" aria-current="${S.tTab===k?"step":"false"}" ${!t&&k!=="profile"?"disabled":""}><span class="num">Step ${n}</span><b>${lab}</b><span class="st ${cls}">${txt}</span></button>`;
  return`<div class="steps">${st("profile",1,"Your profile",s1)}${st("checks",2,"Verification",s2)}${st("plan",3,"Plan and payment",s3)}</div>`}
function renderTeacherAccount(el,t){
  if(!t&&S.tTab!=="profile")S.tTab="profile";
  const head=`<div class="page-head"><h1>${t?"Your teacher account":"Set up your teacher account"}</h1><p>${t?(isLive(S.me)?"You're live. Schools can find you.":"Finish the steps below to appear to schools."):"Three steps: your profile, your checks, and a plan. Schools only see you once your plan is active."}</p></div>`;
  let body="";
  if(S.tTab==="profile")body=profileForm(t||{});
  if(S.tTab==="checks")body=checksForm();
  if(S.tTab==="plan")body=planPanel(t);
  el.innerHTML=head+teacherSteps(t)+body+signOutRow();
  if(S.tTab==="profile"){S.blocked=((t&&t.blocked)||S.blocked).filter(d=>d>=todayIso);renderBlocked();
    if(t&&!S.contacts[S.me])getContact(S.me).then(c=>{if(c&&!S.dirty&&$("#lPhone")&&!$("#lPhone").value){$("#lPhone").value=c.phone||"";$("#lEmail").value=c.email||""}})}}
function profileForm(t){
  const ck=(arr,val)=>(arr||[]).includes(val)?"checked":"";const c=S.contacts[S.me]||{};
  return`<form class="panel" id="profileForm" autocomplete="off" novalidate>
    <div class="group" style="border:0;padding:0"><h3>About you</h3>
      <div class="grid2"><div class="f"><label for="lName">Full name</label><input class="input" id="lName" maxlength="60" value="${esc(t.name)}"></div>
        <div class="f"><label for="lYears">Years teaching</label><input class="input mono" id="lYears" type="number" min="0" max="50" value="${esc(t.years??"")}"></div></div>
      <div class="f"><label for="lHeadline">One-line summary</label><input class="input" id="lHeadline" maxlength="110" value="${esc(t.headline)}" placeholder="e.g. KS2 teacher, day-to-day and short blocks"></div>
      <div class="f"><label for="lAbout">About you</label><textarea class="input" id="lAbout" rows="3" maxlength="800" placeholder="Your experience and the kind of cover you enjoy">${esc(t.about)}</textarea></div>
    </div>
    <div class="group"><h3>Contact details</h3><p class="hint" style="margin-top:-8px">Only verified schools can see these.</p>
      <div class="grid2"><div class="f"><label for="lPhone">Phone</label><input class="input mono" id="lPhone" type="tel" maxlength="20" value="${esc(c.phone)}"></div>
        <div class="f"><label for="lEmail">Email</label><input class="input" id="lEmail" type="email" maxlength="100" value="${esc(c.email||(!t.name?S.session.user.email:""))}"></div></div>
    </div>
    <div class="group"><h3>What you teach</h3>
      <div class="f"><span class="lab">Phases</span><div class="checks" id="lPhases">${PHASES.map(p=>`<label><input type="checkbox" value="${p}" ${ck(t.phases,p)}> ${p}</label>`).join("")}</div></div>
      <div class="f"><span class="lab">Year groups</span><div class="checks" id="lYearGroups">${YEARS.map((y,i)=>`<label><input type="checkbox" value="${i}" ${ck(t.yearGroups,i)}> ${y}</label>`).join("")}</div></div>
      <div class="grid2"><div class="f"><label for="lSubjects">Subjects</label><input class="input" id="lSubjects" maxlength="160" value="${esc(t.subjects)}" placeholder="e.g. Maths, PE, Phonics"></div>
        <div class="f"><label for="lQuals">Qualifications</label><input class="input" id="lQuals" maxlength="160" value="${esc(t.quals)}" placeholder="e.g. BA Primary Education, PGCE"></div></div>
    </div>
    <div class="group"><h3>Where, when and rate</h3>
      <div class="grid2"><div class="f"><label for="lRegion">Region</label><select class="input" id="lRegion"><option value="">Choose…</option>${REGIONS.map(r=>`<option ${t.region===r?"selected":""}>${r}</option>`).join("")}</select></div>
        <div class="f"><label for="lArea">Town or city</label><input class="input" id="lArea" maxlength="60" list="townList" value="${esc(t.area)}" placeholder="e.g. Leeds"></div>
        <div class="f"><label for="lPostcode">Postcode district</label><input class="input mono" id="lPostcode" maxlength="4" value="${esc(t.postcode)}" placeholder="e.g. LS6"><span class="hint">Just the first part of your postcode.</span></div>
        <div class="f"><label for="lRadius">Will travel (miles)</label><input class="input mono" id="lRadius" type="number" min="1" max="100" value="${esc(t.radius??15)}"></div>
        <div class="f"><label for="lRate">Day rate (£)</label><input class="input mono" id="lRate" type="number" min="0" max="999" step="5" value="${esc(t.rate??"")}" placeholder="160"></div></div>
      <div class="f"><span class="lab">Days you usually work</span><div class="checks" id="lDays">${[1,2,3,4,5].map(d=>`<label><input type="checkbox" value="${d}" ${t.days?ck(t.days,d):"checked"}> ${WD[d]}</label>`).join("")}</div></div>
      <div class="f"><label for="lBlockDate">Days off</label><div class="row-actions"><input class="input mono" type="date" id="lBlockDate" style="width:auto"><button type="button" class="btn secondary" data-addblock>Add</button></div><div class="blocked" id="blockedList"></div></div>
      <label class="switch"><input type="checkbox" id="lPaused" ${t.paused?"checked":""}> Pause my profile (hidden from schools)</label>
    </div>
    <div class="savebar"><span class="small muted" id="profileStatus">${t.name?"":"Save, then continue to verification."}</span>
      <div class="btns">${t.name?`<button type="button" class="btn danger" data-delete="teacher">Delete account</button>`:`<button type="button" class="btn secondary" data-back>Back</button>`}<button class="btn" type="submit" id="saveProfile">${t.name?"Save changes":"Save and continue"}</button></div></div>
  </form>`}
function renderBlocked(){const el=$("#blockedList");if(!el)return;S.blocked.sort();el.innerHTML=S.blocked.map(d=>`<button type="button" data-unblock="${d}" aria-label="Remove ${esc(fmt(d))}">${esc(fmt(d))} ✕</button>`).join("")||`<span class="hint">No days off added.</span>`}
async function saveProfile(){
  const st=$("#profileStatus");const v=id=>$(id).value.trim();const num=x=>x===""?null:Number(x);const prev=myTeacher();
  const body={id:S.me,name:v("#lName"),years:num(v("#lYears")),headline:v("#lHeadline")||null,about:v("#lAbout")||null,
    phases:[...document.querySelectorAll("#lPhases input:checked")].map(i=>i.value),year_groups:[...document.querySelectorAll("#lYearGroups input:checked")].map(i=>+i.value),
    subjects:v("#lSubjects")||null,quals:v("#lQuals")||null,region:$("#lRegion").value||null,area:v("#lArea")||null,postcode:v("#lPostcode").toUpperCase()||null,radius:num(v("#lRadius")),rate:num(v("#lRate")),
    days:[...document.querySelectorAll("#lDays input:checked")].map(i=>+i.value),blocked:S.blocked.slice(),paused:$("#lPaused").checked,updated_at:new Date().toISOString()};
  const phone=v("#lPhone"),email=v("#lEmail");
  const miss=[!body.name&&"your name",!phone&&"a phone number",!/^\S+@\S+\.\S+$/.test(email)&&"an email",!body.phases.length&&"a phase",!body.year_groups.length&&"your year groups",!body.region&&"your region",!body.area&&"your town or city"].filter(Boolean);
  if(miss.length){st.textContent="Add "+miss.join(", ")+".";st.style.color="var(--booked)";return}
  $("#saveProfile").disabled=true;st.style.color="";st.textContent="Saving…";
  try{const row=await must(sb.from("teachers").upsert(body).select().single());
    await must(sb.from("teacher_contacts").upsert({teacher_id:S.me,phone,email}));S.contacts[S.me]={phone,email};
    const i=S.teachers.findIndex(x=>x.id===S.me);const t=mapTeacher(row);if(i>=0)S.teachers[i]=t;else S.teachers.push(t);
    S.dirty=false;toast("Profile saved");if(!prev)S.tTab="checks";S.role=null;renderAll();scrollTo(0,0)}
  catch(err){st.textContent=errMsg(err);st.style.color="var(--booked)"}finally{const b=$("#saveProfile");if(b)b.disabled=false}}

function checksForm(){
  const c=S.checks[S.me]||{};const v=vOf(S.me);const refs=c.referees&&c.referees.length?c.referees:[{},{}];const nat=c.nation||nationOf(myTeacher()?.region);
  const status=v?.status==="verified"?`<div class="banner" style="margin:0"><span><span class="badge b-free"><span class="dot"></span>Verified</span> Checked ${esc(fmtFull(v.checkedAt))}. Your profile shows a verified badge.</span></div>`
    :v?.status==="rejected"?`<div class="banner" style="margin:0"><span><span class="badge b-booked">Needs attention</span> ${esc(v.note||"We couldn't complete your checks. Update the details below.")}</span></div>`
    :c.submittedAt?`<div class="banner hi" style="margin:0"><span><span class="badge b-hi">Submitted</span> We'll email you to arrange a short ID check, where you show your passport and original criminal record certificate.</span></div>`:"";
  return`${status}<form class="panel" id="checksForm" autocomplete="off" novalidate style="${status?"margin-top:14px":""}">
    <div><h2>Verification</h2><p class="sub">Schools trust verified teachers. These details are private: only Direct Supply sees them, never schools.</p></div>
    <div class="checklist">${CHECKS.map(([k,l])=>`<div><span class="mk ${v?.items?.[k]?"done":"todo"}">${v?.items?.[k]?"✓":"–"}</span><span><b>${esc(l)}</b><br><span class="small muted">${{id:"Passport or driving licence, checked on a short video call or in person.",qts:"Checked on the official register where you're registered: DfE, EWC, GTC Scotland or GTCNI.",dbs:"Enhanced DBS on the Update Service, PVG scheme membership in Scotland, or Enhanced AccessNI in Northern Ireland.",refs:"From two recent schools or employers."}[k]}</span></span></div>`).join("")}</div>
    <div class="group"><h3>Your details for the checks</h3>
      <div class="grid2">
        <div class="f"><label for="cNation">Where you're registered to teach</label><select class="input" id="cNation">${Object.keys(NATION).map(n=>`<option ${nat===n?"selected":""}>${n}</option>`).join("")}</select></div>
        <div class="f"><label for="cDob">Date of birth</label><input class="input mono" id="cDob" type="date" value="${esc(c.dob)}"></div>
        <div class="f"><label for="cSurname">Surname on your certificate</label><input class="input" id="cSurname" maxlength="60" value="${esc(c.surname)}"></div>
        <div class="f"><label for="cTrn" id="cTrnLabel">${esc(NATION[nat].reg)}</label><input class="input mono" id="cTrn" maxlength="20" value="${esc(c.trn)}"></div>
        <div class="f"><label for="cDbs" id="cDbsLabel">${esc(NATION[nat].crim)}</label><input class="input mono" id="cDbs" maxlength="20" value="${esc(c.dbsNumber)}"></div>
      </div>
    </div>
    <div class="group"><h3>References</h3>
      ${[0,1].map(i=>`<div class="grid2"><div class="f"><label for="rn${i}">Referee ${i+1} name</label><input class="input" id="rn${i}" maxlength="60" value="${esc(refs[i]?.name)}"></div><div class="f"><label for="rs${i}">School or employer</label><input class="input" id="rs${i}" maxlength="80" value="${esc(refs[i]?.school)}"></div><div class="f"><label for="re${i}">Work email</label><input class="input" id="re${i}" type="email" maxlength="100" value="${esc(refs[i]?.email)}"></div></div>`).join("")}
    </div>
    <div class="group"><label class="consent"><input type="checkbox" id="cConsent" ${c.consent?"checked":""}> I consent to Direct Supply checking my teacher registration and criminal record check with the relevant UK services, and contacting my referees.</label></div>
    <div class="savebar"><span class="small muted" id="checksStatus"></span><div class="btns"><button class="btn" type="submit" id="saveChecks">${c.submittedAt?"Update details":"Submit for verification"}</button></div></div>
  </form>`}
async function saveChecks(){
  const st=$("#checksStatus");const v=id=>$(id).value.trim();
  const referees=[0,1].map(i=>({name:v("#rn"+i),school:v("#rs"+i),email:v("#re"+i)}));
  const body={teacher_id:S.me,nation:$("#cNation").value,dob:v("#cDob")||null,surname:v("#cSurname"),reg_number:v("#cTrn"),crim_number:v("#cDbs"),referees,consent:$("#cConsent").checked,submitted_at:new Date().toISOString()};
  const miss=[!body.dob&&"your date of birth",!body.surname&&"your surname",!body.reg_number&&"your registration number",!body.crim_number&&"your criminal record check number",referees.some(r=>!r.name||!r.email)&&"both referees",!body.consent&&"your consent"].filter(Boolean);
  if(miss.length){st.textContent="Add "+miss.join(", ")+".";st.style.color="var(--booked)";return}
  $("#saveChecks").disabled=true;st.style.color="";st.textContent="Submitting…";
  try{await must(sb.from("teacher_checks").upsert(body));S.checks[S.me]={nation:body.nation,dob:body.dob,surname:body.surname,trn:body.reg_number,dbsNumber:body.crim_number,referees,consent:true,submittedAt:body.submitted_at};
    S.dirty=false;toast("Submitted for verification");S.tTab="plan";renderAll();scrollTo(0,0)}
  catch(err){st.textContent=errMsg(err);st.style.color="var(--booked)"}finally{const b=$("#saveChecks");if(b)b.disabled=false}}

function planPanel(t){
  const s=S.subs[S.me];const live=isLive(S.me);
  if(live)return`<div class="panel"><div><h2>Your plan</h2><p class="sub">${esc(PLAN[s.plan]?.label||"")} plan, active until ${esc(fmtLong(s.paidUntil))}. Schools can find you.</p></div>
    <div class="savebar">${s.stripe?`<span class="small muted">Change your card, switch plan or cancel in the billing portal.</span><button class="btn secondary" data-portal>Manage billing</button>`:`<span class="small muted">Your plan was set up by Direct Supply. Email hello@getdirectsupply.co.uk to change it.</span>`}</div></div>`;
  return`<div class="panel">
    <div><h2>Choose a plan</h2><p class="sub">Pay securely with Stripe. Your profile goes live to schools as soon as payment goes through.</p></div>
    <div class="plans">
      <div class="plan" style="cursor:default"><span class="eyebrow">Monthly</span><span class="amt">£20<small> / month</small></span><span class="hint">Cancel any time.</span><button class="btn secondary" style="margin-top:8px" data-subscribe="monthly">Choose monthly</button></div>
      <div class="plan" style="cursor:default;border-color:var(--ink);box-shadow:0 0 0 1px var(--ink)"><span class="eyebrow">Yearly</span><span class="amt">£199<small> / year</small></span><span class="badge b-free" style="justify-self:start">Save £41</span><button class="btn" style="margin-top:8px" data-subscribe="yearly">Choose yearly</button></div>
    </div>
    <div class="calc"><div><span>Example day rate</span><b>£160</b></div><div><span>190 school days</span><b>£30,400</b></div><div><span>Yearly plan</span><b>−£199</b></div><div class="tot"><span>You keep</span><b>£30,201</b></div></div>
  </div>`}
async function startCheckout(plan,btn){
  btn.disabled=true;const old=btn.textContent;btn.textContent="Opening checkout…";
  try{const r=await sb.functions.invoke("create-checkout",{body:{plan,returnUrl:location.origin+location.pathname}});if(r.error)throw r.error;if(!r.data?.url)throw new Error("No checkout link");location.href=r.data.url}
  catch(err){toast("Payments aren't switched on yet. Please try again soon.");btn.disabled=false;btn.textContent=old}}
async function openPortal(btn){btn.disabled=true;
  try{const r=await sb.functions.invoke("customer-portal",{body:{returnUrl:location.origin+location.pathname+"#account"}});if(r.error)throw r.error;location.href=r.data.url}
  catch(err){toast("Couldn't open billing. Email hello@getdirectsupply.co.uk.");btn.disabled=false}}

let delArmed=null;
async function deleteAccount(btn){
  const kind=btn.dataset.delete;
  if(delArmed!==kind){delArmed=kind;btn.textContent="Click again to delete everything";setTimeout(()=>{if(delArmed===kind){delArmed=null;btn.textContent="Delete account"}},4000);return}
  delArmed=null;btn.disabled=true;
  try{const r=await sb.functions.invoke("delete-account",{body:{}});if(r.error)throw r.error;await sb.auth.signOut();toast("Your account and data have been deleted")}
  catch(err){btn.disabled=false;toast("Couldn't delete your account. Email privacy@getdirectsupply.co.uk and we'll do it for you.")}}

/* ---------- vacancies ---------- */
const myApps=()=>S.apps.filter(a=>a.teacherId===S.me);
const appsForPost=pid=>S.apps.filter(a=>a.vacancyId===pid&&a.status!=="withdrawn").sort((a,b)=>a.at-b.at);
function appStatus(a){return a.status==="accepted"?["b-free","Offer accepted"]:a.status==="offered"?["b-hi","Offer received"]:a.status==="declined"?["b-off","Not selected"]:a.status==="withdrawn"?["b-off","Withdrawn"]:["b-off","Applied"]}
$("#vPhase").innerHTML+=PHASES.map(p=>`<option>${p}</option>`).join("");
$("#vType").innerHTML+=VTYPES.map(p=>`<option>${p}</option>`).join("");
$("#vRegion").innerHTML+=REGIONS.map(p=>`<option>${p}</option>`).join("");
$("#vfType").innerHTML=VTYPES.map(x=>`<option>${x}</option>`).join("");
$("#vfPhase").innerHTML=PHASES.map(x=>`<option>${x}</option>`).join("");
$("#vfPay").innerHTML=PAYS.map(x=>`<option>${x}</option>`).join("");
$("#vSearch").addEventListener("input",e=>{S.vf.q=e.target.value.trim().toLowerCase();renderVacancies()});
let vNearT;$("#vNear").addEventListener("input",e=>{clearTimeout(vNearT);vNearT=setTimeout(()=>{applyNear(S.vf,"#vNear","#vNearHint",e.target.value);if(S.vf.nearLoc){S.vf.region="";$("#vRegion").value=""}renderVacancies()},250)});
$("#vWithin").addEventListener("change",e=>{S.vf.within=e.target.value;renderVacancies()});
["Phase","Type","Region"].forEach(k=>$("#v"+k).addEventListener("change",e=>{S.vf[k.toLowerCase()]=e.target.value;renderVacancies()}));

function postCard(p,mode){
  const sc=S.schools[p.schoolId]||{};const apps=appsForPost(p.id);
  const dates=p.start?(fmt(p.start)+(p.end?" – "+fmt(p.end):" onwards")):"To agree";
  const status=p.status==="filled"?`<span class="badge b-free">Filled</span>`:p.status==="closed"?`<span class="badge b-off">Closed</span>`:`<span class="badge b-hi">Open</span>`;
  let actions="";
  if(mode==="mine"){
    actions=`<button class="btn" data-applicants="${esc(p.id)}">Applicants (${apps.length})</button><button class="btn secondary" data-editvac="${esc(p.id)}">Edit</button>${p.status==="open"?`<button class="btn link" data-vstatus="closed" data-pid="${esc(p.id)}">Close</button>`:`<button class="btn link" data-vstatus="open" data-pid="${esc(p.id)}">Reopen</button>`}`;
  }else{
    const mine=myApps().find(a=>a.vacancyId===p.id&&a.status!=="withdrawn");const t=myTeacher();
    if(mine){const[c,l]=appStatus(mine);actions=`<span class="badge ${c}">${l}</span>${mine.status==="offered"?`<button class="btn accent" data-acceptoffer="${esc(mine.id)}">Accept offer</button>`:""}<button class="btn secondary" data-message="${esc(p.schoolId)}">Message school</button>`}
    else if(t&&isLive(S.me))actions=`<button class="btn" data-apply="${esc(p.id)}">Apply</button><button class="btn secondary" data-message="${esc(p.schoolId)}">Message school</button>`;
    else if(t)actions=`<a class="btn secondary" href="#account" data-gotab="plan">Choose a plan to apply</a>`;
    else if(!mySchool())actions=`<a class="btn secondary" href="#account">Sign up to apply</a>`;
  }
  const where=([sc.town,sc.region].filter(Boolean).join(", ")||"—")+(mode!=="mine"&&S.vf.nearLoc&&S.vdist[p.schoolId]!=null?` · ${Math.max(1,Math.round(S.vdist[p.schoolId]))} mi away`:"");
  return`<article class="card">
    <div class="card-top">${avatar(p.schoolId,sc.name||"School")}
      <div style="min-width:0"><div class="name-row"><h3>${esc(p.title)}</h3>${mode==="mine"?status:""}</div>
        <p class="headline">${esc(sc.name||"A verified school")} ${schoolOk(p.schoolId)?`<span class="badge b-free">✓ Verified school</span>`:""}</p></div>
      <div class="price">${p.rate?`<b>£${esc(p.rate)}</b><span>per day</span>`:`<span>Rate to agree</span>`}</div></div>
    <dl class="facts"><div><dt>Dates</dt><dd>${esc(dates)}</dd></div><div><dt>Length</dt><dd>${esc(p.type||"—")}</dd></div><div><dt>Where</dt><dd>${esc(where)}</dd></div><div><dt>Teaching</dt><dd>${esc([p.phase,p.subjects].filter(Boolean).join(" · ")||"—")}</dd></div></dl>
    ${p.desc?`<p class="vac-desc">${esc(p.desc)}</p>`:""}
    <div class="card-foot"><span class="small muted">Pay: ${esc(p.pay||"to agree")}</span><div class="row-actions">${actions}</div></div>
  </article>`}
function renderVacancies(){
  const sc=mySchool(),t=myTeacher();
  if(!S.loaded){$("#vacList").innerHTML="";$("#vacCount").textContent="Loading…";return}
  if(!S.vregionInit){const q=t?(t.postcode||t.area||""):"";if(q&&locate(q))applyNear(S.vf,"#vNear","#vNearHint",q);else if(t?.region){S.vf.region=t.region;$("#vRegion").value=t.region}S.vregionInit=true}
  S.vdist={};let banner="";
  if(sc){
    $("#vacTitle").textContent="Your vacancies";$("#vacSub").textContent="Post supply roles. Teachers apply, then you message them, make an offer and agree pay directly.";
    $("#vacBoard").hidden=true;
    const posts=S.vacancies.filter(p=>p.schoolId===S.me).sort((a,b)=>((a.status==="open"?0:1)-(b.status==="open"?0:1))||(Date.parse(b.createdAt)-Date.parse(a.createdAt)));
    if(!schoolOk(S.me))banner=`<div class="banner hi"><span><b>Your school is being verified.</b> You can post vacancies once it's approved.</span></div>`;
    $("#vacMine").innerHTML=`<div class="section-title"><h2>${posts.filter(p=>p.status==="open").length} open</h2>${schoolOk(S.me)?`<button class="btn" data-newvac>Post a vacancy</button>`:""}</div><div class="list">${posts.length?posts.map(p=>postCard(p,"mine")).join(""):`<div class="empty"><h3>No vacancies yet</h3><p>Post a day-to-day, short-term or long-term role. Supply teachers apply, and you can message them before making an offer.</p></div>`}</div>`;
  }else{
    $("#vacTitle").textContent="Vacancies";$("#vacSub").textContent="Supply roles posted by verified schools. Apply and talk to the school directly.";
    $("#vacBoard").hidden=false;
    if(!S.me)banner=`<div class="banner hi"><span><b>Supply teacher?</b> Create an account to apply. <b>School?</b> Create a free account to post vacancies.</span><a class="btn" href="#account">Create an account</a></div>`;
    else if(t&&!isLive(S.me))banner=`<div class="banner hi"><span><b>Choose a plan to apply.</b> You can browse every vacancy now.</span><a class="btn" href="#account" data-gotab="plan">Choose a plan</a></div>`;
    const mineApps=t?myApps().filter(a=>a.status!=="withdrawn"):[];const appliedIds=new Set(mineApps.map(a=>a.vacancyId));
    const appCards=mineApps.slice().sort((a,b)=>b.at-a.at).map(a=>{const p=S.vacancies.find(x=>x.id===a.vacancyId);return p?postCard(p,"board"):""}).join("");
    $("#vacMine").innerHTML=appCards?`<div class="section-title"><h2>Your applications</h2></div><div class="list" style="margin-bottom:24px">${appCards}</div><div class="section-title"><h2>All vacancies</h2></div>`:"";
    const f=S.vf;
    const list=S.vacancies.filter(p=>p.status==="open"&&(!p.end||p.end>=todayIso)&&schoolOk(p.schoolId)&&!appliedIds.has(p.id)).filter(p=>{const s=S.schools[p.schoolId]||{};
      if(f.region&&s.region&&s.region!==f.region)return false;
      if(f.nearLoc){const sl=schoolLoc(s);if(sl){const d=miles(f.nearLoc,sl);S.vdist[p.schoolId]=d;if(!withinOk(d,f.within,t?.radius))return false}}
      if(f.phase&&p.phase!==f.phase)return false;if(f.type&&p.type!==f.type)return false;
      if(f.q){const hay=[p.title,p.subjects,p.desc,s.name,s.town,s.postcode].join(" ").toLowerCase();if(!f.q.split(/\s+/).filter(Boolean).every(w=>hay.includes(w)))return false}return true})
      .sort((a,b)=>f.nearLoc?((S.vdist[a.schoolId]??999)-(S.vdist[b.schoolId]??999))||((a.start||"9999")<(b.start||"9999")?-1:1):((a.start||"9999")<(b.start||"9999")?-1:1));
    $("#vacCount").textContent=`${list.length} open ${list.length===1?"vacancy":"vacancies"}${f.nearLoc?` within ${f.within==="travel"?"your travel distance":f.within+" miles"} of ${f.nearLoc.label}`:f.region?" in "+f.region:" across the UK"}`;
    $("#vacList").innerHTML=list.length?list.map(p=>postCard(p,"board")).join(""):`<div class="empty"><h3>No open vacancies${f.region?" in "+esc(f.region):""}</h3><p>Try another area or clear the search. New roles appear here as schools post them.</p>${!S.me?`<p class="small muted">Sign in to see each school's name and location.</p>`:""}</div>`;
  }
  $("#vacBanner").innerHTML=banner}
$("#view-vacancies").addEventListener("click",async e=>{
  if(e.target.closest("[data-newvac]"))return openVacForm(null);
  const ed=e.target.closest("[data-editvac]");if(ed)return openVacForm(ed.dataset.editvac);
  const ap=e.target.closest("[data-applicants]");if(ap)return openApplicants(ap.dataset.applicants);
  const vs=e.target.closest("[data-vstatus]");if(vs){try{const row=await must(sb.from("vacancies").update({status:vs.dataset.vstatus}).eq("id",vs.dataset.pid).select().single());upsertVac(row);toast(vs.dataset.vstatus==="closed"?"Vacancy closed":"Vacancy reopened");renderAll()}catch(err){toast(errMsg(err))}return}
  const apl=e.target.closest("[data-apply]");if(apl)return openApply(apl.dataset.apply);
  const acc=e.target.closest("[data-acceptoffer]");if(acc)return acceptOffer(acc.dataset.acceptoffer)});
function upsertVac(row){const v=mapVac(row);const i=S.vacancies.findIndex(x=>x.id===v.id);if(i>=0)S.vacancies[i]=v;else S.vacancies.push(v)}
let editingVac=null;
function openVacForm(id){const p=id?S.vacancies.find(x=>x.id===id):null;editingVac=id;
  $("#vacDlgTitle").textContent=p?"Edit vacancy":"Post a vacancy";$("#vfSave").textContent=p?"Save changes":"Post vacancy";
  $("#vfTitle").value=p?.title||"";$("#vfType").value=p?.type||VTYPES[0];$("#vfPhase").value=p?.phase||PHASES[1];$("#vfStart").value=p?.start||"";$("#vfEnd").value=p?.end||"";$("#vfRate").value=p?.rate??"";$("#vfPay").value=p?.pay||PAYS[0];$("#vfSubjects").value=p?.subjects||"";$("#vfDesc").value=p?.desc||"";$("#vfStatus").textContent="";$("#vacDialog").showModal()}
$("#vacForm").addEventListener("submit",async e=>{e.preventDefault();
  const v=id=>$(id).value.trim();const body={title:v("#vfTitle"),type:$("#vfType").value,phase:$("#vfPhase").value,start_date:v("#vfStart")||null,end_date:v("#vfEnd")||null,rate:v("#vfRate")===""?null:Number(v("#vfRate")),pay:$("#vfPay").value,subjects:v("#vfSubjects")||null,description:v("#vfDesc")||null};
  const miss=[!body.title&&"the role",!body.start_date&&"a start date",body.end_date&&body.start_date&&body.end_date<body.start_date&&"an end date after the start"].filter(Boolean);
  if(miss.length){$("#vfStatus").textContent="Add "+miss.join(", ")+".";return}
  $("#vfSave").disabled=true;
  try{const row=editingVac?await must(sb.from("vacancies").update(body).eq("id",editingVac).select().single()):await must(sb.from("vacancies").insert(body).select().single());
    upsertVac(row);$("#vacDialog").close();toast(editingVac?"Vacancy updated":"Vacancy posted");renderAll()}
  catch(err){$("#vfStatus").textContent=errMsg(err)}finally{$("#vfSave").disabled=false}});

let applyTarget=null;
function openApply(pid){const p=S.vacancies.find(x=>x.id===pid);if(!p)return;applyTarget=p;
  $("#applyTitle").textContent=p.title;$("#applyInfo").textContent=`${S.schools[p.schoolId]?.name||"School"} · ${p.rate?"£"+p.rate+" per day offered":"Rate to agree"}. The school will see your profile, contact details and verification status.`;
  $("#apRate").value=p.rate??myTeacher()?.rate??"";$("#apNote").value="";$("#apStatus").textContent="";$("#applyDialog").showModal()}
$("#applyForm").addEventListener("submit",async e=>{e.preventDefault();const p=applyTarget;if(!p)return;const note=$("#apNote").value.trim();const rate=$("#apRate").value===""?null:Number($("#apRate").value);
  if(!note){$("#apStatus").textContent="Add a short message to the school.";return}
  $("#apSend").disabled=true;
  try{await must(sb.from("applications").insert({vacancy_id:p.id,rate,note}));
    await sendMsg(p.schoolId,`Applied${rate?` at £${rate} a day`:""}.\n\n${note}`,p.title);
    $("#applyDialog").close();toast("Application sent");refresh("applications")}
  catch(err){$("#apStatus").textContent=errMsg(err)}finally{$("#apSend").disabled=false}});
async function acceptOffer(appId){const a=S.apps.find(x=>x.id===appId);if(!a)return;const p=S.vacancies.find(x=>x.id===a.vacancyId);
  try{await must(sb.rpc("set_application_status",{app_id:appId,new_status:"accepted"}));await sendMsg(p.schoolId,"I've accepted your offer. Can we confirm the start time and how I'll be paid?",p.title);toast("Offer accepted");refresh("applications")}catch(err){toast(errMsg(err))}}

let applicantsFor=null;
function openApplicants(pid){applicantsFor=pid;renderApplicants();$("#applicantsDialog").showModal()}
function renderApplicants(){const pid=applicantsFor;if(!pid)return;const p=S.vacancies.find(x=>x.id===pid);if(!p)return;const apps=appsForPost(pid);
  $("#applicantsBody").innerHTML=`<div class="dlg-head"><div><div class="eyebrow">Applicants</div><h2>${esc(p.title)}</h2></div><button class="x" data-close="applicantsDialog" aria-label="Close">✕</button></div>
  ${apps.length?apps.map(a=>{const t=S.teachers.find(x=>x.id===a.teacherId)||{name:"Teacher",id:a.teacherId};const[c,l]=a.status==="accepted"?["b-free","Accepted your offer"]:a.status==="offered"?["b-hi","Offer sent"]:a.status==="declined"?["b-off","Declined"]:["b-off","New"];const v=vOf(a.teacherId)?.status==="verified";
    return`<div class="req" style="box-shadow:none"><div class="req-top"><div style="display:flex;gap:10px;align-items:center;min-width:0">${avatar(a.teacherId,t.name,"sm")}<div style="min-width:0"><h3>${esc(t.name)}</h3><span class="small muted">${v?"✓ Verified":"Not yet verified"} · ${esc(place(t))}</span></div></div><span class="badge ${c}">${l}</span></div>
      <dl class="kv"><dt>Day rate</dt><dd>${a.rate?`£${esc(a.rate)}`:"To agree"}</dd><dt>Message</dt><dd>${esc(a.note)}</dd></dl>
      <div class="row-actions">${S.teachers.some(x=>x.id===a.teacherId)?`<button class="btn secondary sm" data-profile3="${esc(a.teacherId)}">Profile and contact</button>`:""}<button class="btn secondary sm" data-message="${esc(a.teacherId)}">Message</button>${a.status==="applied"||a.status==="declined"?`<button class="btn sm" data-decide="offered" data-app="${esc(a.id)}" data-tid="${esc(a.teacherId)}">Offer role</button>`:""}${a.status==="applied"||a.status==="offered"?`<button class="btn link" data-decide="declined" data-app="${esc(a.id)}" data-tid="${esc(a.teacherId)}">Decline</button>`:""}${a.status==="accepted"&&p.status!=="filled"?`<button class="btn sm" data-filled="${esc(pid)}">Mark vacancy filled</button>`:""}</div></div>`}).join(""):`<p class="muted">No applications yet. They'll appear here as teachers apply.</p>`}`}
$("#applicantsDialog").addEventListener("click",async e=>{
  const pr=e.target.closest("[data-profile3]");if(pr){$("#applicantsDialog").close();openProfile(pr.dataset.profile3);return}
  const dc=e.target.closest("[data-decide]");if(dc){const st=dc.dataset.decide;const p=S.vacancies.find(x=>x.id===applicantsFor);
    try{await must(sb.rpc("set_application_status",{app_id:dc.dataset.app,new_status:st}));
      await sendMsg(dc.dataset.tid,st==="offered"?"We'd like to offer you this role. Accept the offer on the Vacancies page and we'll confirm the details here.":"Thanks for applying. We've gone with another teacher this time.",p?.title);
      toast(st==="offered"?"Offer sent":"Applicant declined");await refresh("applications");renderApplicants()}catch(err){toast(errMsg(err))}return}
  const fl=e.target.closest("[data-filled]");if(fl){try{const row=await must(sb.from("vacancies").update({status:"filled"}).eq("id",fl.dataset.filled).select().single());upsertVac(row);toast("Vacancy marked filled");renderApplicants();renderAll()}catch(err){toast(errMsg(err))}}});

/* ---------- messages ---------- */
async function sendMsg(to,text,ref){if(!String(text).trim())return;const row=await must(sb.from("messages").insert({recipient_id:to,body:String(text).trim().slice(0,2000),ref:ref||null}).select().single());S.msgs.push(mapMsg(row))}
function conversations(){const me=S.me;if(!me)return[];const map={};
  for(const m of S.msgs){const other=m.from===me?m.to:m.from;(map[other]=map[other]||[]).push(m)}
  return Object.entries(map).map(([id,list])=>{list.sort((a,b)=>a.at-b.at);const last=list[list.length-1];return{id,list,last,unread:list.filter(m=>m.to===me&&!m.readAt).length}}).sort((a,b)=>b.last.at-a.last.at)}
function canMessage(id){if(!S.me)return false;if(S.isAdmin)return true;if(S.msgs.some(m=>m.from===id&&m.to===S.me))return true;if(mySchool())return schoolOk(S.me)&&!isSchoolId(id);if(myTeacher())return isSchoolId(id);return false}
function renderInbox(){
  document.querySelectorAll("[data-itab]").forEach(b=>b.setAttribute("aria-selected",b.dataset.itab===S.inboxTab));
  $("#inboxMessages").hidden=S.inboxTab!=="messages";$("#inboxBookings").hidden=S.inboxTab!=="bookings";
  const convs=conversations();if(S.activeChat&&!convs.find(c=>c.id===S.activeChat))convs.unshift({id:S.activeChat,list:[],last:{at:0,text:""},unread:0});
  if(!$("#view-inbox").hidden&&S.inboxTab==="messages"&&S.activeChat){const c=convs.find(x=>x.id===S.activeChat);if(c&&c.unread){c.unread=0;c.list.forEach(m=>{if(m.to===S.me&&!m.readAt)m.readAt=new Date().toISOString()});sb.rpc("mark_read",{other:c.id})}}
  const unread=convs.reduce((a,c)=>a+c.unread,0);
  const mc=$("#msgCount");mc.hidden=!unread;mc.textContent=unread;
  const tot=unread+(S.pendingBook||0);const rc=$("#reqCount");rc.hidden=!tot;rc.textContent=tot;
  if(!S.loaded)return;
  if(!S.me){$("#convos").innerHTML=`<div style="padding:16px" class="small muted">Sign in to see your messages.</div>`;$("#threadHead").innerHTML=`<a class="btn" href="#account">Sign in</a>`;$("#threadMsgs").innerHTML="";$("#composer").hidden=true;return}
  $("#convos").innerHTML=convs.length?convs.map(c=>`<button class="convo" data-chat="${esc(c.id)}" aria-current="${c.id===S.activeChat}">${avatar(c.id,nameOf(c.id),"sm")}<span class="meta"><b>${esc(nameOf(c.id))}</b><span class="last">${esc(c.last.text||"New conversation")}</span></span>${c.unread?`<span class="count">${c.unread}</span>`:`<span class="small muted">${c.list.length?esc(timeAgo(c.last.at)):""}</span>`}</button>`).join(""):`<div style="padding:16px" class="small muted">No conversations yet. ${mySchool()?"Message a teacher from their profile or from your applicants.":myTeacher()?"Message a school from any vacancy.":"Set up your account to start messaging."}</div>`;
  $("#chat").classList.toggle("open",!!S.activeChat);
  const c=convs.find(x=>x.id===S.activeChat);
  if(!c){$("#threadHead").innerHTML=`<span class="muted small">Choose a conversation</span>`;$("#threadMsgs").innerHTML="";$("#composer").hidden=true;return}
  const other=c.id;const verified=isSchoolId(other)?schoolOk(other):vOf(other)?.status==="verified";
  $("#threadHead").innerHTML=`<button class="btn secondary sm back-btn" data-chatback>‹ Back</button>${avatar(other,nameOf(other),"sm")}<div style="min-width:0"><b>${esc(nameOf(other))}</b><div class="small muted">${isSchoolId(other)?"School":"Supply teacher"}${verified?" · ✓ Verified":""}</div></div>${!isSchoolId(other)&&canContact()&&S.teachers.some(t=>t.id===other)?`<button class="btn link" style="margin-left:auto" data-profile2="${esc(other)}">Profile</button>`:""}`;
  const box=$("#threadMsgs");const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<40;
  box.innerHTML=c.list.length?c.list.map(m=>`<div class="bubble ${m.from===S.me?"me":"them"}">${m.ref?`<span class="ref">Re: ${esc(m.ref)}</span>`:""}${esc(m.text)}<time>${esc(timeAgo(m.at))}</time></div>`).join(""):`<p class="small muted" style="margin:auto;text-align:center">Start the conversation with ${esc(nameOf(other))}.</p>`;
  if(atBottom||box.dataset.chat!==other){box.scrollTop=box.scrollHeight;box.dataset.chat=other}
  $("#composer").hidden=!canMessage(other)}
document.querySelector("#view-inbox .seg").addEventListener("click",e=>{const b=e.target.closest("[data-itab]");if(b){S.inboxTab=b.dataset.itab;renderInbox()}});
$("#convos").addEventListener("click",e=>{const b=e.target.closest("[data-chat]");if(b){S.activeChat=b.dataset.chat;renderInbox();$("#msgText").focus()}});
$("#threadHead").addEventListener("click",e=>{if(e.target.closest("[data-chatback]")){S.activeChat=null;renderInbox()}});
$("#composer").addEventListener("submit",async e=>{e.preventDefault();const txt=$("#msgText").value;if(!txt.trim()||!S.activeChat)return;$("#msgSend").disabled=true;
  try{await sendMsg(S.activeChat,txt);$("#msgText").value="";renderInbox()}catch(err){toast(errMsg(err))}finally{$("#msgSend").disabled=false}});
$("#msgText").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit()}});
function openChat(id){if(!canMessage(id)){toast(!S.me?"Sign in to send messages.":mySchool()?"Your school needs to be verified before you can message teachers.":"Set up your account to send messages.");return}
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());S.activeChat=id;S.inboxTab="messages";if(location.hash!=="#inbox")location.hash="#inbox";else{route();renderInbox()}setTimeout(()=>$("#msgText").focus(),60)}

/* ---------- booking list ---------- */
function sortReq(a,b){const o={pending:0,accepted:1,declined:2,cancelled:3};return(o[a.status]-o[b.status])||(b.createdAt-a.createdAt)}
function reqHtml(r,side){
  const t=S.teachers.find(x=>x.id===r.teacherId);const sc=S.schools[r.schoolId];
  const label={pending:"Awaiting reply",accepted:"Accepted",declined:"Declined",cancelled:"Cancelled"}[r.status]||r.status;
  const acts=[];
  if(side==="in"&&r.status==="pending")acts.push(`<button class="btn" data-act="accept" data-id="${esc(r.id)}">Accept</button>`,`<button class="btn secondary" data-act="decline" data-id="${esc(r.id)}">Decline</button>`);
  if(side==="out"&&(r.status==="pending"||r.status==="accepted"))acts.push(`<button class="btn secondary" data-act="cancel" data-id="${esc(r.id)}">Cancel request</button>`);
  if(side==="out"&&t)acts.push(`<button class="btn link" data-profile2="${esc(t.id)}">Teacher's contact details</button>`);
  acts.push(`<button class="btn link" data-message="${esc(side==="in"?r.schoolId:r.teacherId)}">Message</button>`);
  const who=side==="in"?`${esc(sc?.name||"School")} ${schoolOk(r.schoolId)?`<span class="badge b-free">✓ Verified school</span>`:""}`:esc(t?.name||"Teacher");
  return`<article class="req">
    <div class="req-top"><h3>${who}</h3><span class="badge st-${esc(r.status)}">${esc(label)}</span></div>
    <div class="dates">${r.dates.map(d=>`<span>${esc(fmt(d))}</span>`).join("")}</div>
    <dl class="kv">${r.role?`<dt>Cover</dt><dd>${esc(r.role)}</dd>`:""}${r.notes?`<dt>Notes</dt><dd>${esc(r.notes)}</dd>`:""}
      ${side==="in"&&sc?`<dt>Contact</dt><dd>${esc(sc.contactName)}, ${esc(sc.contactRole)}</dd><dt>Phone</dt><dd><span class="copyable"><code>${esc(sc.phone)}</code><button class="btn secondary sm" data-copy="${esc(sc.phone)}">Copy</button></span></dd><dt>Email</dt><dd><span class="copyable"><code>${esc(sc.email)}</code><button class="btn secondary sm" data-copy="${esc(sc.email)}">Copy</button></span></dd>`:""}</dl>
    ${r.reply?`<p class="reply">${side==="in"?"Your reply: ":"Reply: "}${esc(r.reply)}</p>`:""}
    <div class="row-actions">${acts.join("")}</div>
  </article>`}
function renderBookings(){
  const t=myTeacher(),sc=mySchool();
  const inc=S.me?S.bookings.filter(r=>r.teacherId===S.me).sort(sortReq):[];
  const out=S.me?S.bookings.filter(r=>r.schoolId===S.me).sort(sortReq):[];
  const pending=inc.filter(r=>r.status==="pending").length;S.pendingBook=pending;const c=$("#bookCount");c.hidden=!pending;c.textContent=pending;
  const el=$("#bookingsList");
  if(!S.loaded){el.innerHTML=`<p class="muted">Loading…</p>`;return}
  if(t){$("#bookingsSub").textContent="Requests from schools. Accept or decline each one.";
    el.innerHTML=inc.length?inc.map(r=>reqHtml(r,"in")).join(""):`<div class="empty"><h3>No requests yet</h3><p>When a school asks you to cover, it shows up here with the dates, the class and the school's contact details.</p></div>`;return}
  if(sc){$("#bookingsSub").textContent="Cover you've requested and the teachers' replies.";
    el.innerHTML=out.length?out.map(r=>reqHtml(r,"out")).join(""):`<div class="empty"><h3>No requests sent</h3><p>Find a teacher who's free and send them a booking request.</p><a class="btn" href="#find">Find teachers</a></div>`;return}
  $("#bookingsSub").textContent="Your booking requests.";
  el.innerHTML=`<div class="empty"><h3>${S.me?"Set up your account to make bookings":"Sign in to see bookings"}</h3><p>Schools send booking requests here and teachers reply.</p><a class="btn" href="#account">${S.me?"Set up account":"Sign in"}</a></div>`}

let replyTarget=null;
document.addEventListener("click",async e=>{
  const cp=e.target.closest("[data-copy]");
  if(cp){try{await navigator.clipboard.writeText(cp.dataset.copy);toast("Copied")}catch(_){toast("Couldn't copy. Select the text and copy it instead.")}return}
  const m=e.target.closest("[data-message]");if(m){e.preventDefault();openChat(m.dataset.message);return}
  const g=e.target.closest("[data-gotab]");if(g){S.tTab=g.dataset.gotab;S.dirty=false}
  const pv=e.target.closest("[data-profile2]");if(pv){openProfile(pv.dataset.profile2);return}
  const b=e.target.closest("[data-act]");if(!b)return;const id=b.dataset.id,act=b.dataset.act;
  if(act==="cancel"){try{await must(sb.rpc("set_booking_status",{booking_id:id,new_status:"cancelled"}));toast("Request cancelled");refresh("bookings")}catch(err){toast(errMsg(err))}return}
  replyTarget={id,act};const r=S.bookings.find(x=>x.id===id);
  $("#replyTitle").textContent=(act==="accept"?"Accept booking from ":"Decline request from ")+(S.schools[r?.schoolId]?.name||"school");
  $("#replySend").textContent=act==="accept"?"Accept booking":"Decline";
  $("#replyMsg").placeholder=act==="accept"?"e.g. See you at 8:15.":"e.g. Sorry, I'm already booked that day.";
  $("#replyMsg").value="";$("#replyDialog").showModal()});
$("#replyForm").addEventListener("submit",async e=>{
  e.preventDefault();const t=replyTarget;if(!t)return;const r=S.bookings.find(x=>x.id===t.id);
  $("#replySend").disabled=true;
  try{await must(sb.rpc("set_booking_status",{booking_id:t.id,new_status:t.act==="accept"?"accepted":"declined",reply_text:$("#replyMsg").value.trim()||null}));
    if(t.act==="accept"&&r){const me=myTeacher();if(me){const blocked=[...new Set([...(me.blocked||[]),...r.dates])];const row=await must(sb.from("teachers").update({blocked}).eq("id",S.me).select().single());const i=S.teachers.findIndex(x=>x.id===S.me);S.teachers[i]=mapTeacher(row)}}
    $("#replyDialog").close();toast(t.act==="accept"?"Booking accepted and those days are now blocked out":"Request declined");refresh("bookings")}
  catch(err){toast(errMsg(err))}finally{$("#replySend").disabled=false}});

/* ---------- admin ---------- */
document.querySelector("#view-admin .seg").addEventListener("click",e=>{const b=e.target.closest("[data-atab]");if(b){S.aTab=b.dataset.atab;renderAdmin()}});
function addPeriod(fromIso,plan){const base=fromIso&&fromIso>=todayIso?parse(fromIso):parse(todayIso);if(plan==="yearly")base.setFullYear(base.getFullYear()+1);else base.setMonth(base.getMonth()+1);return iso(base)}
function adminCounts(){const pendS=Object.keys(S.schools).filter(id=>!vOf(id)).length;const pendT=S.teachers.filter(t=>S.checks[t.id]&&!vOf(t.id)).length;
  const ac=$("#adminCount");ac.hidden=!(pendS+pendT);ac.textContent=pendS+pendT;
  [["#aSchoolsCount",pendS],["#aTeachersCount",pendT]].forEach(([s,n])=>{$(s).hidden=!n;$(s).textContent=n});return[pendS,pendT]}
const vBadge=id=>{const v=vOf(id);return v?.status==="verified"?`<span class="badge b-free"><span class="dot"></span>Verified</span>`:v?.status==="rejected"?`<span class="badge b-booked">Rejected</span>`:`<span class="badge b-hi">To verify</span>`};
function renderAdmin(){
  if(!S.isAdmin)return;
  const[pendS,pendT]=adminCounts();const live=S.teachers.filter(t=>isLive(t.id));
  const mrr=live.reduce((a,t)=>a+(S.subs[t.id]?.plan==="yearly"?199/12:20),0);
  $("#stats").innerHTML=[["Schools to verify",pendS],["Teachers to verify",pendT],["Live teachers",live.length],["Monthly income","£"+mrr.toFixed(0)]].map(([k,v])=>`<div class="stat"><span class="eyebrow">${k}</span><b>${v}</b></div>`).join("");
  document.querySelectorAll("[data-atab]").forEach(b=>b.setAttribute("aria-selected",b.dataset.atab===S.aTab));
  const el=$("#adminBody");
  if(S.aTab==="schools"){
    const list=Object.values(S.schools).sort((a,b)=>(!!vOf(a.id))-(!!vOf(b.id))||(Date.parse(b.createdAt)-Date.parse(a.createdAt)));
    el.innerHTML=`<div class="howto"><b>How to verify a school</b><ol><li>Find the school on its nation's official register: Get Information about Schools for England (the URN opens it), or the Welsh Government, Scottish Government or Department of Education (NI) school lists. Check the name, town and postcode match and that it's open.</li><li>Ring the school office on the number shown on the official record, not the number they gave you, and ask them to confirm the person and their role.</li><li>Check the email address uses the school's own domain.</li></ol></div><div class="list" style="margin-top:12px">${list.length?list.map(adminSchool).join(""):`<div class="empty"><p>No school accounts yet.</p></div>`}</div>`}
  if(S.aTab==="teachers"){
    const list=S.teachers.slice().sort((a,b)=>((S.checks[b.id]&&!vOf(b.id)?1:0)-(S.checks[a.id]&&!vOf(a.id)?1:0))||(a.name||"").localeCompare(b.name||""));
    el.innerHTML=`<div class="howto"><b>How to verify a teacher</b><ol><li>On a video call or in person, check their passport or driving licence and right to work. See their original criminal record certificate in person.</li><li>Check their registration. England: <a href="${LINKS.trn}" target="_blank" rel="noopener">Check a teacher's record</a> (needs DfE Sign-in). Wales: the EWC register. Scotland: the GTC Scotland register. Northern Ireland: the GTCNI register.</li><li>Check their criminal record check. England and Wales: a free <a href="${LINKS.dbs}" target="_blank" rel="noopener">DBS Update Service status check</a>. Scotland: PVG membership through Disclosure Scotland. Northern Ireland: their Enhanced AccessNI certificate.</li><li>Email both referees and wait for replies.</li></ol></div><div class="list" style="margin-top:12px">${list.length?list.map(adminTeacher).join(""):`<div class="empty"><p>No teacher accounts yet.</p></div>`}</div>`}
  if(S.aTab==="payments"){
    el.innerHTML=`<div class="panel"><div><h2>Payments</h2><p class="sub">Teachers pay through Stripe. When a payment goes through, their plan turns on automatically, and it turns off if they cancel or a payment fails. See payments, refunds and payouts in your Stripe dashboard.</p></div><p class="small muted">Use “Mark paid” on the Teachers tab only for free trials or anyone who paid another way.</p></div>`}}
function adminSchool(s){const v=vOf(s.id);
  return`<article class="req"><div class="req-top"><h3>${esc(s.name)}</h3>${vBadge(s.id)}</div>
    <dl class="kv"><dt>${esc(NATION[nationOf(s.region)].school)}</dt><dd>${nationOf(s.region)==="England"?`<a href="${LINKS.gias(s.urn)}" target="_blank" rel="noopener" class="mono">${esc(s.urn)}</a> <span class="small muted">opens the DfE record</span>`:`<span class="mono">${esc(s.urn)}</span>`}</dd>
      <dt>Location</dt><dd>${esc([s.town,s.postcode,s.region].filter(Boolean).join(", "))}</dd>
      <dt>Contact</dt><dd>${esc(s.contactName)}, ${esc(s.contactRole)}</dd>
      <dt>Email</dt><dd class="mono">${esc(s.email)}</dd><dt>Phone given</dt><dd class="mono">${esc(s.phone)}</dd>
      ${v?.note?`<dt>Note</dt><dd>${esc(v.note)}</dd>`:""}</dl>
    <div class="row-actions">${v?.status!=="verified"?`<button class="btn" data-vs="${esc(s.id)}" data-st="verified">Mark verified</button>`:""}${v?.status!=="rejected"?`<button class="btn secondary" data-vs="${esc(s.id)}" data-st="rejected">Reject</button>`:""}${v?`<button class="btn link" data-vs="${esc(s.id)}" data-st="reset">Reset</button>`:""}</div></article>`}
function adminTeacher(t){const c=S.checks[t.id];const v=vOf(t.id);const s=S.subs[t.id]||{};const lv=isLive(t.id);const plan=t.plan==="yearly"?"yearly":"monthly";
  return`<article class="req"><div class="req-top"><div style="display:flex;gap:10px;align-items:center;min-width:0">${avatar(t.id,t.name,"sm")}<h3>${esc(t.name||"Unnamed")}</h3></div><div class="row-actions">${c?vBadge(t.id):`<span class="badge b-off">Checks not submitted</span>`} ${lv?`<span class="badge b-free">Live to ${esc(fmt(s.paidUntil))}</span>`:`<span class="badge b-booked">${s.paidUntil?"Expired":"Unpaid"}</span>`}</div></div>
    <dl class="kv"><dt>Based in</dt><dd>${esc(place(t))}</dd>
      ${c?`<dt>Registered in</dt><dd>${esc(c.nation||"England")}</dd><dt>Date of birth</dt><dd>${esc(fmtFull(c.dob))}</dd><dt>Certificate surname</dt><dd>${esc(c.surname)}</dd><dt>${esc(NATION[c.nation||"England"].reg)}</dt><dd class="mono">${esc(c.trn)}</dd><dt>${esc(NATION[c.nation||"England"].crim)}</dt><dd class="mono">${esc(c.dbsNumber)}</dd>
      ${(c.referees||[]).map((r,i)=>`<dt>Referee ${i+1}</dt><dd>${esc(r.name)}, ${esc(r.school)} · <span class="mono">${esc(r.email)}</span></dd>`).join("")}`:""}
      <dt>Plan</dt><dd>${esc(PLAN[plan].label)} (${esc(PLAN[plan].price)})${s.stripe?" · Stripe":""}</dd></dl>
    ${c?`<div class="f"><span class="lab">Checks passed</span><div class="checks" data-items="${esc(t.id)}">${CHECKS.map(([k,l])=>`<label><input type="checkbox" value="${k}" ${v?.items?.[k]?"checked":""}> ${esc(l)}</label>`).join("")}</div></div>`:""}
    <div class="row-actions"><button class="btn secondary sm" data-admincontact="${esc(t.id)}">Show contact</button>${c?`<button class="btn" data-vt="${esc(t.id)}" data-st="verified">Save as verified</button><button class="btn secondary" data-vt="${esc(t.id)}" data-st="rejected">Reject</button>`:""}<button class="btn ${c?"secondary":""}" data-paid="${esc(t.id)}" data-plan="${plan}">Mark ${plan==="yearly"?"year":"month"} paid</button>${lv&&!s.stripe?`<button class="btn link" data-unpaid="${esc(t.id)}">End plan</button>`:""}</div></article>`}
$("#adminBody").addEventListener("click",async e=>{
  const ac=e.target.closest("[data-admincontact]");if(ac){const c=await getContact(ac.dataset.admincontact);toast(c?`${c.phone} · ${c.email}`:"No contact details yet");return}
  const b=e.target.closest("[data-vs],[data-vt],[data-paid],[data-unpaid]");if(!b)return;b.disabled=true;
  try{
    if(b.dataset.vs){const id=b.dataset.vs,st=b.dataset.st;
      if(st==="reset"){await must(sb.from("verifications").delete().eq("user_id",id));delete S.verified[id];toast("Reset to pending")}
      else{const row={user_id:id,kind:"school",status:st,items:{},note:st==="rejected"?"We couldn't confirm your school's details. Check your school reference number and use your school email, then save again.":null,checked_at:new Date().toISOString()};await must(sb.from("verifications").upsert(row));S.verified[id]={status:st,items:{},note:row.note,checkedAt:row.checked_at,kind:"school"};toast(st==="verified"?"School verified":"School rejected")}}
    else if(b.dataset.vt){const id=b.dataset.vt,st=b.dataset.st;const items={};document.querySelectorAll(`[data-items="${CSS.escape(id)}"] input`).forEach(i=>items[i.value]=i.checked);
      if(st==="verified"&&!Object.values(items).some(Boolean)){toast("Tick the checks that passed first");b.disabled=false;return}
      const row={user_id:id,kind:"teacher",status:st,items,note:st==="rejected"?"We couldn't complete your checks. Check your details or contact us.":null,checked_at:new Date().toISOString()};await must(sb.from("verifications").upsert(row));S.verified[id]={status:st,items,note:row.note,checkedAt:row.checked_at,kind:"teacher"};toast(st==="verified"?"Teacher verified":"Teacher rejected")}
    else{const id=b.dataset.paid||b.dataset.unpaid;const cur=S.subs[id]||{};
      const row=b.dataset.paid?{user_id:id,plan:b.dataset.plan,status:"manual",paid_until:addPeriod(cur.paidUntil,b.dataset.plan),updated_at:new Date().toISOString()}:{user_id:id,plan:cur.plan||"monthly",status:"ended",paid_until:iso(new Date(Date.now()-864e5)),updated_at:new Date().toISOString()};
      await must(sb.from("subscriptions").upsert(row));S.subs[id]={plan:row.plan,status:row.status,paidUntil:row.paid_until,stripe:false};toast(b.dataset.paid?"Live until "+fmt(row.paid_until):"Plan ended")}
    renderAll()}
  catch(err){toast(errMsg(err));b.disabled=false}});

/* ---------- render ---------- */
function renderAll(){renderFind();renderBookings();renderVacancies();renderInbox();if(S.isAdmin)adminCounts();if(!formFocused()){if(!S.dirty)renderAccount();renderAdmin()}}
renderAll();

/* ---------- auth + start ---------- */
async function onSession(session){
  const prev=S.me;S.session=session;S.me=session?.user?.id||null;
  if(S.me!==prev){S.role=null;S.tTab="profile";S.contacts={};S.regionInit=false;S.vregionInit=false;S.activeChat=null}
  S.isAdmin=false;
  if(S.me){const r=await sb.rpc("am_i_admin");S.isAdmin=!!r.data}
  $("#adminLink").hidden=!S.isAdmin;route();
  await loadAll();subscribeRealtime();
}
sb.auth.onAuthStateChange((event,session)=>{
  if(event==="PASSWORD_RECOVERY"){S.recovery=true;location.hash="#account"}
  if(event==="SIGNED_IN"||event==="SIGNED_OUT"||event==="INITIAL_SESSION"||event==="USER_UPDATED"){setTimeout(()=>onSession(session),0)}
});
const params=new URLSearchParams(location.search);
if(params.get("checkout")==="success"){toast("Payment received. Your plan will switch on in a moment.");history.replaceState(null,"",location.pathname+"#account");setTimeout(async()=>{await loadAll()},4000);setTimeout(async()=>{await loadAll()},10000)}
if(params.get("checkout")==="cancelled"){toast("Checkout cancelled. You haven't been charged.");history.replaceState(null,"",location.pathname+"#account")}
})();
