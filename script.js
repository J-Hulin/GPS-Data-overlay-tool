// ── State ─────────────────────────────────────────────────────────────────────
var rawPoints=[], speedData=[], hrData=[], gradeData=[], distData=[], totalDistM=0, currentFilename='';
var btnIds=['btnSetting','btnRouteSetting','btnElevSetting','btnHRSetting','btnInclineSetting','btnMileSetting'];
var syncCalcResult={offset:null,drift:null};
 
// ── Defaults for reset ────────────────────────────────────────────────────────
var DEF_VIDEO={fps:'29.97',unit:'mph',smooth:'3',offset:'0',driftFactor:'1.0'};
var DEF_ROUTE={trackW:'4',dotR:'8',shadowOffset:'5',trackColor:'#ff6600',dotColor:'#fca300',shadowColor:'#000000'};
var DEF_GAUGE={gaugeBgColor:'#000000',gaugeRingColor:'#ffffff',gaugeArcColor:'#aa0000',gaugeNumberColor:'#ffffff',gaugeUnitColor:'#6d6d7e'};
var DEF_ELEV={elevW:'1920',elevH:'300',elevLineW:'2',elevColor:'#38bdf8',elevFill:'1',elevFillColor:'#ffffff',elevDotColor:'#38bdf8',elevShadowColor:'#000000',elevShadowOffset:'4'};
 
function applyDefaults(defs){ Object.keys(defs).forEach(function(id){var el=document.getElementById(id);if(el)el.value=defs[id];}); }
 
// ── Theme ─────────────────────────────────────────────────────────────────────
var themeBtn=document.getElementById('btnTheme');
themeBtn.addEventListener('click',function(){
  document.body.classList.toggle('light');
  themeBtn.textContent=document.body.classList.contains('light')?'🌙 Dark':'☀️ Light';
});
 
// ── How to use collapse ───────────────────────────────────────────────────────
document.getElementById('howHeader').addEventListener('click',function(){
  var body=document.getElementById('howToBody'), arrow=document.getElementById('howArrow');
  var open=body.style.display==='block';
  body.style.display=open?'none':'block';
  arrow.classList.toggle('open',!open);
});

// ── Sync info collapse ────────────────────────────────────────────────────────
document.getElementById('syncInfoHeader').addEventListener('click',function(){
  var body=document.getElementById('syncInfoBody'), arrow=document.getElementById('syncInfoArrow');
  var open=body.style.display==='block';
  body.style.display=open?'none':'block';
  arrow.classList.toggle('open',!open);
});
 
// ── Copy duration ─────────────────────────────────────────────────────────────
document.getElementById('copyDur').addEventListener('click',function(){
  var dur=document.getElementById('statDur').textContent;
  if(!navigator.clipboard){return;}
  navigator.clipboard.writeText(dur).then(function(){
    var btn=document.getElementById('copyDur');
    btn.textContent='copied!'; btn.style.color='var(--success)';
    setTimeout(function(){btn.textContent='copy';btn.style.color='';},1600);
  });
});
 
// ── Sync helper modal ─────────────────────────────────────────────────────────
document.getElementById('btnSyncHelper').addEventListener('click',function(){document.getElementById('syncModal').classList.add('open');});
document.getElementById('syncClose').addEventListener('click',function(){document.getElementById('syncModal').classList.remove('open');});
document.getElementById('syncModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});

document.getElementById('btnSupport').addEventListener('click',function(){document.getElementById('supportModal').classList.add('open');});
document.getElementById('supportClose').addEventListener('click',function(){document.getElementById('supportModal').classList.remove('open');});
document.getElementById('supportModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});

// ── Report a Problem ────────────────────────────────────────────────────────
// Posted to a small Cloudflare Worker (worker.js), which relays the report to
// Resend (resend.com) as an email, attachment included. No third-party form
// SaaS, and no email address exposed in this file — the Worker is the only
// endpoint, and it holds the real destination address and the Resend API key
// (as a Worker secret, never in client code).
var REPORT_WORKER_ENDPOINT='https://gpx-report-relay.jhulin10.workers.dev';

function openReportModal(){
  document.getElementById('reportModal').classList.add('open');
  document.getElementById('reportStatus').textContent='';
  document.getElementById('reportStatus').className='report-status';
}
function closeReportModal(){ document.getElementById('reportModal').classList.remove('open'); }
document.getElementById('btnReportProblem').addEventListener('click',openReportModal);
document.getElementById('reportLinkBottom').addEventListener('click',function(e){ e.preventDefault(); openReportModal(); });
document.getElementById('reportClose').addEventListener('click',closeReportModal);
document.getElementById('reportModal').addEventListener('click',function(e){if(e.target===this)closeReportModal();});

document.getElementById('reportForm').addEventListener('submit',function(e){
  e.preventDefault();
  var statusEl=document.getElementById('reportStatus');
  var submitBtn=document.getElementById('reportSubmit');
  var fileInput=document.getElementById('reportFile');
  var hasFile=fileInput.files.length>0;

  if(hasFile){
    var fname=fileInput.files[0].name.toLowerCase();
    if(!/\.(fit|gpx)$/.test(fname)){
      statusEl.textContent='Attachment must be a .fit or .gpx file.';
      statusEl.className='report-status err';
      return;
    }
  }
  if(REPORT_WORKER_ENDPOINT.indexOf('YOUR-WORKER-SUBDOMAIN')!==-1){
    statusEl.textContent='Report relay isn\'t deployed yet — see the REPORT_WORKER_ENDPOINT comment in the source.';
    statusEl.className='report-status err';
    return;
  }

  var fd=new FormData();
  fd.append('email', document.getElementById('reportEmail').value.trim());
  fd.append('fileWorkedWith', document.getElementById('reportFileName').value.trim());
  fd.append('description', document.getElementById('reportDescription').value.trim());
  if(hasFile) fd.append('file', fileInput.files[0]);

  submitBtn.disabled=true; submitBtn.textContent='Sending…';
  statusEl.textContent=''; statusEl.className='report-status';

  fetch(REPORT_WORKER_ENDPOINT,{method:'POST',body:fd})
    .then(function(res){ return res.json().then(function(data){ return {res:res,data:data}; }); })
    .then(function(r){
      if(r.res.ok && r.data.ok){
        statusEl.textContent='✓ Sent — thanks, I\'ll take a look!';
        statusEl.className='report-status ok';
        document.getElementById('reportForm').reset();
        setTimeout(closeReportModal,2200);
      } else {
        throw new Error((r.data && r.data.error) || 'Send failed');
      }
    })
    .catch(function(err){
      statusEl.textContent='Couldn\'t send — '+err.message+'. Try again, or email directly.';
      statusEl.className='report-status err';
    })
    .finally(function(){
      submitBtn.disabled=false; submitBtn.textContent='Send report';
    });
});

document.getElementById('zelleToggle').addEventListener('click',function(){
  var open=document.getElementById('zellePanel').classList.toggle('open');
  this.classList.toggle('open',open);
});
document.getElementById('btnSupportProject').addEventListener('click',function(){
  // Close our modal, then hand off to the official Buy Me a Coffee widget button
  // (injected by the widget.prod.min.js script tag near the end of <body>).
  document.getElementById('supportModal').classList.remove('open');
  setTimeout(function(){
    var bmcBtn=document.getElementById('bmc-wbtn');
    if(bmcBtn){ bmcBtn.click(); }
    else { window.open('https://buymeacoffee.com/josiahh1025','_blank','noopener'); }
  },150);
});
 
// Auto-format timecode inputs as user types
['sv1','sg1','sv2','sg2'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){
    var v=this.value.replace(/[^0-9]/g,'');
    var out='';
    for(var i=0;i<v.length&&i<8;i++){
      if(i===2||i===4||i===6) out+=':';
      out+=v[i];
    }
    this.value=out;
  });
});
 
function tcToSec(tc,fps){
  // Parse HH:MM:SS:FF — also accept bare seconds like "8" or "8.5"
  if(!tc||tc.trim()==='')return NaN;
  var parts=tc.trim().split(':');
  if(parts.length===1){var n=parseFloat(parts[0]);return isNaN(n)?NaN:n;}
  if(parts.length===4){
    var h=parseInt(parts[0])||0,m=parseInt(parts[1])||0,s=parseInt(parts[2])||0,f=parseInt(parts[3])||0;
    return h*3600+m*60+s+f/(fps||29.97);
  }
  if(parts.length===3){var h=parseInt(parts[0])||0,m=parseInt(parts[1])||0,s=parseFloat(parts[2])||0;return h*3600+m*60+s;}
  return NaN;
}
 
document.getElementById('syncCalc').addEventListener('click',function(){
  var fps=parseFloat(document.getElementById('fps').value)||29.97;
  var v1=tcToSec(document.getElementById('sv1').value,fps);
  var g1=tcToSec(document.getElementById('sg1').value,fps);
  var v2=tcToSec(document.getElementById('sv2').value,fps);
  var g2=tcToSec(document.getElementById('sg2').value,fps);
  var res=document.getElementById('syncResult');
  var applyBtn=document.getElementById('syncApply');
  if(isNaN(v1)||isNaN(g1)){res.textContent='Enter event 1 values';res.style.color='var(--danger)';applyBtn.disabled=true;return;}
  var offset=Math.round((v1-g1)*100)/100;
  var drift=1.0;
  if(!isNaN(v2)&&!isNaN(g2)&&g2!==g1){
    drift=Math.round(((v2-offset)/g2)*100000)/100000;
  }
  syncCalcResult={offset:offset,drift:drift};
  var msg='GPS Offset: '+offset+'s';
  if(!isNaN(v2)&&!isNaN(g2)&&g2!==g1) msg+='   Drift: '+drift;
  res.textContent=msg; res.style.color='var(--accent)';
  applyBtn.disabled=false;
});
 
document.getElementById('syncApply').addEventListener('click',function(){
  document.getElementById('offset').value=syncCalcResult.offset;
  document.getElementById('driftFactor').value=syncCalcResult.drift;
  document.getElementById('syncModal').classList.remove('open');
  if(rawPoints.length) reprocess();
  setStatus('Sync applied — offset: '+syncCalcResult.offset+'s, drift: '+syncCalcResult.drift,'ok');
});
 
// ── Reset buttons ─────────────────────────────────────────────────────────────
document.getElementById('resetVideo').addEventListener('click',function(){applyDefaults(DEF_VIDEO);if(rawPoints.length)reprocess();});
document.getElementById('resetRoute').addEventListener('click',function(){applyDefaults(DEF_ROUTE);});
document.getElementById('resetGauge').addEventListener('click',function(){applyDefaults(DEF_GAUGE);if(speedData.length)drawGauge();});
document.getElementById('resetHR').addEventListener('click',function(){
  document.getElementById('hrColor').value='#ef4444';
  document.getElementById('hrHeartColor').value='#ef4444';
  document.getElementById('hrSize').value='0.07';
  if(hrData.length) drawHR();
});
['hrColor','hrHeartColor'].forEach(function(id){
  var el=document.getElementById(id);
  if(el) el.addEventListener('input',function(){if(hrData.length) drawHR();});
});

document.getElementById('resetIncline').addEventListener('click',function(){
  document.getElementById('inclineNumberColor').value='#22c55e';
  document.getElementById('inclineWedgeColor').value='#22c55e';
  document.getElementById('inclineUnit').value='pct';
});

document.getElementById('resetMile').addEventListener('click',function(){
  document.getElementById('mileColor').value='#38bdf8';
  document.getElementById('mileLineDistColor').value='#111111';
  document.getElementById('mileDecimals').value='1';
});

document.getElementById('resetElev').addEventListener('click',function(){
  applyDefaults(DEF_ELEV);
});

// ── Elev smooth live preview ──────────────────────────────────────────────────
document.getElementById('elevLabels').addEventListener('change',function(){if(rawPoints.length) drawElev();});

// ── Settings save / load ──────────────────────────────────────────────────────
var SETTINGS_KEY='gpxOverlaySettings';
// Shadow width is no longer its own control — it's always Track width * this
// ratio (1.25 matches the old separate defaults of trackW=4 / shadowW=5).
var SHADOW_WIDTH_RATIO=1.25;
var SETTINGS_IDS=['fps','unit','smooth','offset','driftFactor','trackW','dotR','shadowOffset',
  'trackColor','dotColor','shadowColor',
  'gaugeBgColor','gaugeRingColor','gaugeArcColor','gaugeNumberColor','gaugeUnitColor',
  'elevW','elevH','elevLineW','elevColor',
  'elevFill','elevFillColor','elevDotColor','elevShadowColor','elevShadowOffset','hrColor','hrHeartColor','hrSize',
  'inclineNumberColor','inclineWedgeColor','inclineUnit','mileColor','mileLineDistColor','mileDecimals'];
var SETTINGS_CHECKS=[];

document.getElementById('btnSaveSettings').addEventListener('click',function(){
  var s={};
  SETTINGS_IDS.forEach(function(id){var el=document.getElementById(id);if(el)s[id]=el.value;});
  SETTINGS_CHECKS.forEach(function(id){var el=document.getElementById(id);if(el)s[id]=el.checked;});
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch(e){}
  var btn=this; btn.textContent='✓ Saved!'; btn.style.color='var(--success)';
  setTimeout(function(){btn.textContent='💾 Save';btn.style.color='';},1800);
});

document.getElementById('btnLoadSettings').addEventListener('click',function(){
  var raw; try{raw=localStorage.getItem(SETTINGS_KEY);}catch(e){}
  if(!raw){setStatus('No saved settings found','err');return;}
  var s; try{s=JSON.parse(raw);}catch(e){setStatus('Could not read saved settings','err');return;}
  SETTINGS_IDS.forEach(function(id){if(s[id]!==undefined){var el=document.getElementById(id);if(el)el.value=s[id];}});
  SETTINGS_CHECKS.forEach(function(id){if(s[id]!==undefined){var el=document.getElementById(id);if(el)el.checked=s[id];}});
  if(rawPoints.length) reprocess();
  setStatus('Settings loaded','ok');
});

// Auto-load settings on page start
(function(){
  var raw; try{raw=localStorage.getItem(SETTINGS_KEY);}catch(e){}
  if(!raw) return;
  var s; try{s=JSON.parse(raw);}catch(e){return;}
  SETTINGS_IDS.forEach(function(id){if(s[id]!==undefined){var el=document.getElementById(id);if(el)el.value=s[id];}});
  SETTINGS_CHECKS.forEach(function(id){if(s[id]!==undefined){var el=document.getElementById(id);if(el)el.checked=s[id];}});
})();
 
// ── Drop zone & file input ────────────────────────────────────────────────────
var dropZone=document.getElementById('dropZone');
var fileInput=document.getElementById('fileInput');
var statusEl=document.getElementById('status');
dropZone.addEventListener('click',function(){fileInput.click();});
dropZone.addEventListener('dragover',function(e){e.preventDefault();dropZone.classList.add('drag-over');});
dropZone.addEventListener('dragleave',function(){dropZone.classList.remove('drag-over');});
dropZone.addEventListener('drop',function(e){e.preventDefault();dropZone.classList.remove('drag-over');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);});
fileInput.addEventListener('change',function(){if(fileInput.files[0])handleFile(fileInput.files[0]);});
 
['fps','unit','smooth','offset','driftFactor'].forEach(function(id){
  document.getElementById(id).addEventListener('change',function(){if(rawPoints.length)reprocess();});
});
// Live preview updates for style changes
['trackColor','dotColor','shadowColor'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){if(rawPoints.length) drawRoute();});
});
['gaugeBgColor','gaugeRingColor','gaugeArcColor','gaugeNumberColor','gaugeUnitColor'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){if(speedData.length) drawGauge();});
});
['elevColor','elevFillColor','elevFill','elevDotColor'].forEach(function(id){
  var el=document.getElementById(id);
  if(el) el.addEventListener('input',function(){if(rawPoints.length) drawElev();});
  if(el && el.tagName==='SELECT') el.addEventListener('change',function(){if(rawPoints.length) drawElev();});
});
 
function setStatus(msg,cls){statusEl.textContent=msg;statusEl.className='status'+(cls?' '+cls:'');}
function setEnabled(on){btnIds.forEach(function(id){document.getElementById(id).disabled=!on;});document.getElementById('btnDownloadAll').disabled=!on;}
 
// ── File handling ─────────────────────────────────────────────────────────────
function handleFile(file){
  var name=file.name.toLowerCase();
  if(!name.endsWith('.gpx')&&!name.endsWith('.fit')){setStatus('Please upload a .gpx or .fit file','err');return;}
  currentFilename=file.name.replace(/\.[^.]+$/,'');
  setStatus('Reading '+file.name+'...');
  var reader=new FileReader();
  if(name.endsWith('.fit')){
    reader.onload=function(e){parseFIT(e.target.result,file.name);};
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload=function(e){parseGPX(e.target.result,file.name);};
    reader.readAsText(file);
  }
}
 
// ── FIT parser ────────────────────────────────────────────────────────────────
function parseFIT(buffer,name){
  try{
    var bytes=new Uint8Array(buffer),definitions={},points=[],lastTimestamp=undefined;
    var pos=bytes[0],dataEnd=bytes.length-2;
    function u32(p){return bytes[p]|(bytes[p+1]<<8)|(bytes[p+2]<<16)|(bytes[p+3]<<24);}
    function u16(p){return bytes[p]|(bytes[p+1]<<8);}
    function readFields(def){
      var sp=pos,rec={};
      for(var f=0;f<def.fields.length;f++){
        var fd=def.fields[f],val;
        if(fd.size===4)val=fd.arch===0?u32(pos):((bytes[pos]<<24)|(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3]);
        else if(fd.size===2)val=fd.arch===0?u16(pos):((bytes[pos]<<8)|bytes[pos+1]);
        else if(fd.size===1)val=bytes[pos];
        else{pos+=fd.size;continue;}
        rec[fd.num]=val; pos+=fd.size;
      }
      pos=sp+def.dataSize; return rec;
    }
    var FIT_EPOCH=631065600;
    function tryEmit(rec,ts){
      var lat=rec[0],lon=rec[1];
      var alt=rec[2]!==undefined?rec[2]:rec[78]; // fall back to enhanced_altitude (some Garmin/COROS devices only write the enhanced field)
      var spd=rec[6]!==undefined?rec[6]:rec[73]; // fall back to enhanced_speed (same reasoning — rec[136] was an unrelated manufacturer field and has been removed)
      var hr=rec[3];
      if(ts!==undefined&&ts!==0xFFFFFFFF&&lat!==undefined&&lat!==0x7FFFFFFF&&lon!==undefined&&lon!==0x7FFFFFFF){
        points.push({time:(ts+FIT_EPOCH)*1000,lat:lat*(180/Math.pow(2,31)),lon:lon*(180/Math.pow(2,31)),
          ele:(alt!==undefined&&alt!==0xFFFF)?(alt/5-500):null,
          speed:(spd!==undefined&&spd!==0xFFFF&&spd!==0xFFFFFFFF)?spd/1000:null,
          hr:(hr!==undefined&&hr!==0xFF&&hr!==0xFFFF)?hr:null});
      }
    }
    while(pos<dataEnd){
      var h=bytes[pos++];
      if(h&0x80){
        var lt=(h>>5)&0x03,to=h&0x1F,def=definitions[lt];
        // If the local message type hasn't been defined yet, we have no way to
        // know this record's byte length, so we can't safely skip just this one
        // record — continuing would misinterpret unrelated data bytes as
        // headers. Bail out of the whole parse instead of producing garbage points.
        if(!def) break;
        var rts;
        if(lastTimestamp!==undefined){rts=(lastTimestamp&0xFFFFFFE0)|to;if(rts<lastTimestamp)rts+=32;lastTimestamp=rts;}
        var rec=readFields(def);
        if(def.globalMsgNum===20&&rts!==undefined)tryEmit(rec,rts);
        continue;
      }
      // Bit 6 of a normal header flags a definition message (0=data, 1=definition).
      // Bit 7 is already known to be 0 here, so this is a single-bit check — the
      // old "mt===1||mt===3" form implied a third message type that can never occur.
      var isDefinition=(h&0x40)!==0, lmn=h&0x0F;
      if(isDefinition){
        pos++;var arch=bytes[pos++];
        var gmn=arch===0?u16(pos):(bytes[pos]<<8)|bytes[pos+1]; pos+=2;
        var nf=bytes[pos++],flds=[],ds=0;
        for(var f=0;f<nf;f++){flds.push({num:bytes[pos++],size:bytes[pos++],arch:arch});bytes[pos++];ds+=flds[flds.length-1].size;}
        if(h&0x20){var nd=bytes[pos++];for(var d=0;d<nd;d++){ds+=bytes[pos+1];pos+=3;}}
        definitions[lmn]={globalMsgNum:gmn,fields:flds,dataSize:ds,arch:arch};
      } else {
        var def=definitions[lmn];
        // Same reasoning as the compressed-timestamp branch above.
        if(!def) break;
        var rec=readFields(def);
        if(def.globalMsgNum===20){var ts=rec[253];if(ts!==undefined&&ts!==0xFFFFFFFF)lastTimestamp=ts;tryEmit(rec,ts);}
      }
    }
    if(points.length<2){setStatus('No GPS track points found in FIT file','err');return;}
    points.sort(function(a,b){return a.time-b.time;});
    rawPoints=points; totalDistM=0;
    for(var i=1;i<rawPoints.length;i++)totalDistM+=haversine(rawPoints[i-1].lat,rawPoints[i-1].lon,rawPoints[i].lat,rawPoints[i].lon);
    dropZone.querySelector('.drop-label').textContent=name;
    dropZone.querySelector('.drop-sub').textContent=rawPoints.length+' track points loaded';
    reprocess();
  }catch(e){console.error(e);setStatus('FIT parse error: '+e.message,'err');}
}
 
// ── GPX speed extension helper ────────────────────────────────────────────────
function getSpeedFromPoint(pt){
  var kids=pt.childNodes;
  for(var i=0;i<kids.length;i++){if(kids[i].localName==='speed'){var v=parseFloat(kids[i].textContent);if(!isNaN(v))return v;}}
  for(var i=0;i<kids.length;i++){
    if(kids[i].localName==='extensions'){
      var all=kids[i].getElementsByTagName('*');
      for(var j=0;j<all.length;j++){
        if(all[j].localName.toLowerCase()==='speed'){var v=parseFloat(all[j].textContent);if(!isNaN(v)&&v>=0)return v;}
      }
    }
  }
  return null;
}
 
// ── GPX parser ────────────────────────────────────────────────────────────────
function parseGPX(text,name){
  try{
    var parser=new DOMParser(),doc=parser.parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')){setStatus('XML error in GPX file','err');return;}
    var trkpts=doc.querySelectorAll('trkpt');
    if(!trkpts.length){setStatus('No track points found','err');return;}
    rawPoints=[];
    for(var i=0;i<trkpts.length;i++){
      var pt=trkpts[i],timeEl=pt.querySelector('time'),eleEl=pt.querySelector('ele');
      var lat=parseFloat(pt.getAttribute('lat')),lon=parseFloat(pt.getAttribute('lon'));
      var t=timeEl?new Date(timeEl.textContent).getTime():null;
      if(t&&!isNaN(t)&&!isNaN(lat)&&!isNaN(lon))
        rawPoints.push({time:t,lat:lat,lon:lon,ele:eleEl?parseFloat(eleEl.textContent):null,speed:getSpeedFromPoint(pt),hr:null});
    }
    rawPoints.sort(function(a,b){return a.time-b.time;});
    if(rawPoints.length<2){setStatus('Not enough valid points','err');return;}
    totalDistM=0;
    for(var i=1;i<rawPoints.length;i++)totalDistM+=haversine(rawPoints[i-1].lat,rawPoints[i-1].lon,rawPoints[i].lat,rawPoints[i].lon);
    dropZone.querySelector('.drop-label').textContent=name;
    dropZone.querySelector('.drop-sub').textContent=rawPoints.length+' track points loaded';
    reprocess();
  }catch(e){console.error(e);setStatus('Error: '+e.message,'err');}
}
 
// ── Core math ─────────────────────────────────────────────────────────────────
function haversine(la1,lo1,la2,lo2){
  var R=6371000,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180;
  var a=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)*Math.sin(dO/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function computeSpeeds(pts,unit){
  var result=[];
  for(var i=0;i<pts.length;i++){
    var p=pts[i],spd=(p.speed!==null&&!isNaN(p.speed))?p.speed:null;
    if(spd===null){if(i<pts.length-1){var dt=(pts[i+1].time-p.time)/1000;spd=dt>0?haversine(p.lat,p.lon,pts[i+1].lat,pts[i+1].lon)/dt:0;}else spd=result.length?result[result.length-1].rawSpd:0;}
    result.push({time:p.time,rawSpd:spd,spd:Math.max(0,unit==='mph'?spd*2.23694:spd*3.6)});
  }
  return result;
}
// ── Smoothing ─────────────────────────────────────────────────────────────────
 
// Compute Savitzky-Golay convolution coefficients for a given half-window and
// polynomial degree using the least-squares normal equations. Returns an array
// of 2*m+1 weights centred on index m.
function sgCoeffs(m, degree) {
  var n = 2 * m + 1;
  // Build Vandermonde matrix A (n x (degree+1)) for x = -m..m
  var A = [];
  for (var i = 0; i < n; i++) {
    var row = [], x = i - m;
    for (var d = 0; d <= degree; d++) row.push(Math.pow(x, d));
    A.push(row);
  }
  // Compute ATA and ATe0 (first basis vector — we want the smoothed value, coeff 0)
  var cols = degree + 1;
  var ATA = [];
  for (var r = 0; r < cols; r++) {
    ATA.push([]);
    for (var c = 0; c < cols; c++) {
      var s = 0;
      for (var i = 0; i < n; i++) s += A[i][r] * A[i][c];
      ATA[r].push(s);
    }
  }
  // Invert ATA via Gauss-Jordan
  var aug = [];
  for (var r = 0; r < cols; r++) {
    aug.push(ATA[r].slice());
    for (var c = 0; c < cols; c++) aug[r].push(r === c ? 1 : 0);
  }
  for (var col = 0; col < cols; col++) {
    // Pivot
    var maxR = col;
    for (var r = col+1; r < cols; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[maxR][col])) maxR = r;
    var tmp = aug[col]; aug[col] = aug[maxR]; aug[maxR] = tmp;
    var piv = aug[col][col];
    if (Math.abs(piv) < 1e-12) return null; // singular — fall back to rolling avg
    for (var c = 0; c < cols*2; c++) aug[col][c] /= piv;
    for (var r = 0; r < cols; r++) {
      if (r === col) continue;
      var f = aug[r][col];
      for (var c = 0; c < cols*2; c++) aug[r][c] -= f * aug[col][c];
    }
  }
  // First row of inverse gives coefficients for the smoothed value at centre
  // weights[i] = sum_d inv[0][d] * A[i][d]
  var weights = [];
  for (var i = 0; i < n; i++) {
    var w = 0;
    for (var d = 0; d <= degree; d++) w += aug[0][cols + d] * A[i][d];
    weights.push(w);
  }
  return weights;
}
 
// Cache coefficients so they're only recomputed when window changes
var _sgCache = {};
function getSGCoeffs(m) {
  if (_sgCache[m]) return _sgCache[m];
  var c = sgCoeffs(m, 2); // degree-2 quadratic
  if (!c) c = sgCoeffs(m, 1); // fallback to linear if singular
  _sgCache[m] = c;
  return c;
}
 
function smoothSG(data, win) {
  // win is the full window width (odd number). m = half-window.
  if (win <= 1) return data.slice();
  var m = Math.floor(win / 2);
  var weights = getSGCoeffs(m);
  if (!weights) return smoothRolling(data, win); // safety fallback
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var sum = 0, wSum = 0;
    for (var k = -m; k <= m; k++) {
      var idx = Math.min(Math.max(i + k, 0), data.length - 1); // clamp edges
      var w = weights[k + m];
      sum += w * data[idx].spd;
      wSum += w;
    }
    // Clamp negative outputs — SG can produce tiny negatives at edges
    out.push({ time: data[i].time, spd: Math.max(0, wSum !== 0 ? sum / wSum : sum) });
  }
  return out;
}
 
function smoothRolling(data, win) {
  if (win <= 1) return data.slice();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var h = Math.floor(win/2), s = Math.max(0,i-h), e = Math.min(data.length-1,i+h), sum = 0, n = 0;
    for (var j = s; j <= e; j++) { sum += data[j].spd; n++; }
    out.push({ time: data[i].time, spd: sum / n });
  }
  return out;
}
 
function smooth(data, win) {
  return smoothSG(data, win);
}

// ── Grade/Incline smoothing (rolling distance-window average, time-aware) ─────
// Raw point-to-point grade is extremely noisy (GPS elevation jitter), so we average
// elevation change over a rolling ~15m window before computing % grade — similar
// in spirit to the 3-second power smoothing, but distance-keyed since incline is
// a spatial quantity, not a temporal one.
function buildGradeData(pts){
  var elevPts=pts.filter(function(p){return p.ele!==null&&!isNaN(p.ele);});
  if(elevPts.length<2) return [];
  var windowM=15; // smoothing window in meters
  var out=[];
  for(var i=0;i<elevPts.length;i++){
    var d0=0,j=i;
    // walk backward half the window
    while(j>0 && d0<windowM/2){ d0+=haversine(elevPts[j-1].lat,elevPts[j-1].lon,elevPts[j].lat,elevPts[j].lon); j--; }
    var lo=j;
    var d1=0,k=i;
    while(k<elevPts.length-1 && d1<windowM/2){ d1+=haversine(elevPts[k].lat,elevPts[k].lon,elevPts[k+1].lat,elevPts[k+1].lon); k++; }
    var hi=k;
    var distM=0;
    for(var m=lo;m<hi;m++) distM+=haversine(elevPts[m].lat,elevPts[m].lon,elevPts[m+1].lat,elevPts[m+1].lon);
    var elevDiff=elevPts[hi].ele-elevPts[lo].ele;
    var pct=distM>1 ? (elevDiff/distM)*100 : 0;
    out.push({time:elevPts[i].time, pct:pct});
  }
  return out;
}

// ── Reprocess ─────────────────────────────────────────────────────────────────
function reprocess(){
  var fps=parseFloat(document.getElementById('fps').value);
  var unit=document.getElementById('unit').value;
  var win=(parseInt(document.getElementById('smooth').value)||0)*2+1;
  speedData=smooth(computeSpeeds(rawPoints,unit),win);
  hrData=rawPoints.filter(function(p){return p.hr!==null&&!isNaN(p.hr);}).map(function(p){return{time:p.time,hr:p.hr};});
  gradeData=buildGradeData(rawPoints);
  distData=(function(){
    var out=[],cum=0;
    for(var i=0;i<rawPoints.length;i++){
      if(i>0) cum+=haversine(rawPoints[i-1].lat,rawPoints[i-1].lon,rawPoints[i].lat,rawPoints[i].lon);
      out.push({time:rawPoints[i].time, distM:cum});
    }
    return out;
  })();
  var durSec=(speedData[speedData.length-1].time-speedData[0].time)/1000;
  var maxSpd=0;
  for(var i=0;i<speedData.length;i++)if(speedData[i].spd>maxSpd)maxSpd=speedData[i].spd;
  var h=Math.floor(durSec/3600),m=Math.floor((durSec%3600)/60),s=Math.floor(durSec%60),f=Math.round((durSec%1)*fps);
  function p2(n){return n<10?'0'+n:''+n;}
  var tc=p2(h)+':'+p2(m)+':'+p2(s)+':'+p2(f);
  var distDisplay=unit==='mph'?(totalDistM/1609.344).toFixed(2)+' mi':(totalDistM/1000).toFixed(2)+' km';
  document.getElementById('statPts').textContent=rawPoints.length;
  document.getElementById('statDur').textContent=tc;
  document.getElementById('statDist').textContent=distDisplay;
  document.getElementById('statSpd').textContent=maxSpd.toFixed(1)+' '+unit.toUpperCase();
  document.getElementById('maxSpeed').value=(Math.max(0.5,Math.ceil(maxSpd*2)/2)).toFixed(1);
  document.getElementById('statsWrap').style.display='block';
  drawRoute(); drawSpeed(maxSpd); drawElev(); drawHR(); setEnabled(true);
  setStatus('Ready — '+rawPoints.length+' points · '+tc+' · '+distDisplay,'ok');
}
 
// ── Previews ──────────────────────────────────────────────────────────────────
function project(pts,W,H){
  var lats=pts.map(function(p){return p.lat;}),lons=pts.map(function(p){return p.lon;});
  var mnLa=Math.min.apply(null,lats),mxLa=Math.max.apply(null,lats);
  var mnLo=Math.min.apply(null,lons),mxLo=Math.max.apply(null,lons);
  return pts.map(function(p){
    var x=(p.lon-mnLo)/(mxLo-mnLo||1)*W;
    var mr=Math.log(Math.tan(Math.PI/4+p.lat*Math.PI/360));
    var mn2=Math.log(Math.tan(Math.PI/4+mnLa*Math.PI/360));
    var mx2=Math.log(Math.tan(Math.PI/4+mxLa*Math.PI/360));
    var y=H-(mr-mn2)/(mx2-mn2||1)*H;
    return{x:x,y:y};
  });
}
 
function hexToRgb(h){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return[r,g,b];}

// ── HiDPI canvas setup ────────────────────────────────────────────────────────
// Sizes a canvas's backing store to CSS-size * devicePixelRatio (so it stays
// sharp on retina/high-DPI screens) while keeping all drawing code working in
// plain CSS-pixel coordinates via ctx.setTransform. Also locks in the CSS
// height explicitly, since canvas height was previously only ever set via the
// width/height attributes (which define the backing store, not the on-page
// size) — that's harmless at DPR 1 but would visually stretch the canvas at
// higher DPR without this.
function setupHiDPICanvas(c,W,H){
  var dpr=window.devicePixelRatio||1;
  c.width=Math.max(1,Math.round(W*dpr));
  c.height=Math.max(1,Math.round(H*dpr));
  c.style.width=W+'px';
  c.style.height=H+'px';
  var ctx=c.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return ctx;
}
// Redraws whichever preview canvases currently have data — bound to a debounced
// window resize listener so the previews stay crisp and correctly proportioned
// if the person resizes their browser window.
var resizeRedrawTimer=null;
window.addEventListener('resize',function(){
  clearTimeout(resizeRedrawTimer);
  resizeRedrawTimer=setTimeout(function(){
    if(!rawPoints.length) return;
    drawRoute();
    var maxSpd=0;
    for(var i=0;i<speedData.length;i++) if(speedData[i].spd>maxSpd) maxSpd=speedData[i].spd;
    drawSpeed(maxSpd);
    drawElev();
    drawHR();
  },150);
});

function drawRoute(){
  var c=document.getElementById('routeCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,180);
  var pts=project(rawPoints,W-20,160);
  var xs=pts.map(function(p){return p.x;}),ys=pts.map(function(p){return p.y;});
  var mnX=Math.min.apply(null,xs),mxX=Math.max.apply(null,xs);
  var mnY=Math.min.apply(null,ys),mxY=Math.max.apply(null,ys);
  var mapped=pts.map(function(p,i){return{x:10+(p.x-mnX)/(mxX-mnX||1)*(W-20),y:10+(p.y-mnY)/(mxY-mnY||1)*160};});
  ctx.beginPath();
  for(var i=0;i<mapped.length;i++){if(i===0)ctx.moveTo(mapped[i].x,mapped[i].y);else ctx.lineTo(mapped[i].x,mapped[i].y);}
  ctx.strokeStyle='#f97316'; ctx.lineWidth=2; ctx.stroke();
}
 
function drawGauge(){
  var maxSpd=parseFloat(document.getElementById('maxSpeed').value)||9;
  var unit=document.getElementById('unit').value;
  var curSpd=speedData.length?Math.min(speedData[Math.floor(speedData.length*0.25)].spd,maxSpd):maxSpd*0.4;
  document.getElementById('gaugeWrap').style.display='block';
  var c=document.getElementById('gaugeCanvas');
  var S=200,cx=100,cy=100;
  var ctx=setupHiDPICanvas(c,S,S);
  ctx.clearRect(0,0,S,S);
 
  var bgColor=document.getElementById('gaugeBgColor').value;
  // Outer dark disc
  ctx.beginPath(); ctx.arc(cx,cy,cx,0,Math.PI*2); ctx.fillStyle=bgColor; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,cx-4,0,Math.PI*2); ctx.fillStyle=bgColor; ctx.globalAlpha=0.85; ctx.fill(); ctx.globalAlpha=1;
 
  var R=74, trackW=10, speedW=12;
  var TAU=Math.PI*2;
 
  // Gap at the bottom. Arc starts at 7 o'clock (~210°), sweeps clockwise 300° to 5 o'clock (~150°... wait)
  // Looking at image: gap is roughly 60° wide centered at bottom (270°)
  // So arc runs from ~240° (8 o'clock) clockwise to ~300° (... 
  // More carefully: red starts top-left of gap, white ends bottom-right of gap
  // Gap center = 270° (bottom). Gap width ~50°.
  // Start = 270 - 25 = 245° from 3-o-clock = TAU*(245/360)  → 8 o'clock area (bottom-left)
  // End   = 270 + 25 = 295° from 3-o-clock = TAU*(295/360)  → bottom-right (~5 o'clock)  
  // Clockwise sweep from 245° to 295° = 310° total
  var startAng = TAU * (245/360); // bottom-left edge of gap
  var endAng   = TAU * (295/360); // bottom-right edge of gap
  // Clockwise from 245 → 295 going the LONG way = 360 - 50 = 310°
 
  var ringColor=document.getElementById('gaugeRingColor').value;
  var arcColor=document.getElementById('gaugeArcColor').value;
  var numColor=document.getElementById('gaugeNumberColor').value;
  var unitColor=document.getElementById('gaugeUnitColor').value;

  // White track ring — full arc clockwise from start to end (long way)
  ctx.beginPath();
  ctx.arc(cx,cy,R,startAng,endAng,false);
  ctx.strokeStyle=ringColor;
  ctx.lineWidth=trackW;
  ctx.lineCap='round';
  ctx.stroke();
 
  // Speed arc — clockwise from same start, fraction of total sweep
  var totalSweep = TAU*(310/360);
  var frac=maxSpd>0?curSpd/maxSpd:0;
  if(frac>0.001){
    ctx.beginPath();
    ctx.arc(cx,cy,R,startAng,startAng+totalSweep*frac,false);
    ctx.strokeStyle=arcColor;
    ctx.lineWidth=speedW;
    ctx.lineCap='round';
    ctx.stroke();
  }
 
  // Speed number
  ctx.fillStyle=numColor;
  ctx.font='bold 38px DM Mono,monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(curSpd.toFixed(1),cx,cy-6);
 
  // Unit label
  ctx.fillStyle=unitColor;
  ctx.font='bold 12px DM Sans,sans-serif';
  ctx.fillText(unit.toUpperCase(),cx,cy+26);
}
 
function drawSpeed(maxSpd){
  var c=document.getElementById('speedCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,60),pad=4;
  ctx.beginPath();
  for(var i=0;i<speedData.length;i++){
    var x=pad+(i/(speedData.length-1||1))*(W-pad*2),y=60-pad-(speedData[i].spd/(maxSpd||1))*(60-pad*2);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.strokeStyle='#f97316'; ctx.lineWidth=1.5; ctx.stroke();
}
 
function gradeColor(gradePct){
  // 0%=green, 5%=yellow, 10%+=red
  var t=Math.min(Math.abs(gradePct)/10,1);
  var r=Math.round(34+(255-34)*t),g=Math.round(197+(197*(1-t)*0.3)),b=Math.round(94*(1-t));
  return'rgba('+r+','+g+','+b+',0.85)';
}

// Build precomputed cumulative-distance x positions (shared by drawElev and buildElevSVG)
function drawHR(){
  var wrap=document.getElementById('hrPreviewWrap');
  if(!hrData.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  var c=document.getElementById('hrCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,60),pad=6,iW=W-pad*2,iH=60-pad*2;
  var hrs=hrData.map(function(p){return p.hr;});
  var minHR=Math.min.apply(null,hrs),maxHR=Math.max.apply(null,hrs),hrRange=maxHR-minHR||1;
  var t0=hrData[0].time,tN=hrData[hrData.length-1].time,tRange=tN-t0||1;
  var hrColor=document.getElementById('hrColor').value;
  var r=parseInt(hrColor.slice(1,3),16),g=parseInt(hrColor.slice(3,5),16),b=parseInt(hrColor.slice(5,7),16);
  ctx.beginPath(); ctx.moveTo(pad,pad+iH);
  for(var i=0;i<hrData.length;i++){
    var x=pad+(hrData[i].time-t0)/tRange*iW;
    var y=pad+(1-(hrData[i].hr-minHR)/hrRange)*iH;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(pad+iW,pad+iH); ctx.closePath();
  ctx.fillStyle='rgba('+r+','+g+','+b+',0.15)'; ctx.fill();
  ctx.beginPath();
  for(var i=0;i<hrData.length;i++){
    var x=pad+(hrData[i].time-t0)/tRange*iW;
    var y=pad+(1-(hrData[i].hr-minHR)/hrRange)*iH;
    if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.strokeStyle=hrColor; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='rgba('+r+','+g+','+b+',0.8)'; ctx.font='10px sans-serif';
  ctx.fillText(maxHR+' bpm',pad+2,pad+10);
  ctx.fillText(minHR+' bpm',pad+2,pad+iH-2);
}

function buildElevXY(elevPts,iW,iH,pad){
  var eles=elevPts.map(function(p){return p.ele;});
  var minEle=Math.min.apply(null,eles),maxEle=Math.max.apply(null,eles),eleRange=maxEle-minEle||1;
  var totalDKm=0;
  for(var i=1;i<elevPts.length;i++) totalDKm+=haversine(elevPts[i-1].lat,elevPts[i-1].lon,elevPts[i].lat,elevPts[i].lon)/1000;
  var cum=[0];
  for(var i=1;i<elevPts.length;i++) cum.push(cum[i-1]+haversine(elevPts[i-1].lat,elevPts[i-1].lon,elevPts[i].lat,elevPts[i].lon)/1000);
  var xs=[],ys=[];
  for(var i=0;i<elevPts.length;i++){
    xs.push(pad+(totalDKm>0?(cum[i]/totalDKm)*iW:0));
    ys.push(pad+(1-(elevPts[i].ele-minEle)/eleRange)*iH);
  }
  return{xs:xs,ys:ys,minEle:minEle,maxEle:maxEle,eleRange:eleRange,elevPts:elevPts};
}

// Catmull-Rom control points for smooth bezier through points
function catmullToBezier(xs,ys){
  // Returns array of {x1,y1,x2,y2,x,y} cubic bezier segments
  var segs=[];
  var n=xs.length;
  for(var i=0;i<n-1;i++){
    var p0=i>0?{x:xs[i-1],y:ys[i-1]}:{x:xs[i],y:ys[i]};
    var p1={x:xs[i],y:ys[i]};
    var p2={x:xs[i+1],y:ys[i+1]};
    var p3=i<n-2?{x:xs[i+2],y:ys[i+2]}:{x:xs[i+1],y:ys[i+1]};
    var t=0.5;
    segs.push({
      x1:p1.x+(p2.x-p0.x)*t/3,
      y1:p1.y+(p2.y-p0.y)*t/3,
      x2:p2.x-(p3.x-p1.x)*t/3,
      y2:p2.y-(p3.y-p1.y)*t/3,
      x:p2.x,y:p2.y
    });
  }
  return segs;
}

function drawElev(){
  var elevPts=rawPoints.filter(function(p){return p.ele!==null&&!isNaN(p.ele);});
  var wrap=document.getElementById('elevPreviewWrap');
  if(!elevPts.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  var c=document.getElementById('elevCanvas'),W=c.offsetWidth||620;
  var ctx=setupHiDPICanvas(c,W,80),pad=6,iW=W-pad*2,iH=80-pad*2;
  var useSmooth=true; // fluid spline interpolation — no jagged staircase edges
  var lineColor=document.getElementById('elevColor').value;
  var fillColor=document.getElementById('elevFillColor').value;
  var useFill=document.getElementById('elevFill').value==='1';
  var d=buildElevXY(elevPts,iW,iH,pad);
  var xs=d.xs,ys=d.ys;
  var segs=useSmooth?catmullToBezier(xs,ys):null;

  // No ctx.shadowColor/shadowBlur/shadowOffsetX/shadowOffsetY are set anywhere in
  // this function — flat, sharp rendering only, by design.

  // fill area
  if(useFill){
    ctx.beginPath(); ctx.moveTo(xs[0],ys[0]);
    if(useSmooth && segs){
      for(var i=0;i<segs.length;i++) ctx.bezierCurveTo(segs[i].x1,segs[i].y1,segs[i].x2,segs[i].y2,segs[i].x,segs[i].y);
    } else {
      for(var i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i]);
    }
    ctx.lineTo(xs[xs.length-1],pad+iH); ctx.lineTo(xs[0],pad+iH); ctx.closePath();
    // hex to rgba — subtle transparency, defaults to white if the picker is left at its default
    var fr=parseInt(fillColor.slice(1,3),16),fg=parseInt(fillColor.slice(3,5),16),fb=parseInt(fillColor.slice(5,7),16);
    ctx.fillStyle='rgba('+fr+','+fg+','+fb+',0.15)'; ctx.fill();
  }

  // line
  ctx.beginPath(); ctx.moveTo(xs[0],ys[0]);
  if(useSmooth && segs){
    for(var i=0;i<segs.length;i++) ctx.bezierCurveTo(segs[i].x1,segs[i].y1,segs[i].x2,segs[i].y2,segs[i].x,segs[i].y);
  } else {
    for(var i=1;i<xs.length;i++) ctx.lineTo(xs[i],ys[i]);
  }
  ctx.strokeStyle=lineColor; ctx.lineWidth=1.5; ctx.stroke();

  // Tracking dot — solid white, flat (no glow/shadow), shown at a representative
  // "current position" a quarter of the way through the track, matching the same
  // preview convention as the speedometer gauge.
  var curIdx=Math.max(0,Math.min(xs.length-1,Math.floor(xs.length*0.25)));
  var dx=xs[curIdx],dy=ys[curIdx];
  ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();

  var unit=document.getElementById('unit').value;
  var toDisp=function(m){ return unit==='mph' ? m*3.28084 : m; };
  var unitLabel=unit==='mph' ? 'ft' : 'm';
  ctx.font='bold 11px sans-serif'; ctx.fillStyle='#ffffff'; ctx.textBaseline='middle';
  var readout=Math.round(toDisp(elevPts[curIdx].ele))+' '+unitLabel;
  var tx=Math.min(dx+8,W-pad-ctx.measureText(readout).width);
  ctx.fillText(readout,tx,dy-8);

  ctx.fillStyle='rgba(148,163,184,0.8)'; ctx.font='10px sans-serif'; ctx.textBaseline='alphabetic';
  if(document.getElementById('elevLabels').checked){
    ctx.fillText(Math.round(toDisp(d.maxEle))+' '+unitLabel,pad+2,pad+10);
    ctx.fillText(Math.round(toDisp((d.maxEle+d.minEle)/2))+' '+unitLabel,pad+2,pad+iH/2+4);
    ctx.fillText(Math.round(toDisp(d.minEle))+' '+unitLabel,pad+2,pad+iH-2);
  }
}
 
// ── Filename helper ───────────────────────────────────────────────────────────
function sanitizeFilename(s){
  // Strip/replace characters illegal in Windows filenames (and, for ':' specifically,
  // NTFS Alternate Data Stream syntax) — a zip entry with a raw ':' in its name is
  // exactly what makes Windows Explorer flag the archive and extract nothing.
  return s.replace(/[:]/g,'-').replace(/[<>"/\\|?*]/g,'').replace(/\s+/g,' ').trim();
}
function makeFilename(suffix,ext){
  var dur=document.getElementById('statDur').textContent||'';
  var base=currentFilename||'overlay';
  return sanitizeFilename(base+' - '+dur+' - '+suffix)+'.'+ext;
}
 
// ── Baked BezierSpline keyframe helpers ───────────────────────────────────────
// Converts a raw data array (each item with a .time in ms) into an ordered list
// of [frame, value] pairs, exactly the way the old .spl exporters did (one entry
// per changed frame, GPS-offset/drift corrected). Used to bake animation directly
// into a .setting file's Input, instead of requiring a separate .spl import.
function buildKeyframeList(dataArr, valueFn){
  if(!dataArr || !dataArr.length) return [];
  var fps=parseFloat(document.getElementById('fps').value);
  var offset=parseFloat(document.getElementById('offset').value)||0;
  var drift=parseFloat(document.getElementById('driftFactor').value)||1.0;
  var t0=dataArr[0].time,out=[],lf=-1;
  for(var i=0;i<dataArr.length;i++){
    var fr=Math.round(((dataArr[i].time-t0)/1000*drift+offset)*fps);
    if(fr>=0&&fr!==lf){ out.push([fr, valueFn(dataArr[i], i)]); lf=fr; }
  }
  return out;
}
// Builds Lua text for a BezierSpline modifier tool that lives INSIDE the
// GroupOperator, as a sibling of the other nested tools (Merge, Background, etc.)
// in the same Tools ordered() block. A control's Input references this tool by
// name via SourceOp/Source. Keyframe values must match the target's native value
// shape exactly: a Point keyframe is `{ X, Y }` (not `{ { X, Y } }` — that extra
// wrapping table is not a valid Point literal and breaks the spline on import).
function buildBezierSplineTool(name, keyframes, isPoint, indentTabs){
  // indentTabs: how many tabs deep this tool sits. Default 4 = nested inside a
  // GroupOperator's own Tools ordered() block (sibling of Merge/Background/etc).
  // Pass 2 for a tool that instead sits as a TOP-LEVEL sibling of the
  // GroupOperator itself (e.g. Path1Displacement) — confirmed against real
  // Fusion-exported reference files that a path-following dot's displacement
  // spline lives outside the group, one level up from the group's own tools.
  var t=new Array((indentTabs||4)+1).join('\t');
  var L=[];
  L.push(t+name+' = BezierSpline {');
  L.push(t+'\tCtrlWZoom = false,');
  L.push(t+'\tNameSet = true,');
  L.push(t+'\tKeyFrames = {');
  for(var i=0;i<keyframes.length;i++){
    if(isPoint){
      var v=keyframes[i][1];
      L.push(t+'\t\t['+keyframes[i][0]+'] = { '+v[0].toFixed(6)+', '+v[1].toFixed(6)+' },');
    } else {
      L.push(t+'\t\t['+keyframes[i][0]+'] = { '+Number(keyframes[i][1]).toFixed(6)+' },');
    }
  }
  L.push(t+'\t}');
  L.push(t+'},');
  return L.join('\n');
}
// Lua text for a control's Input that points at an external baked BezierSpline tool.
function bezierSourceRefInput(sourceOpName){
  return 'Input { SourceOp = "'+sourceOpName+'", Source = "Value", }';
}

// ── Path-following dot mechanism (Publish1 / Path1 / Path1Displacement) ───────
// Confirmed against corrected reference .setting files: a dot that follows a
// drawn path is NOT driven by baked per-frame X/Y keyframes on its own Center.
// Instead, three tools sit as TOP-LEVEL siblings of the GroupOperator itself
// (outside the group's own Tools ordered() block, one level up):
//   Publish1          — PublishPolyLine holding the path's own Polyline value.
//                        The path shape's Polyline input then reads from this
//                        (this is what "Right-click → Publish" produces).
//   Path1             — PolyPath: walks Publish1's polyline, using a scalar
//                        0→1 Displacement input to output a Position.
//   Path1Displacement — BezierSpline of scalar progress-along-path fractions,
//                        one per frame (this is what an imported dot .spl
//                        drives in Fusion's UI; baked here as keyframes
//                        instead, consistent with this tool's existing baked-
//                        keyframe approach for every other animated overlay).
// The dot's own Center input then simply reads SourceOp="Path1", Source="Position".
function buildPublishPolyLineTool(name, ptsArr, closed){
  var L=[];
  L.push('\t\t'+name+' = PublishPolyLine {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tInputs = {');
  L.push('\t\t\t\tValue = Input {');
  L.push('\t\t\t\t\tValue = Polyline {');
  if(closed) L.push('\t\t\t\t\t\tClosed = true,');
  L.push('\t\t\t\t\t\tPoints = {');
  L.push(polylineShapePointsLua(ptsArr, closed, false, '\t\t\t\t\t\t\t'));
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t},');
  L.push('\t\t\t},');
  L.push('\t\t},');
  return L.join('\n');
}
function buildPolyPathTool(name, displacementSourceOp, polylineSourceOp){
  var L=[];
  L.push('\t\t'+name+' = PolyPath {');
  L.push('\t\t\tInputs = {');
  L.push('\t\t\t\tDisplacement = Input { SourceOp = "'+displacementSourceOp+'", Source = "Value", },');
  L.push('\t\t\t\tPolyLine = Input { SourceOp = "'+polylineSourceOp+'", Source = "Value", }');
  L.push('\t\t\t},');
  L.push('\t\t},');
  return L.join('\n');
}
// Lua text for an Input driven by a PolyPath tool's Position output.
function polyPathPositionInput(polyPathName){
  return 'Input { SourceOp = "'+polyPathName+'", Source = "Position", }';
}
// Builds the cumulative-distance-fraction (0→1) keyframe list used to drive a
// Path1Displacement spline — same haversine-cumulative-distance basis already
// used elsewhere in this file (e.g. the old SPL export's progress values), so
// distance-along-path stays consistent across every overlay that needs it.
function buildDisplacementKeyframes(ptsArr){
  var cum=[0];
  for(var i=1;i<ptsArr.length;i++){
    cum.push(cum[i-1]+haversine(ptsArr[i-1].lat,ptsArr[i-1].lon,ptsArr[i].lat,ptsArr[i].lon));
  }
  var total=cum[cum.length-1];
  var frac=cum.map(function(c){return total>0?c/total:0;});
  return buildKeyframeList(ptsArr, function(p,i){return frac[i];});
}

// ── Builders ──────────────────────────────────────────────────────────────────
function buildSetting(){
  var maxSpd=parseFloat(document.getElementById('maxSpeed').value)||9;
  var unit=document.getElementById('unit').value,u=unit.toUpperCase(),ms=maxSpd.toFixed(2);
  var speedKF=buildKeyframeList(speedData,function(p){return Math.min(p.spd,maxSpd);});
  var bgRgb=hexToRgb(document.getElementById('gaugeBgColor').value);
  var ringRgb=hexToRgb(document.getElementById('gaugeRingColor').value);
  var arcRgb=hexToRgb(document.getElementById('gaugeArcColor').value);
  var numRgb=hexToRgb(document.getElementById('gaugeNumberColor').value);
  var unitRgb=hexToRgb(document.getElementById('gaugeUnitColor').value);
  function f(c){return (c/255).toFixed(6);}

  // Single horizontal row, in dependency order, all sharing the same Y as the
  // group's own output (Merge4) — previously these used raw coordinates
  // straight from a real Fusion session (including negative Y values well off
  // to the side), which is what made the imported node tree look scattered
  // and required scrolling/zooming out to find everything.
  var ROW_Y=100, STEP=110, x=0;
  function nextX(){ var v=x; x+=STEP; return v; }

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tSpeedOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "Merge4", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 566, 132.364, 283, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tEllipse2 = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground2 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "Ellipse2", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+f(bgRgb[0])+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+f(bgRgb[1])+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+f(bgRgb[2])+', },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0.433, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tEllipse1 = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = 0.013, },');
  L.push('\t\t\t\t\t\tSolid = Input { Value = 0, },');
  L.push('\t\t\t\t\t\tWritePosition = Input { Value = 0.62, },');
  L.push('\t\t\t\t\t\tWriteLength = Input { Value = -0.75, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 0.457, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.457, Expression = "Width", }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground1 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "Ellipse1", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+f(ringRgb[0])+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+f(ringRgb[1])+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+f(ringRgb[2])+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge1 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Background2", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Background1", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tCurrentSpeed = EllipseMask {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tSourceOp = "Ellipse1",');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { },');
  L.push('\t\t\t\t\t\tSettingsNest = Input { },');
  L.push('\t\t\t\t\t\tLayersNest = Input { },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = 0.018, },');
  L.push('\t\t\t\t\t\tWriteLength = Input { Value = -0.29525, Expression = "(-0.75/100)*Pre" },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.457, Expression = "Width" },');
  L.push('\t\t\t\t\t\tCommentsNest = Input { },');
  L.push('\t\t\t\t\t\tFrameRenderScriptNest = Input { },');
  L.push('\t\t\t\t\t\tStartRenderScripts = Input { },');
  L.push('\t\t\t\t\t\tEndRenderScripts = Input { },');
  L.push('\t\t\t\t\t\tPre = Input { Value = 39.3666666666667, Expression = "(ActiveSpeed/'+ms+')*100" },');
  L.push('\t\t\t\t\t\tActiveSpeed = '+bezierSourceRefInput('CurrentSpeedActiveSpeed')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t\tUserControls = ordered() { Pre = { LINKID_DataType = "Number", INP_Integer = false, INP_MaxScale = 100, ICS_ControlPage = "Controls", INP_MinScale = 0, INPID_InputControl = "SliderControl", INP_SplineType = "Default", LINKS_Name = "Percentage", }, ActiveSpeed = { LINKS_Name = "Active Speed", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = '+ms+', INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, INP_SplineType = "Default", ICS_ControlPage = "Controls" } }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground3 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "CurrentSpeed", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+f(arcRgb[0])+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+f(arcRgb[1])+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+f(arcRgb[2])+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge2 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge1", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Background3", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tText1 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+f(numRgb[0])+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+f(numRgb[1])+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+f(numRgb[2])+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Expression = "string.format( \\"%.1f\\", (CurrentSpeed.ActiveSpeed))\\n", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.2126, },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge2", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Text1", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tText2 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCharacterOffset = Input { Value = { 0, -0.178 }, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+f(unitRgb[0])+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+f(unitRgb[1])+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+f(unitRgb[2])+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Value = "'+u+'", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge4 = Merge {');
  L.push('\t\t\t\t\tCtrlWZoom = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge3", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Text2", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+nextX()+', '+ROW_Y+' } },');
  L.push('\t\t\t\t},');
  L.push(buildBezierSplineTool('CurrentSpeedActiveSpeed', speedKF, false));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push('\t},');
  L.push('\tActiveTool = "SpeedOverlay"');
  L.push('}');
  return L.join('\n');
}
 
// Static heart-shape geometry for the HR Overlay's heart icon (top and bottom
// halves), extracted directly from a real Fusion export (HeartRate_full.setting)
// rather than hand-drawn — this is fixed reference data, not per-project.
var HEART_TOP_POINTS_LUA="\t\t\t\t\t\t\t\t\t{ X = 0.00329765375775326, Y = 0.223565745393635 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00664123100674162, Y = 0.232008535276052 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0159095427210991, Y = 0.251339407402033 },\n\t\t\t\t\t\t\t\t\t{ X = 0.029839646494717, Y = 0.272522237967087 },\n\t\t\t\t\t\t\t\t\t{ X = 0.114575966424056, Y = 0.375960430583971 },\n\t\t\t\t\t\t\t\t\t{ X = 0.253663503068628, Y = 0.401068427117909 },\n\t\t\t\t\t\t\t\t\t{ X = 0.348661038379859, Y = 0.370696609019697 },\n\t\t\t\t\t\t\t\t\t{ X = 0.404335974944705, Y = 0.326518121376747 },\n\t\t\t\t\t\t\t\t\t{ X = 0.43677510776632, Y = 0.287789659196456 },\n\t\t\t\t\t\t\t\t\t{ X = 0.466638493266867, Y = 0.226182028874071 },\n\t\t\t\t\t\t\t\t\t{ X = 0.47150914283105, Y = 0.159966632813094 },\n\t\t\t\t\t\t\t\t\t{ X = 0.469084367454681, Y = 0.0999570128068874 },\n\t\t\t\t\t\t\t\t\t{ X = 0.454118795724822, Y = 0.0579125281759237 },\n\t\t\t\t\t\t\t\t\t{ X = 0.444664945300876, Y = 0.0323773887825874 },\n\t\t\t\t\t\t\t\t\t{ X = 0.434141105932403, Y = 0.0120132658657918 },\n\t\t\t\t\t\t\t\t\t{ X = 0.430318109152018, Y = 0.00688729282999123 },\n\t\t\t\t\t\t\t\t\t{ X = 0.41080147802481, Y = 0.00744183358803691 },\n\t\t\t\t\t\t\t\t\t{ X = 0.398672362578892, Y = 0.00767062566598176 },\n\t\t\t\t\t\t\t\t\t{ X = 0.390699116482393, Y = 0.00809439651553475 },\n\t\t\t\t\t\t\t\t\t{ X = 0.385090180445213, Y = 0.00847867514230427 },\n\t\t\t\t\t\t\t\t\t{ X = 0.381174288891618, Y = 0.0131242840146851 },\n\t\t\t\t\t\t\t\t\t{ X = 0.367189813443885, Y = 0.0413767579570689 },\n\t\t\t\t\t\t\t\t\t{ X = 0.358158128516435, Y = 0.0444855662472243 },\n\t\t\t\t\t\t\t\t\t{ X = 0.3551969203435, Y = 0.0434492968171725 },\n\t\t\t\t\t\t\t\t\t{ X = 0.352235712170566, Y = 0.0409326424870466 },\n\t\t\t\t\t\t\t\t\t{ X = 0.350310926858158, Y = 0.0390081421169504 },\n\t\t\t\t\t\t\t\t\t{ X = 0.348386141545751, Y = 0.0361954108068098 },\n\t\t\t\t\t\t\t\t\t{ X = 0.342611785608528, Y = 0.0255366395262768 },\n\t\t\t\t\t\t\t\t\t{ X = 0.339502517026947, Y = 0.0196150999259807 },\n\t\t\t\t\t\t\t\t\t{ X = 0.333432040272431, Y = 0.006439674315322 },\n\t\t\t\t\t\t\t\t\t{ X = 0.313295824696476, Y = 0.00747594374537375 },\n\t\t\t\t\t\t\t\t\t{ X = 0.278894472361809, Y = 0.00795644891122282 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27680067001675, Y = 0.00711892797319935 },\n\t\t\t\t\t\t\t\t\t{ X = 0.275544388609715, Y = 0.0056532663316583 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27428810720268, Y = 0.00439698492462315 },\n\t\t\t\t\t\t\t\t\t{ X = 0.273241206030151, Y = 0.00251256281407031 },\n\t\t\t\t\t\t\t\t\t{ X = 0.272822445561139, Y = 0 },\n\t\t\t\t\t\t\t\t\t{ X = 0.271356783919598, Y = -0.00523450586264657 },\n\t\t\t\t\t\t\t\t\t{ X = 0.266394246387491, Y = -0.0481108437680686 },\n\t\t\t\t\t\t\t\t\t{ X = 0.262676734029166, Y = -0.0796135909393738 },\n\t\t\t\t\t\t\t\t\t{ X = 0.260307942852913, Y = -0.0494855281664076 },\n\t\t\t\t\t\t\t\t\t{ X = 0.25830916569664, Y = -0.0275005137684015 },\n\t\t\t\t\t\t\t\t\t{ X = 0.253923600829138, Y = 0.0165778567199526 },\n\t\t\t\t\t\t\t\t\t{ X = 0.244003553449808, Y = 0.0978389798754426 },\n\t\t\t\t\t\t\t\t\t{ X = 0.236156351791531, Y = 0.161584011843079 },\n\t\t\t\t\t\t\t\t\t{ X = 0.23304708320995, Y = 0.172094744633605 },\n\t\t\t\t\t\t\t\t\t{ X = 0.21720461948475, Y = 0.171650629163583 },\n\t\t\t\t\t\t\t\t\t{ X = 0.214983713355049, Y = 0.160251665433013 },\n\t\t\t\t\t\t\t\t\t{ X = 0.193257956448911, Y = 0.00157035175879394 },\n\t\t\t\t\t\t\t\t\t{ X = 0.192001675041876, Y = -0.00324539363484089 },\n\t\t\t\t\t\t\t\t\t{ X = 0.190117252931323, Y = -0.00240787269681747 },\n\t\t\t\t\t\t\t\t\t{ X = 0.188337520938023, Y = 0.00219849246231152 },\n\t\t\t\t\t\t\t\t\t{ X = 0.180485762144054, Y = 0.0149706867671691 },\n\t\t\t\t\t\t\t\t\t{ X = 0.174727805695142, Y = 0.0219849246231156 },\n\t\t\t\t\t\t\t\t\t{ X = 0.171901172529313, Y = 0.0264865996649917 },\n\t\t\t\t\t\t\t\t\t{ X = 0.164782244556114, Y = 0.0260678391959799 },\n\t\t\t\t\t\t\t\t\t{ X = 0.159024288107203, Y = 0.0172738693467337 },\n\t\t\t\t\t\t\t\t\t{ X = 0.153475711892797, Y = 0.0102072864321608 },\n\t\t\t\t\t\t\t\t\t{ X = 0.150806113902848, Y = 0.00759003350083753 },\n\t\t\t\t\t\t\t\t\t{ X = 0.134369765494137, Y = 0.00554857621440541 },\n\t\t\t\t\t\t\t\t\t{ X = 0.125052345058627, Y = 0.0193676716917923 },\n\t\t\t\t\t\t\t\t\t{ X = 0.116523541604975, Y = 0.0344189489267209 },\n\t\t\t\t\t\t\t\t\t{ X = 0.110453064850459, Y = 0.0450777202072539 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0980159905241339, Y = 0.0444855662472243 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0934261178560852, Y = 0.0338267949666914 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0803968018951732, Y = 0.010880829015544 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0795084394432928, Y = 0.00792005921539596 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0732899022801303, Y = 0.00762398223538119 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0654427006218538, Y = 0.00851221317542561 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0284275984601717, Y = 0.00792005921539596 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0197661905958437, Y = 0.00777133056077284 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0189772188244952, Y = -0.0200384162535804 },\n\t\t\t\t\t\t\t\t\t{ X = 0.011463567839196, Y = -0.0801926298157454 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00628140703517588, Y = -0.0409338358458961 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00460636515912893, Y = -0.0142378559463986 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00167504187604695, Y = 0.0208333333333334 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0134734971868523, Y = 0.150133254367782 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0153982824992597, Y = 0.171750074030204 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0352383772579212, Y = 0.172786496890731 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0376836060670542, Y = 0.149974715647133 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0570032573289902, Y = 0.0106603494225644 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0584838614154575, Y = -0.00436778205507843 },\n\t\t\t\t\t\t\t\t\t{ X = -0.061222978975422, Y = -0.00429375185075509 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0684779389991116, Y = 0.00866153390583357 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0745393634840871, Y = 0.0186348408710217 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0811871859296483, Y = 0.0270623953098827 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0886725293132328, Y = 0.025963149078727 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0943781407035176, Y = 0.0173785594639867 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0966289782244556, Y = 0.0125628140703518 },\n\t\t\t\t\t\t\t\t\t{ X = -0.100377640844634, Y = 0.00855934123203195 },\n\t\t\t\t\t\t\t\t\t{ X = -0.119627912040709, Y = 0.00606574957844963 },\n\t\t\t\t\t\t\t\t\t{ X = -0.127093802345059, Y = 0.0173785594639866 },\n\t\t\t\t\t\t\t\t\t{ X = -0.136976059599151, Y = 0.0350163333322173 },\n\t\t\t\t\t\t\t\t\t{ X = -0.140258080824615, Y = 0.0393622907282528 },\n\t\t\t\t\t\t\t\t\t{ X = -0.145272728140753, Y = 0.045527562249937 },\n\t\t\t\t\t\t\t\t\t{ X = -0.152913510152678, Y = 0.0455799073085635 },\n\t\t\t\t\t\t\t\t\t{ X = -0.157893715443271, Y = 0.0361128055773564 },\n\t\t\t\t\t\t\t\t\t{ X = -0.16750418760469, Y = 0.0196817420435511 },\n\t\t\t\t\t\t\t\t\t{ X = -0.170958961474037, Y = 0.0117252931323284 },\n\t\t\t\t\t\t\t\t\t{ X = -0.175565326633166, Y = 0.00670016750418756 },\n\t\t\t\t\t\t\t\t\t{ X = -0.199690430982273, Y = 0.00881638351663572 },\n\t\t\t\t\t\t\t\t\t{ X = -0.226495565131947, Y = 0.00820182121742841 },\n\t\t\t\t\t\t\t\t\t{ X = -0.230527638190955, Y = 0.00795644891122282 },\n\t\t\t\t\t\t\t\t\t{ X = -0.232830820770519, Y = 0.00125628140703515 },\n\t\t\t\t\t\t\t\t\t{ X = -0.239740368509213, Y = -0.0552763819095477 },\n\t\t\t\t\t\t\t\t\t{ X = -0.242619346733668, Y = -0.0704041038525963 },\n\t\t\t\t\t\t\t\t\t{ X = -0.245131909547739, Y = -0.054857621440536 },\n\t\t\t\t\t\t\t\t\t{ X = -0.247382747068677, Y = -0.0281616415410385 },\n\t\t\t\t\t\t\t\t\t{ X = -0.249144529527511, Y = -0.0116385525495407 },\n\t\t\t\t\t\t\t\t\t{ X = -0.255996446550192, Y = 0.0559668344684632 },\n\t\t\t\t\t\t\t\t\t{ X = -0.268433520876518, Y = 0.160349422564406 },\n\t\t\t\t\t\t\t\t\t{ X = -0.272727272727273, Y = 0.173230678116672 },\n\t\t\t\t\t\t\t\t\t{ X = -0.286496890731418, Y = 0.172786496890731 },\n\t\t\t\t\t\t\t\t\t{ X = -0.291234823808114, Y = 0.16020136215576 },\n\t\t\t\t\t\t\t\t\t{ X = -0.29774948178857, Y = 0.107491856677524 },\n\t\t\t\t\t\t\t\t\t{ X = -0.313147764287829, Y = -0.00103642286052708 },\n\t\t\t\t\t\t\t\t\t{ X = -0.31359194551377, Y = -0.00414569144210841 },\n\t\t\t\t\t\t\t\t\t{ X = -0.318181818181818, Y = 0.00340538939887469 },\n\t\t\t\t\t\t\t\t\t{ X = -0.328842167604383, Y = 0.0204323363932485 },\n\t\t\t\t\t\t\t\t\t{ X = -0.329434409238969, Y = 0.0279834172342316 },\n\t\t\t\t\t\t\t\t\t{ X = -0.343944329286349, Y = 0.0270950547823512 },\n\t\t\t\t\t\t\t\t\t{ X = -0.34572105419011, Y = 0.0196920343500148 },\n\t\t\t\t\t\t\t\t\t{ X = -0.351939591353272, Y = 0.0102161681966242 },\n\t\t\t\t\t\t\t\t\t{ X = -0.355493041160794, Y = 0.0075510808409831 },\n\t\t\t\t\t\t\t\t\t{ X = -0.429790984956368, Y = 0.0085538599497339 },\n\t\t\t\t\t\t\t\t\t{ X = -0.428568913067955, Y = 0.00876854909231772 },\n\t\t\t\t\t\t\t\t\t{ X = -0.452117676849551, Y = 0.0393934052209606 },\n\t\t\t\t\t\t\t\t\t{ X = -0.482743110520561, Y = 0.177582762170905 },\n\t\t\t\t\t\t\t\t\t{ X = -0.418534219279653, Y = 0.356557669865917 },\n\t\t\t\t\t\t\t\t\t{ X = -0.16887666730347, Y = 0.420869279922491 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0266107423700763, Y = 0.281859200383224 },\n\t\t\t\t\t\t\t\t\t{ X = -0.010556336183286, Y = 0.247021045194376 },\n\t\t\t\t\t\t\t\t\t{ X = 0.000601936665794389, Y = 0.217351478670505 },";
var HEART_TOP_KNOTS_LUA="0, 1, 2, 3, 3.167, 3.334, 3.501, 4.334, 5.334, 6.334, 7.334, 8.334, 9.334, 10.334, 10.601, 10.734, 11.334, 12.334, 13.334, 14.334, 15.334, 16.334, 17.334, 18.334, 19.334, 20.334, 21.334, 22.334, 23.334, 24.334, 25.334, 26.334, 27.334, 28.334, 29.334, 30.334, 31.334, 32.334, 33.334, 34.334, 35.334, 36.334, 37.334, 38.334, 39.334, 40.334, 41.334, 42.334, 43.334, 44.334, 45.334, 46.334, 47.334, 48.334, 49.334, 50.334, 51.334, 52.334, 53.334, 54.334, 55.334, 56.334, 57.334, 58.334, 59.334, 60.334, 61.334, 62.334, 63.334, 64.334, 65.334, 66.334, 67.334, 68.334, 69.334, 70.334, 71.334, 72.334, 73.334, 74.334, 75.334, 76.334, 77.334, 78.334, 79.334, 80.334, 81.334, 82.334, 83.334, 84.334, 85.334, 86.334, 87.334, 88.334, 89.334, 90.334, 91.334, 92.334, 93.334, 94.334, 95.334, 96.334, 97.334, 98.334, 99.334, 100.334, 101.334, 102.334, 103.334, 104.334, 105.334, 106.334, 107.334, 108.334, 109.334, 110.334, 111.334, 112.334, 113.334, 114.334, 115.334, 116.334, 117.334, 118.334, 119.334, 120.334, 121.334, 122.334, 123.334, 124.334, 125.334, 126.334, 127.334, 128.334, 129.334, 130.334, 131.334, 131.501, 132.334, 133.334";
var HEART_BOTTOM_POINTS_LUA="\t\t\t\t\t\t\t\t\t{ X = 0.0010816087218038, Y = -0.395655450921847 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00534821860936223, Y = -0.392429196462928 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00900033857279558, Y = -0.389755531989182 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0168629124906222, Y = -0.38468079741403 },\n\t\t\t\t\t\t\t\t\t{ X = 0.094025917841622, Y = -0.329963759440417 },\n\t\t\t\t\t\t\t\t\t{ X = 0.15846540374158, Y = -0.284113610047877 },\n\t\t\t\t\t\t\t\t\t{ X = 0.283575149132274, Y = -0.178045485198976 },\n\t\t\t\t\t\t\t\t\t{ X = 0.342422970013915, Y = -0.11639257791489 },\n\t\t\t\t\t\t\t\t\t{ X = 0.361889691278553, Y = -0.0936574972151565 },\n\t\t\t\t\t\t\t\t\t{ X = 0.3839249462985, Y = -0.0655649906709188 },\n\t\t\t\t\t\t\t\t\t{ X = 0.39846223428313, Y = -0.0468113975576662 },\n\t\t\t\t\t\t\t\t\t{ X = 0.419493441881502, Y = -0.0144730890999548 },\n\t\t\t\t\t\t\t\t\t{ X = 0.423790140208051, Y = -0.00972410673903212 },\n\t\t\t\t\t\t\t\t\t{ X = 0.414066033469019, Y = -0.00972410673903212 },\n\t\t\t\t\t\t\t\t\t{ X = 0.382632293080054, Y = -0.0101763907734057 },\n\t\t\t\t\t\t\t\t\t{ X = 0.374345615742667, Y = -0.00986643984281426 },\n\t\t\t\t\t\t\t\t\t{ X = 0.369426068038064, Y = -0.00273252569950616 },\n\t\t\t\t\t\t\t\t\t{ X = 0.364792713567839, Y = 0.00607202680066998 },\n\t\t\t\t\t\t\t\t\t{ X = 0.360631281407035, Y = 0.0140284757118928 },\n\t\t\t\t\t\t\t\t\t{ X = 0.358249581239531, Y = 0.0191059463986601 },\n\t\t\t\t\t\t\t\t\t{ X = 0.354716289782244, Y = 0.0130600921273032 },\n\t\t\t\t\t\t\t\t\t{ X = 0.348146984924623, Y = 0.000314070351758788 },\n\t\t\t\t\t\t\t\t\t{ X = 0.344168760469012, Y = -0.00748534338358453 },\n\t\t\t\t\t\t\t\t\t{ X = 0.342336683417085, Y = -0.00916038525963148 },\n\t\t\t\t\t\t\t\t\t{ X = 0.34123743718593, Y = -0.0102072864321608 },\n\t\t\t\t\t\t\t\t\t{ X = 0.336212311557789, Y = -0.0107307370184255 },\n\t\t\t\t\t\t\t\t\t{ X = 0.329983249581239, Y = -0.0104166666666667 },\n\t\t\t\t\t\t\t\t\t{ X = 0.326057370184255, Y = -0.0105737018425461 },\n\t\t\t\t\t\t\t\t\t{ X = 0.294702680067002, Y = -0.0102072864321608 },\n\t\t\t\t\t\t\t\t\t{ X = 0.289415829145729, Y = -0.0103119765494137 },\n\t\t\t\t\t\t\t\t\t{ X = 0.28821189279732, Y = -0.0147613065326633 },\n\t\t\t\t\t\t\t\t\t{ X = 0.287060301507538, Y = -0.0217755443886097 },\n\t\t\t\t\t\t\t\t\t{ X = 0.276329564489112, Y = -0.0979899497487437 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27339824120603, Y = -0.122592127303183 },\n\t\t\t\t\t\t\t\t\t{ X = 0.27250837520938, Y = -0.128768844221106 },\n\t\t\t\t\t\t\t\t\t{ X = 0.267221524288107, Y = -0.13463149078727 },\n\t\t\t\t\t\t\t\t\t{ X = 0.259788525963149, Y = -0.134893216080402 },\n\t\t\t\t\t\t\t\t\t{ X = 0.253611809045226, Y = -0.133375209380235 },\n\t\t\t\t\t\t\t\t\t{ X = 0.250680485762144, Y = -0.125575795644891 },\n\t\t\t\t\t\t\t\t\t{ X = 0.248586683417085, Y = -0.104742462311558 },\n\t\t\t\t\t\t\t\t\t{ X = 0.237227805695142, Y = -0.000366415410385235 },\n\t\t\t\t\t\t\t\t\t{ X = 0.22660175879397, Y = 0.0904522613065326 },\n\t\t\t\t\t\t\t\t\t{ X = 0.224926716917923, Y = 0.104166666666667 },\n\t\t\t\t\t\t\t\t\t{ X = 0.221838358458961, Y = 0.0866834170854272 },\n\t\t\t\t\t\t\t\t\t{ X = 0.215556951423786, Y = 0.0324015912897823 },\n\t\t\t\t\t\t\t\t\t{ X = 0.207659902770553, Y = -0.031416763044217 },\n\t\t\t\t\t\t\t\t\t{ X = 0.203098827470687, Y = -0.0390494137353434 },\n\t\t\t\t\t\t\t\t\t{ X = 0.193729061976549, Y = -0.0405150753768845 },\n\t\t\t\t\t\t\t\t\t{ X = 0.18498743718593, Y = -0.0280569514237856 },\n\t\t\t\t\t\t\t\t\t{ X = 0.179020100502513, Y = -0.0192106365159129 },\n\t\t\t\t\t\t\t\t\t{ X = 0.170958961474037, Y = -0.00544388609715241 },\n\t\t\t\t\t\t\t\t\t{ X = 0.168708123953099, Y = -0.000994556113902867 },\n\t\t\t\t\t\t\t\t\t{ X = 0.16750418760469, Y = -0.00528685092127301 },\n\t\t\t\t\t\t\t\t\t{ X = 0.163578308207705, Y = -0.0108877721943048 },\n\t\t\t\t\t\t\t\t\t{ X = 0.152585845896147, Y = -0.0105213567839196 },\n\t\t\t\t\t\t\t\t\t{ X = 0.124005443886097, Y = -0.0108877721943049 },\n\t\t\t\t\t\t\t\t\t{ X = 0.118561557788945, Y = -0.00800879396984927 },\n\t\t\t\t\t\t\t\t\t{ X = 0.110448073701842, Y = 0.00837520938023451 },\n\t\t\t\t\t\t\t\t\t{ X = 0.107307370184255, Y = 0.0145519262981575 },\n\t\t\t\t\t\t\t\t\t{ X = 0.105056532663317, Y = 0.0182160804020101 },\n\t\t\t\t\t\t\t\t\t{ X = 0.102701005025126, Y = 0.0125628140703518 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0931742043551089, Y = -0.00528685092127301 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0914991624790621, Y = -0.00779941373534337 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0873115577889448, Y = -0.0111494974874372 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0654836683417085, Y = -0.0100502512562814 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0436034338358459, Y = -0.0101549413735343 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0393634840871022, Y = -0.00942211055276382 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0369032663316583, Y = -0.0128245393634841 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0363274706867671, Y = -0.019001256281407 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0317734505862647, Y = -0.0525020938023451 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0235552763819096, Y = -0.110134003350084 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0207286432160805, Y = -0.127198492462312 },\n\t\t\t\t\t\t\t\t\t{ X = 0.0157558626465661, Y = -0.135207286432161 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00664782244556117, Y = -0.135416666666667 },\n\t\t\t\t\t\t\t\t\t{ X = 0.00141331658291455, Y = -0.12944932998325 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00206219690002298, Y = -0.121840912429824 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00314070351758794, Y = -0.0956867671691792 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0226130653266332, Y = 0.0904522613065326 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0266061226258616, Y = 0.111660995777615 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0301507537688442, Y = 0.0820770519262981 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0450440447109334, Y = -0.0323117921385743 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0465985639203494, Y = -0.0386779184247538 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0600710637352876, Y = -0.0403064623584277 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0640683988452143, Y = -0.0312754459989636 },\n\t\t\t\t\t\t\t\t\t{ X = -0.074023895468993, Y = -0.0159563567255791 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0802798134576949, Y = -0.00536679250869793 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0832408024280109, Y = -0.000703234880450043 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0865719150196165, Y = -0.00743948478791912 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0893108298171589, Y = -0.0103264490339774 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0952327395162113, Y = -0.0101095417236688 },\n\t\t\t\t\t\t\t\t\t{ X = -0.128321859501073, Y = -0.0104004737582353 },\n\t\t\t\t\t\t\t\t\t{ X = -0.133207491302095, Y = -0.00884595454881937 },\n\t\t\t\t\t\t\t\t\t{ X = -0.136834702790732, Y = -0.00255385298689764 },\n\t\t\t\t\t\t\t\t\t{ X = -0.141061671440943, Y = 0.00477061417811925 },\n\t\t\t\t\t\t\t\t\t{ X = -0.144903397734843, Y = 0.012769264934488 },\n\t\t\t\t\t\t\t\t\t{ X = -0.14749426308387, Y = 0.0186172181508624 },\n\t\t\t\t\t\t\t\t\t{ X = -0.15030720260567, Y = 0.0123251165889408 },\n\t\t\t\t\t\t\t\t\t{ X = -0.155470862048843, Y = 0.00224295509108357 },\n\t\t\t\t\t\t\t\t\t{ X = -0.160004441483455, Y = -0.00581094085424533 },\n\t\t\t\t\t\t\t\t\t{ X = -0.162225183211193, Y = -0.00966022651565624 },\n\t\t\t\t\t\t\t\t\t{ X = -0.167554963357762, Y = -0.010548523206751 },\n\t\t\t\t\t\t\t\t\t{ X = -0.188503801760545, Y = -0.0103897620005463 },\n\t\t\t\t\t\t\t\t\t{ X = -0.207746478491014, Y = -0.0107546996326667 },\n\t\t\t\t\t\t\t\t\t{ X = -0.216263231919461, Y = -0.0100303501369458 },\n\t\t\t\t\t\t\t\t\t{ X = -0.217595676956103, Y = -0.0163224516988674 },\n\t\t\t\t\t\t\t\t\t{ X = -0.218335924198682, Y = -0.0270560367162632 },\n\t\t\t\t\t\t\t\t\t{ X = -0.227218891109631, Y = -0.0860537419498113 },\n\t\t\t\t\t\t\t\t\t{ X = -0.233066844326005, Y = -0.126397216670368 },\n\t\t\t\t\t\t\t\t\t{ X = -0.235065511880968, Y = -0.134836035235769 },\n\t\t\t\t\t\t\t\t\t{ X = -0.251721074838996, Y = -0.135650307202606 },\n\t\t\t\t\t\t\t\t\t{ X = -0.254904137982086, Y = -0.122473906284699 },\n\t\t\t\t\t\t\t\t\t{ X = -0.277185579983715, Y = 0.0844251980161374 },\n\t\t\t\t\t\t\t\t\t{ X = -0.28088681619661, Y = 0.104337848841513 },\n\t\t\t\t\t\t\t\t\t{ X = -0.283403656821378, Y = 0.0846472721889111 },\n\t\t\t\t\t\t\t\t\t{ X = -0.296135909393737, Y = -0.0160263528018358 },\n\t\t\t\t\t\t\t\t\t{ X = -0.298627157061256, Y = -0.0305037920772282 },\n\t\t\t\t\t\t\t\t\t{ X = -0.300429343400696, Y = -0.0384558442519801 },\n\t\t\t\t\t\t\t\t\t{ X = -0.313087571248797, Y = -0.0403064623584277 },\n\t\t\t\t\t\t\t\t\t{ X = -0.318713450292398, Y = -0.0309793471019321 },\n\t\t\t\t\t\t\t\t\t{ X = -0.334184617662299, Y = -0.00751350951217705 },\n\t\t\t\t\t\t\t\t\t{ X = -0.337293656081131, Y = -0.000111037086386878 },\n\t\t\t\t\t\t\t\t\t{ X = -0.339588422533126, Y = -0.00544081723295586 },\n\t\t\t\t\t\t\t\t\t{ X = -0.341365015915316, Y = -0.00869790510030349 },\n\t\t\t\t\t\t\t\t\t{ X = -0.34580649937079, Y = -0.0101783995854615 },\n\t\t\t\t\t\t\t\t\t{ X = -0.412724850099933, Y = -0.0101043748612036 },\n\t\t\t\t\t\t\t\t\t{ X = -0.418572803316308, Y = -0.0101783995854615 },\n\t\t\t\t\t\t\t\t\t{ X = -0.416500111037086, Y = -0.0140276852468725 },\n\t\t\t\t\t\t\t\t\t{ X = -0.411040252896729, Y = -0.0232807757791102 },\n\t\t\t\t\t\t\t\t\t{ X = -0.350816582914573, Y = -0.105841708542714 },\n\t\t\t\t\t\t\t\t\t{ X = -0.272194304857621, Y = -0.185929648241206 },\n\t\t\t\t\t\t\t\t\t{ X = -0.190117252931323, Y = -0.257118927973199 },\n\t\t\t\t\t\t\t\t\t{ X = -0.101549413735343, Y = -0.323492462311558 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0349664991624791, Y = -0.370917085427136 },\n\t\t\t\t\t\t\t\t\t{ X = -0.0158515611028081, Y = -0.384066372323409 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00695379824977622, Y = -0.390187199716325 },\n\t\t\t\t\t\t\t\t\t{ X = -0.00391115918238408, Y = -0.393253415936144 },";
var HEART_BOTTOM_KNOTS_LUA="0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142";

function buildHeartShapeNode(name, pointsLua, knotsLua, pos){
  var L=[];
  L.push('\t\t\t\t'+name+' = BSplineMask {');
  L.push('\t\t\t\t\tDrawMode = "ModifyOnly",');
  L.push('\t\t\t\t\tDrawMode2 = "InsertAndModify",');
  L.push('\t\t\t\t\tCtrlWZoom = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tPolyline = Input {');
  L.push('\t\t\t\t\t\t\tValue = BSplinePolyline {');
  L.push('\t\t\t\t\t\t\t\tClosed = true,');
  L.push('\t\t\t\t\t\t\t\tPoints = {');
  L.push('\t\t\t\t\t\t\t\t\t'+pointsLua);
  L.push('\t\t\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\t\t\tOrder = 4,');
  L.push('\t\t\t\t\t\t\t\tType = "Tensioned",');
  L.push('\t\t\t\t\t\t\t\tKnots = { '+knotsLua+' }');
  L.push('\t\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPolyline2 = Input {');
  L.push('\t\t\t\t\t\t\tValue = BSplinePolyline { Order = 4, Type = "Tensioned", Knots = { } },');
  L.push('\t\t\t\t\t\t\tDisabled = true,');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}

function buildDotMaskNode(name, centerInput, diaPx, pos, w, h){
  w=w||1920; h=h||1080;
  // Fusion's EllipseMask Width and Height are both normalized against the same
  // base (not independently against MaskWidth vs MaskHeight) — every real
  // Fusion-exported circular ellipse sets Width and Height to the identical
  // fraction, even on a non-square 1920x1080 canvas. Using MaskHeight as that
  // shared base and linking Height to Width via a live Expression (matching
  // the pattern Fusion itself generates when you shift-drag an ellipse handle)
  // keeps the dot a true circle, including if Width is hand-adjusted later.
  var frac=diaPx/h;
  var L=[];
  L.push('\t\t\t\t'+name+' = EllipseMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+frac.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+frac.toFixed(6)+', Expression = "Width", },');
  L.push('\t\t\t\t\t\tCenter = '+centerInput+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}
// Rescales an [R,G,B] (0-255) color so its HSV Value/Brightness component
// (V = max(R,G,B)/255) becomes exactly targetV, while preserving Hue and
// Saturation. Scaling all channels by the same factor keeps H and S fixed
// since both only depend on the ratios between channels, not their absolute
// scale — and the resulting max channel lands exactly at targetV*255, never
// overflowing, because every other channel is <= the original max.
function forceHsvValue(rgb, targetV){
  var maxC=Math.max(rgb[0],rgb[1],rgb[2]);
  if(maxC<=0) return [targetV*255, targetV*255, targetV*255];
  var k=(targetV*255)/maxC;
  return [rgb[0]*k, rgb[1]*k, rgb[2]*k];
}
function buildBackgroundNode(name, maskSourceOp, rgb, pos, alpha, w, h){
  w=w||1920; h=h||1080;
  var L=[];
  L.push('\t\t\t\t'+name+' = Background {');
  L.push('\t\t\t\t\tInputs = {');
  if(maskSourceOp) L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "'+maskSourceOp+'", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+(rgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+(rgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+(rgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = '+(alpha===undefined?1:alpha).toFixed(6)+', },');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}
function buildMergeNode(name, bgOp, fgOp, pos){
  return '\t\t\t\t'+name+' = Merge {\n\t\t\t\t\tInputs = {\n\t\t\t\t\t\tBackground = Input { SourceOp = "'+bgOp+'", Source = "Output", },\n\t\t\t\t\t\tForeground = Input { SourceOp = "'+fgOp+'", Source = "Output", },\n\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, },\n\t\t\t\t\t},\n\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },\n\t\t\t\t},';
}
// Lowers overlay brightness inside Fusion itself (rather than just darkening the
// picked colors) via a BrightnessContrast tool inserted right before the group's
// Output. BRIGHTNESS_FACTOR is an approximation tuned to match the muted look in
// the reference screenshots — fine-tune per-project with the color pickers, or by
// hand-adjusting this node's Brightness slider once imported into Fusion.
var OVERLAY_BRIGHTNESS_FACTOR=0.82;
function buildBrightnessNode(name, sourceOp, pos){
  var L=[];
  L.push('\t\t\t\t'+name+' = BrightnessContrast {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tInput = Input { SourceOp = "'+sourceOp+'", Source = "Output", },');
  L.push('\t\t\t\t\t\tRedBrightness = Input { Value = '+OVERLAY_BRIGHTNESS_FACTOR+', },');
  L.push('\t\t\t\t\t\tGreenBrightness = Input { Value = '+OVERLAY_BRIGHTNESS_FACTOR+', },');
  L.push('\t\t\t\t\t\tBlueBrightness = Input { Value = '+OVERLAY_BRIGHTNESS_FACTOR+', },');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return L.join('\n');
}
function toFusionMaskCoord(px, py, W, H){
  // Fusion Polyline points are plain fractions of each axis's own dimension —
  // no cross-axis aspect multiplication. Fusion reconstructs the correct shape
  // at render time using the node's actual Width/Height, the same way a
  // RectangleMask's Center/Width are plain 0-1 fractions with no aspect math.
  return { x: px/W - 0.5, y: 0.5 - (py/H) };
}
// Catmull-Rom-style tangent handles, stored as LX/LY/RX/RY OFFSETS from the point
// (confirmed against the real reference files) — used for a smooth profile line.
function polylinePointHandles(ptsArr, i, closed){
  var n=ptsArr.length;
  var prev=ptsArr[i>0?i-1:(closed?n-1:0)];
  var next=ptsArr[i<n-1?i+1:(closed?0:n-1)];
  var dx=(next.x-prev.x)/6, dy=(next.y-prev.y)/6;
  return { LX:-dx, LY:-dy, RX:dx, RY:dy };
}
function polylineShapePointsLua(ptsArr, closed, smooth, indent){
  var pad=indent||'\t\t\t\t\t\t';
  var L=[];
  var n=ptsArr.length;
  for(var i=0;i<n;i++){
    if(smooth){
      var h=polylinePointHandles(ptsArr,i,closed);
      var parts=['Linear = true','X = '+ptsArr[i].x.toFixed(6),'Y = '+ptsArr[i].y.toFixed(6)];
      // Confirmed against a real Fusion export: an open (non-closed) curve's first
      // point has no LX/LY (no incoming handle) and its last point has no RX/RY
      // (no outgoing handle) — every other point, and every point on a closed
      // curve, has both.
      if(closed || i>0) { parts.push('LX = '+h.LX.toFixed(6)); parts.push('LY = '+h.LY.toFixed(6)); }
      if(closed || i<n-1) { parts.push('RX = '+h.RX.toFixed(6)); parts.push('RY = '+h.RY.toFixed(6)); }
      L.push(pad+'{ '+parts.join(', ')+', },');
    } else {
      L.push(pad+'{ Linear = true, X = '+ptsArr[i].x.toFixed(6)+', Y = '+ptsArr[i].y.toFixed(6)+', },');
    }
  }
  return L.join('\n');
}
// Returns {node, sibling}: node = the PolylineMask tool (goes inside the group's
// own Tools list); sibling = the BezierSpline/Polyline holder tool that actually
// carries the shape's points (goes as a top-level sibling of the GroupOperator,
// same as the animated-slider siblings).
// Builds a self-contained PolylineMask node with its Points embedded DIRECTLY
// inline (no external sibling tool). Confirmed against a real Fusion-exported
// Route.setting (generated by Resolve itself after importing an SVG) — that file
// embeds static shape data exactly this way, nested inside a GroupOperator, with
// no separate BezierSpline/SourceOp indirection at all. The earlier external-
// sibling approach (proven correct for hand-drawn, currently-selected shapes in
// Fusion's UI) is apparently not what's needed for a shape a Group merely holds.
function buildPolylineShapeNodes(maskName, splineToolName, pts, closed, solid, borderWidthFrac, smooth, pos, w, h, publishSourceOp, borderWidthExpr){
  w=w||1920; h=h||1080;
  var L=[];
  L.push('\t\t\t\t'+maskName+' = PolylineMask {');
  L.push('\t\t\t\t\tDrawMode = "ModifyOnly",');
  L.push('\t\t\t\t\tDrawMode2 = "InsertAndModify",');
  L.push('\t\t\t\t\tCtrlWZoom = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tSolid = Input { Value = '+(solid?1:0)+', },');
  if(!solid){
    if(borderWidthExpr){
      // Live-linked in Fusion itself: dragging MainPath's own BorderWidth
      // slider recalculates this one automatically, same tool-scope reference
      // pattern confirmed against the reference files' Center Expression link.
      L.push('\t\t\t\t\t\tBorderWidth = Input { Value = '+borderWidthFrac.toFixed(6)+', Expression = "'+borderWidthExpr+'", },');
    } else {
      L.push('\t\t\t\t\t\tBorderWidth = Input { Value = '+borderWidthFrac.toFixed(6)+', },');
    }
  }
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = '+w+', },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = '+h+', },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  if(publishSourceOp){
    // Points live on a published top-level PublishPolyLine tool instead of being
    // embedded here — this is what "Right-click → Publish" produces, and it's
    // required so Path1 (PolyPath) can read the exact same polyline to compute
    // the animated dot's position along it.
    L.push('\t\t\t\t\t\tPolyline = Input {');
    L.push('\t\t\t\t\t\t\tSourceOp = "'+publishSourceOp+'",');
    L.push('\t\t\t\t\t\t\tSource = "Value",');
    L.push('\t\t\t\t\t\t},');
  } else {
    L.push('\t\t\t\t\t\tPolyline = Input {');
    L.push('\t\t\t\t\t\t\tValue = Polyline {');
    if(closed) L.push('\t\t\t\t\t\t\t\tClosed = true,');
    L.push('\t\t\t\t\t\t\t\tPoints = {');
    L.push(polylineShapePointsLua(pts, closed, smooth, '\t\t\t\t\t\t\t\t\t'));
    L.push('\t\t\t\t\t\t\t\t}');
    L.push('\t\t\t\t\t\t\t},');
    L.push('\t\t\t\t\t\t},');
  }
  L.push('\t\t\t\t\t\tPolyline2 = Input {');
  L.push('\t\t\t\t\t\t\tValue = Polyline { },');
  L.push('\t\t\t\t\t\t\tDisabled = true,');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { '+pos[0]+', '+pos[1]+' } },');
  L.push('\t\t\t\t},');
  return { node: L.join('\n'), sibling: '' };
}

// Route — ONE .setting file: shadow line + main line + shadow dot + main dot, all merged
function buildRouteSetting(){
  var tW=parseFloat(document.getElementById('trackW').value)||4;
  var sW=tW*SHADOW_WIDTH_RATIO;
  var sOf=parseFloat(document.getElementById('shadowOffset').value)||5;
  var dR=parseFloat(document.getElementById('dotR').value)||8;
  var tc=hexToRgb(document.getElementById('trackColor').value);
  var sc=hexToRgb(document.getElementById('shadowColor').value);
  var dc=hexToRgb(document.getElementById('dotColor').value);

  var mnLa=Infinity,mxLa=-Infinity,mnLo=Infinity,mxLo=-Infinity;
  for(var i=0;i<rawPoints.length;i++){
    if(rawPoints[i].lat<mnLa)mnLa=rawPoints[i].lat; if(rawPoints[i].lat>mxLa)mxLa=rawPoints[i].lat;
    if(rawPoints[i].lon<mnLo)mnLo=rawPoints[i].lon; if(rawPoints[i].lon>mxLo)mxLo=rawPoints[i].lon;
  }
  var laR=(mxLa-mnLa)||0.0001, loR=(mxLo-mnLo)||0.0001;
  // Edge margin (Fusion-side clipping fix): the outline dot is the largest thing
  // drawn (shadowDotDiaPx below) and it can additionally be offset by the shadow
  // offset. Reserve room on all four sides so a point that lands at the extreme
  // edge of the GPS track never pushes the dot (or its shadow) past the frame
  // boundary once rendered inside Fusion at a hard 1920x1080.
  var shadowDotDiaPxPre=dR*2*1.15;
  var MARGIN=Math.ceil(shadowDotDiaPxPre/2)+Math.ceil(sOf)+6;
  var boxW=1920-MARGIN*2, boxH=1080-MARGIN*2;
  var sw=boxW,sh=sw*(laR/loR); if(sh>boxH){sh=boxH;sw=sh*(loR/laR);}
  var padX=(1920-sw)/2, padY=(1080-sh)/2;
  var pxPts=[]; // pixel-space points, used both for the line and for the dot's Center (0-1 fraction)
  for(var i=0;i<rawPoints.length;i++){
    var px=padX+(rawPoints[i].lon-mnLo)*(sw/loR);
    var py=padY+(sh-(rawPoints[i].lat-mnLa)*(sh/laR));
    pxPts.push({px:px, py:py});
  }
  var maskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px,p.py,1920,1080);});
  var sOxPx=sOf, sOyPx=-sOf; // shift shadow down-right on screen
  var shadowMaskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px+sOxPx,p.py-sOyPx,1920,1080);});

  // Dot position is no longer baked as its own per-frame X/Y keyframes. Instead
  // (confirmed against corrected reference files): MainPath is published,
  // Path1 (PolyPath) walks it using a scalar 0→1 displacement spline, and
  // MainDot's Center simply reads Path1's Position output. OutlineDot no
  // longer carries its own duplicate keyframe set — it follows MainDot live
  // via a Fusion Expression, same as the reference.
  var dotCenter01=pxPts.map(function(p){return {x:p.px/1920, y:1-(p.py/1080)};});
  var dispKF=buildDisplacementKeyframes(rawPoints);
  var dotDiaPx=dR*2, shadowDotDiaPx=dR*2*1.15;

  var mainShape=buildPolylineShapeNodes('MainPath','MainPathPolyline',maskPts,false,false,tW/1080,false,[0,50],1920,1080,'Publish1');
  var shadowShape=buildPolylineShapeNodes('ShadowPath','ShadowPathPolyline',shadowMaskPts,false,false,sW/1080,false,[0,150],1920,1080,undefined,'MainPath.BorderWidth*'+SHADOW_WIDTH_RATIO.toFixed(6));

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tRouteOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "BrightAdjust", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 566, 132.364, 283, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push(buildBackgroundNode('BackgroundCanvas', null, [0,0,0], [-100,100], 0, 1920, 1080));
  L.push(shadowShape.node);
  L.push(buildBackgroundNode('BackgroundShadow', 'ShadowPath', sc, [100,150], undefined, 1920, 1080));
  L.push(mainShape.node);
  L.push(buildBackgroundNode('BackgroundMain', 'MainPath', tc, [100,50], undefined, 1920, 1080));
  L.push(buildMergeNode('Merge1', 'BackgroundShadow', 'BackgroundMain', [200,100]));
  L.push(buildDotMaskNode('OutlineDotMask', 'Input { Value = { '+dotCenter01[0].x.toFixed(6)+', '+dotCenter01[0].y.toFixed(6)+' }, Expression = "MainDotMask.Center", }', shadowDotDiaPx, [300,150], 1920, 1080));
  L.push(buildBackgroundNode('BackgroundOutlineDot', 'OutlineDotMask', sc, [400,150], undefined, 1920, 1080));
  L.push(buildMergeNode('Merge2', 'Merge1', 'BackgroundOutlineDot', [500,100]));
  L.push(buildDotMaskNode('MainDotMask', polyPathPositionInput('Path1'), dotDiaPx, [300,50], 1920, 1080));
  L.push(buildBackgroundNode('BackgroundMainDot', 'MainDotMask', dc, [400,50], undefined, 1920, 1080));
  L.push(buildMergeNode('Merge3', 'Merge2', 'BackgroundMainDot', [600,100]));
  L.push(buildMergeNode('Merge4', 'BackgroundCanvas', 'Merge3', [700,100]));
  L.push(buildBrightnessNode('BrightAdjust', 'Merge4', [800,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildPublishPolyLineTool('Publish1', maskPts, false));
  L.push(buildPolyPathTool('Path1', 'Path1Displacement', 'Publish1'));
  L.push(buildBezierSplineTool('Path1Displacement', dispKF, false, 2));
  L.push('\t},');
  L.push('\tActiveTool = "RouteOverlay",');
  L.push('}');
  return L.join('\n');
}

// Elevation — ONE .setting file: optional fill + smooth main line + animated dot
function buildElevSetting(){
  var elevPts=rawPoints.filter(function(p){return p.ele!==null && !isNaN(p.ele);});
  if(!elevPts.length) return null;
  var lc=hexToRgb(document.getElementById('elevColor').value);
  var dc=hexToRgb(document.getElementById('elevDotColor').value);
  var fillOn=document.getElementById('elevFill').value==='1';
  var fillC=hexToRgb(document.getElementById('elevFillColor').value);
  var lw=parseFloat(document.getElementById('elevLineW').value)||2;
  var sc=hexToRgb(document.getElementById('elevShadowColor').value);
  var sOf=parseFloat(document.getElementById('elevShadowOffset').value)||4;
  var sw=lw*SHADOW_WIDTH_RATIO;

  // Full-frame canvas — matches Route, and matches a normal HD project. The
  // graph itself only occupies a band near the bottom (GRAPH_W x GRAPH_H,
  // from the existing Width/Height px controls), inset by a fixed margin, so
  // dropping this straight into a 1920x1080 timeline needs no manual
  // resizing and nothing clips off the edges. (Assumes a 1920x1080 project —
  // if yours is a different resolution, scale the whole group after import.)
  var FULL_CW=1920, FULL_CH=1080;
  var GRAPH_W=parseInt(document.getElementById('elevW').value)||1920;
  var GRAPH_H=parseInt(document.getElementById('elevH').value)||300;
  var MARGIN_BOTTOM=40;
  var OFFSET_X=Math.max(0,(FULL_CW-GRAPH_W)/2);
  var BAND_TOP=FULL_CH-MARGIN_BOTTOM-GRAPH_H, BAND_BOTTOM=FULL_CH-MARGIN_BOTTOM;
  var CW=FULL_CW, CH=FULL_CH;

  // Fusion-side clipping fix: at the very start/end of the track the dot sits
  // exactly at the graph's left/right edge. Inset the x-domain by half the dot's
  // diameter (plus a small buffer) on both sides so it never renders past the
  // frame boundary.
  var dotDiaPx=12, shadowDotDiaPx=12*1.15;
  var MARGIN_X=Math.ceil(dotDiaPx/2)+6;
  var xy=buildElevXY(elevPts,GRAPH_W-MARGIN_X*2,GRAPH_H,0); // pixel-space x/y within the inset graph band
  var pxPts=[];
  for(var i=0;i<xy.xs.length;i++) pxPts.push({px:xy.xs[i]+OFFSET_X+MARGIN_X, py:BAND_TOP+xy.ys[i]});
  var maskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px,p.py,CW,CH);});
  // Elevation-line shadow: a duplicate of the main line, offset in pixel space
  // and drawn slightly wider — same technique Route already uses for its own
  // shadow (not Fusion's native Shadow tool, which would need an extra
  // Merge/blur stage per layer for a similar look; this stays consistent with
  // the rest of the file and is already proven to import cleanly).
  var sOxPx=sOf, sOyPx=-sOf;
  var shadowMaskPts=pxPts.map(function(p){return toFusionMaskCoord(p.px+sOxPx,p.py-sOyPx,CW,CH);});
  var dotCenter01=pxPts.map(function(p){return {x:p.px/CW, y:1-(p.py/CH)};});

  // Same path-following mechanism as Route: MainPath is published, Path1
  // (PolyPath) walks it via a baked scalar displacement spline, and the dot's
  // Center reads Path1's Position output directly — no more baked X/Y keyframes.
  var dispKF=buildDisplacementKeyframes(elevPts);

  var mainShape=buildPolylineShapeNodes('MainPath','MainPathPolyline',maskPts,false,false,lw/CH,true,[0,50],CW,CH,'Publish1');
  var shadowShape=buildPolylineShapeNodes('ShadowPath','ShadowPathPolyline',shadowMaskPts,false,false,sw/CH,true,[0,150],CW,CH,undefined,'MainPath.BorderWidth*'+SHADOW_WIDTH_RATIO.toFixed(6));

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tElevationOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "BrightAdjust", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 0, 0 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 676, 132.364, 338, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push(buildBackgroundNode('BackgroundCanvas', null, [0,0,0], [-100,100], 0, CW, CH));
  var lastBg='BackgroundCanvas', mergeN=0, xPos=0;
  function chain(nextBg){
    mergeN++; xPos+=100;
    var name='Merge'+mergeN;
    L.push(buildMergeNode(name, lastBg, nextBg, [xPos,100]));
    lastBg=name;
  }
  if(fillOn){
    var fillMaskPts=maskPts.concat([
      toFusionMaskCoord(pxPts[pxPts.length-1].px, BAND_BOTTOM, CW, CH),
      toFusionMaskCoord(pxPts[0].px, BAND_BOTTOM, CW, CH)
    ]);
    var fillShape=buildPolylineShapeNodes('FillPath','FillPathPolyline',fillMaskPts,true,true,0,false,[0,150],CW,CH);
    L.push(fillShape.node);
    // Fill brightness is locked to HSV Val=0.76 regardless of the picked hue —
    // matches the reference inspector setting — while Hue/Saturation still
    // follow the user's Fill color picker.
    L.push(buildBackgroundNode('BackgroundFill', 'FillPath', forceHsvValue(fillC,0.76), [100,150], 0.15, CW, CH));
    chain('BackgroundFill');
  }
  L.push(shadowShape.node);
  L.push(buildBackgroundNode('BackgroundShadow', 'ShadowPath', sc, [100,150], undefined, CW, CH));
  chain('BackgroundShadow');
  L.push(mainShape.node);
  L.push(buildBackgroundNode('BackgroundMain', 'MainPath', lc, [100,50], undefined, CW, CH));
  chain('BackgroundMain');
  L.push(buildDotMaskNode('OutlineDotMask', 'Input { Value = { '+dotCenter01[0].x.toFixed(6)+', '+dotCenter01[0].y.toFixed(6)+' }, Expression = "MainDotMask.Center", }', shadowDotDiaPx, [300,150], CW, CH));
  L.push(buildBackgroundNode('BackgroundOutlineDot', 'OutlineDotMask', sc, [400,150], undefined, CW, CH));
  chain('BackgroundOutlineDot');
  L.push(buildDotMaskNode('MainDotMask', polyPathPositionInput('Path1'), dotDiaPx, [300,50], CW, CH));
  L.push(buildBackgroundNode('BackgroundMainDot', 'MainDotMask', dc, [400,50], undefined, CW, CH));
  chain('BackgroundMainDot');
  L.push(buildBrightnessNode('BrightAdjust', lastBg, [xPos+100,100]));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildPublishPolyLineTool('Publish1', maskPts, false));
  L.push(buildPolyPathTool('Path1', 'Path1Displacement', 'Publish1'));
  L.push(buildBezierSplineTool('Path1Displacement', dispKF, false, 2));
  L.push('\t},');
  L.push('\tActiveTool = "ElevationOverlay",');
  L.push('}');
  return L.join('\n');
}

function buildHRSetting(){
  var hrKF=buildKeyframeList(hrData,function(p){return Math.round(p.hr);});
  var textRgb=hexToRgb(document.getElementById('hrColor').value);
  var textSize=parseFloat(document.getElementById('hrSize').value)||0.07;
  // Both heart halves are driven from this single picker so they always move
  // together — there's deliberately no separate top/bottom control.
  var heartRgb=hexToRgb(document.getElementById('hrHeartColor').value);
  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tHeartRate = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = {');
  L.push('\t\t\t\tOutput1 = InstanceOutput {');
  L.push('\t\t\t\t\tSourceOp = "Merge3",');
  L.push('\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t}');
  L.push('\t\t\t},');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 1148.97, 18.5755 },');
  L.push('\t\t\t\tFlags = {');
  L.push('\t\t\t\t\tAllowPan = false,');
  L.push('\t\t\t\t\tAutoSnap = true,');
  L.push('\t\t\t\t\tRemoveRouters = true');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tSize = { 393.511, 139.781, 196.756, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { -990.532, -3.75992 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tRectangle1 = RectangleMask {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tBorderWidth = Input { Value = -0.181, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.494180407371484, 0.5 }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 0.378, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.472, },');
  L.push('\t\t\t\t\t\tCornerRadius = Input { Value = 1, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 861.394, 10.919 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground2 = Background {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Rectangle1",');
  L.push('\t\t\t\t\t\t\tSource = "Mask",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0.433, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 856.776, 84.493 } },');
  L.push('\t\t\t\t},');
  L.push(buildHeartShapeNode('HeartTop', HEART_TOP_POINTS_LUA, HEART_TOP_KNOTS_LUA, [992,-40]));
  L.push(buildBackgroundNode('BackgroundHeartTop', 'HeartTop', heartRgb, [1050,-40]));
  L.push(buildHeartShapeNode('HeartBottom', HEART_BOTTOM_POINTS_LUA, HEART_BOTTOM_KNOTS_LUA, [992,60]));
  L.push(buildBackgroundNode('BackgroundHeartBottom', 'HeartBottom', heartRgb, [1050,60]));
  L.push(buildMergeNode('MergeHeart', 'BackgroundHeartBottom', 'BackgroundHeartTop', [1080,10]));
  // MergeHeart's raw output is huge relative to the 1920x1080 canvas (the heart's
  // BSpline points are normalized fractions of the full canvas, not pre-scaled
  // for icon size) — a Transform node scales it down to icon size *before* the
  // final Merge2 compositing step. Skipping this (or only relying on Merge2's
  // own Size) is what made the heart render oversized/zoomed-in.
  L.push('\t\t\t\tTransform1 = Transform {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.520292207792207, 0.536075036075035 }, },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.73, },');
  L.push('\t\t\t\t\t\tAspect = Input { Value = 1.89, },');
  L.push('\t\t\t\t\t\tInput = Input { SourceOp = "MergeHeart", Source = "Output", }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 995.865, 63.1539 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tText2 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(textRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(textRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(textRgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input {');
  L.push('\t\t\t\t\t\t\tValue = "0",');
  L.push('\t\t\t\t\t\t\tExpression = "floor(NumberDrive)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = '+textSize.toFixed(6)+', },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tAdvancedFontControls = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tNumberDrive = '+bezierSourceRefInput('Text2NumberDrive')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1122.34, 17.956 } },');
  L.push('\t\t\t\t\tUserControls = ordered() { NumberDrive = { LINKS_Name = "HR Number", LINKID_DataType = "Number", INPID_InputControl = "SliderControl", INP_Integer = false, INP_MinScale = 0, INP_MaxScale = 400, INP_MinAllowed = -1000000, INP_MaxAllowed = 1000000, INP_SplineType = "Default", ICS_ControlPage = "Text" } }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge2 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Background2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Transform1",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.446, 0.493 }, },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.11, },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 994.119, 85.8139 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Merge2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Text2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.532, 0.5 }, },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1124.29, 81.2339 } },');
  L.push('\t\t\t\t},');
  L.push(buildBezierSplineTool('Text2NumberDrive', hrKF, false));
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push('\t}');
  L.push('}');
  return L.join('\n');
}

// ── Incline / Grade overlay ─────────────────────────────────────────────────────
// Animated slope-graph version: a percent/degree readout (Text2) plus a small
// triangular wedge (Polygon1, via Background2) that visually rotates to track
// the current grade. Structure matches a real Fusion-exported reference
// (InclineOverlay.setting) exactly — the only per-project data baked in is
// Text2Incline's KeyFrames; everything else (the wedge's static triangle shape,
// and its live "Text2.NumberDrive - 90" rotation Expression) is fixed Lua taken
// straight from that reference. Replaces the old flat pill-badge version, which
// had no visual slope indicator at all — this was previously done with a PNG
// sequence dropped into Fusion by hand; it's now a native macro baked directly
// into the .setting file, so no image files or manual rotation keyframing.
function buildInclineSetting(){
  var unit=document.getElementById('inclineUnit').value;
  // pct: NumberDrive already carries percent grade directly.
  // deg: NumberDrive carries percent grade; convert to degrees via atan(pct/100) in Lua, then to degrees.
  // Degree glyph is embedded as a literal UTF-8 character (valid inside a Lua
  // string, no escaping needed) inside a single-quoted Lua format literal, so
  // there's nothing to clash with the outer Expression = "..." wrapper.
  var exprStr = (unit==='deg')
    ? "string.format('%.1f°', math.atan(NumberDrive/100) * (180/math.pi))"
    : "string.format('%.1f%%', NumberDrive)";
  var inclineKF=buildKeyframeList(gradeData,function(p){return p.pct;});
  var numRgb=hexToRgb(document.getElementById('inclineNumberColor').value);
  var rF=(numRgb[0]/255).toFixed(6), gF=(numRgb[1]/255).toFixed(6), bF=(numRgb[2]/255).toFixed(6);
  var wedgeRgb=hexToRgb(document.getElementById('inclineWedgeColor').value);
  var wrF=(wedgeRgb[0]/255).toFixed(6), wgF=(wedgeRgb[1]/255).toFixed(6), wbF=(wedgeRgb[2]/255).toFixed(6);

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tInclineOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = { Output1 = InstanceOutput { SourceOp = "Merge1", Source = "Output", }, },');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 1275.33, 161.303 },');
  L.push('\t\t\t\tFlags = { AllowPan = false, AutoSnap = true, RemoveRouters = true },');
  L.push('\t\t\t\tSize = { 609.971, 221.966, 356.091, 105.215 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { -990.532, -3.75992 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tText2 = TextPlus {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.496927803379416, 0.53551912568306 }, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+rF+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+gF+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+bF+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input {');
  L.push('\t\t\t\t\t\t\tValue = "0",');
  L.push('\t\t\t\t\t\t\tExpression = "'+exprStr.replace(/"/g,'\\"')+'",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tAdvancedFontControls = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tNumberDrive = '+bezierSourceRefInput('Text2Incline')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 850.688, 7.56683 } },');
  L.push('\t\t\t\t\tUserControls = ordered() { NumberDrive = { INP_MaxAllowed = 1000000, INP_Integer = false, INPID_InputControl = "SliderControl", INP_MaxScale = 50, INP_MinScale = -50, INP_MinAllowed = -1000000, LINKID_DataType = "Number", ICS_ControlPage = "Text", INP_SplineType = "Default", LINKS_Name = "Incline" } }');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Background1", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Text2", Source = "Output", },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.538, 0.51 }, },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 868.343, 70.2387 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground1 = Background {');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 723.717, 81.7559 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge1 = Merge {');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input { SourceOp = "Merge3", Source = "Output", },');
  L.push('\t\t\t\t\t\tForeground = Input { SourceOp = "Background2", Source = "Output", },');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1030.64, 70.9487 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tPolygon1 = PolylineMask {');
  L.push('\t\t\t\t\tDrawMode = "InsertAndModify",');
  L.push('\t\t\t\t\tDrawMode2 = "InsertAndModify",');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tCenter = Input { Value = { 0.510123208175441, 0.453313943239908 }, },');
  L.push('\t\t\t\t\t\tPolyline = Input { SourceOp = "Polygon1Polyline", Source = "Value", },');
  L.push('\t\t\t\t\t\tPolyline2 = Input { Value = Polyline { }, Disabled = true, },');
  L.push('\t\t\t\t\t\tXRotation = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Polygon1InclineWedge",');
  L.push('\t\t\t\t\t\t\tSource = "Value",');
  L.push('\t\t\t\t\t\t\tExpression = "Text2.NumberDrive - 90",');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1038.34, -37.3808 } },');
  L.push('\t\t\t\t\tUserControls = ordered() {');
  L.push('\t\t\t\t\t\tXRotation = {');
  L.push('\t\t\t\t\t\t\tINP_MaxAllowed = 1000000,');
  L.push('\t\t\t\t\t\t\tINP_Integer = false,');
  L.push('\t\t\t\t\t\t\tINPID_InputControl = "SliderControl",');
  L.push('\t\t\t\t\t\t\tINP_MaxScale = 180,');
  L.push('\t\t\t\t\t\t\tINP_Default = 0,');
  L.push('\t\t\t\t\t\t\tINP_MinScale = -180,');
  L.push('\t\t\t\t\t\t\tINP_MinAllowed = -1000000,');
  L.push('\t\t\t\t\t\t\tLINKID_DataType = "Number",');
  L.push('\t\t\t\t\t\t\tICS_ControlPage = "Controls",');
  L.push('\t\t\t\t\t\t\tINP_SplineType = "Default",');
  L.push('\t\t\t\t\t\t\tLINKS_Name = "InclineWedge"');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t}');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackground2 = Background {');
  L.push('\t\t\t\t\tCtrlWShown = false,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input { SourceOp = "Polygon1", Source = "Mask", },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+wrF+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+wgF+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+wbF+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 1035.79, 16.1895 } },');
  L.push('\t\t\t\t}');
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildBezierSplineTool('Text2Incline', inclineKF, false, 2));
  // Static triangle wedge shape — fixed, not per-project data. Frame 0 holds the
  // one keyframe; Linear+LockedY flags and points copied verbatim from the
  // reference so the wedge silhouette matches exactly.
  L.push('\t\tPolygon1Polyline = BezierSpline {');
  L.push('\t\t\tSplineColor = { Red = 173, Green = 255, Blue = 47 },');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tKeyFrames = {');
  L.push('\t\t\t\t[0] = { 0, Flags = { Linear = true, LockedY = true }, Value = Polyline {');
  L.push('\t\t\t\t\t\tClosed = true,');
  L.push('\t\t\t\t\t\tPoints = {');
  L.push('\t\t\t\t\t\t\t{ Linear = true, X = -0.0602901178603808, Y = -0.05, LX = 0.0498640072529465, LY = 0.0553763440860215, RX = 0.0501662133575098, RY = 0 },');
  L.push('\t\t\t\t\t\t\t{ Linear = true, X = 0.0902085222121487, Y = -0.05, LX = -0.0501662133575098, LY = 0, RX = -0.00030220610456333, RY = 0.0553763440860215 },');
  L.push('\t\t\t\t\t\t\t{ Linear = true, X = 0.0893019038984587, Y = 0.116129032258064, LX = 0.00030220610456333, LY = -0.0553763440860215, RX = -0.0498640072529465, RY = -0.0553763440860215 }');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t} }');
  L.push('\t\t\t}');
  L.push('\t\t},');
  // Inert holder tool — its own value is never used (Polygon1's XRotation is
  // driven live by the "Text2.NumberDrive - 90" Expression instead), but the
  // SourceOp connection must exist for that Expression to have a valid host
  // input to attach to, matching the reference exactly.
  L.push('\t\tPolygon1InclineWedge = BezierSpline {');
  L.push('\t\t\tSplineColor = { Red = 172, Green = 229, Blue = 95 },');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tKeyFrames = { [0] = { 0, Flags = { Linear = true } } }');
  L.push('\t\t}');
  L.push('\t},');
  L.push('\tActiveTool = "InclineOverlay",');
  L.push('}');
  return L.join('\n');
}

function buildMileSetting(){
  var unit=document.getElementById('unit').value;
  var unitLabel = unit==='mph' ? 'Miles' : 'Kilometers';
  // Total distance of the workout in the display unit (mi or km) — used to cap both
  // Rectangle3 controls so the slider ranges match this specific activity.
  var totalDispDist = unit==='mph' ? totalDistM/1609.344 : totalDistM/1000;
  if(!isFinite(totalDispDist) || totalDispDist<=0) totalDispDist = 1; // guard against empty/zero data
  var mileKF=buildKeyframeList(distData,function(p){return unit==='mph' ? p.distM/1609.344 : p.distM/1000;});
  var lineDistRgb=hexToRgb(document.getElementById('mileLineDistColor').value);
  var mileTextRgb=hexToRgb(document.getElementById('mileColor').value);

  var L=[];
  L.push('{');
  L.push('\tTools = ordered() {');
  L.push('\t\tDistanceOverlay = GroupOperator {');
  L.push('\t\t\tCtrlWZoom = false,');
  L.push('\t\t\tNameSet = true,');
  L.push('\t\t\tOutputs = {');
  L.push('\t\t\t\tMainOutput1 = InstanceOutput {');
  L.push('\t\t\t\t\tSourceOp = "Merge3",');
  L.push('\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t}');
  L.push('\t\t\t},');
  L.push('\t\t\tViewInfo = GroupInfo {');
  L.push('\t\t\t\tPos = { 595.031, 46.5379 },');
  L.push('\t\t\t\tFlags = {');
  L.push('\t\t\t\t\tAllowPan = false,');
  L.push('\t\t\t\t\tAutoSnap = true,');
  L.push('\t\t\t\t\tRemoveRouters = true');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tSize = { 750.999, 163.053, 424.166, 24.2424 },');
  L.push('\t\t\t\tDirection = "Horizontal",');
  L.push('\t\t\t\tPipeStyle = "Direct",');
  L.push('\t\t\t\tScale = 1,');
  L.push('\t\t\t\tOffset = { 0, 0 }');
  L.push('\t\t\t},');
  L.push('\t\t\tTools = ordered() {');
  L.push('\t\t\t\tBackgroundcolor = Background {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "BackroundRectangle",');
  L.push('\t\t\t\t\t\t\tSource = "Mask",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftAlpha = Input { Value = 0.433, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -332.685, 103.554 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge = Merge {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Backgroundcolor",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Color",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -182.666, 102.205 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tNumber = TextPlus {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCenter = Input {');
  L.push('\t\t\t\t\t\t\tValue = { 0.559145418095033, 0.538291 },');
  L.push('\t\t\t\t\t\t\tExpression = "Point(0.2875 + Rectangle3.Width, 0.538291)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(mileTextRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(mileTextRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(mileTextRgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Expression = "string.format(\\"%.1f\\", Rectangle3.SPLData)", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.0472, },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -27.6667, 21.4893 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge2 = Merge {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Merge",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Number",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -31.6663, 103.455 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tMerge3 = Merge {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tBackground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Merge2",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tForeground = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Unit",');
  L.push('\t\t\t\t\t\t\tSource = "Output",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tPerformDepthMerge = Input { Value = 0, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 149, 94.9699 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tBackroundRectangle = RectangleMask {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 0.433, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.024, },');
  L.push('\t\t\t\t\t\tCornerRadius = Input { Value = 0.543, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -347.838, 22.6754 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tRectangle3 = RectangleMask {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tFilter = Input { Value = FuID { "Fast Gaussian" }, },');
  L.push('\t\t\t\t\t\tMaskWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tMaskHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tPixelAspect = Input { Value = { 1, 1 }, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tClippingMode = Input { Value = FuID { "None" }, },');
  L.push('\t\t\t\t\t\tCenter = Input {');
  L.push('\t\t\t\t\t\t\tValue = { 0.423322709047516, 0.5 },');
  L.push('\t\t\t\t\t\t\tExpression = "Point(0.2875 + Width/2, 0.5)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input {');
  L.push('\t\t\t\t\t\t\tValue = 0.271645418095033,');
  L.push('\t\t\t\t\t\t\tExpression = "min(max(SPLData / SPLMax, 0), 1) * 0.425",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 0.012, },');
  L.push('\t\t\t\t\t\tCornerRadius = Input { Value = 0.543, },');
  L.push('\t\t\t\t\t\tSPLMax = Input { Value = '+totalDispDist.toFixed(6)+', },'); // dynamically capped to this workout's total distance
  L.push('\t\t\t\t\t\tSPLData = '+bezierSourceRefInput('Rectangle3SPLData')+',');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -192, 14.4082 } },');
  L.push('\t\t\t\t\tUserControls = ordered() {');
  L.push('\t\t\t\t\t\tSPLData = {');
  L.push('\t\t\t\t\t\t\tLINKS_Name = "Distance Traveled (SPL)",');
  L.push('\t\t\t\t\t\t\tLINKID_DataType = "Number",');
  L.push('\t\t\t\t\t\t\tINPID_InputControl = "SliderControl",');
  L.push('\t\t\t\t\t\t\tINP_Integer = false,');
  L.push('\t\t\t\t\t\t\tINP_MinScale = 0,');
  L.push('\t\t\t\t\t\t\tINP_MaxScale = '+totalDispDist.toFixed(6)+','); // capped to total workout distance
  L.push('\t\t\t\t\t\t\tINP_MinAllowed = 0,');
  L.push('\t\t\t\t\t\t\tINP_MaxAllowed = '+totalDispDist.toFixed(6)+','); // capped to total workout distance
  L.push('\t\t\t\t\t\t\tINP_SplineType = "Default",');
  L.push('\t\t\t\t\t\t\tICS_ControlPage = "Controls"');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tSPLMax = {');
  L.push('\t\t\t\t\t\t\tLINKS_Name = "Total Target Distance",');
  L.push('\t\t\t\t\t\t\tLINKID_DataType = "Number",');
  L.push('\t\t\t\t\t\t\tINPID_InputControl = "SliderControl",');
  L.push('\t\t\t\t\t\t\tINP_Integer = false,');
  L.push('\t\t\t\t\t\t\tINP_MinScale = 0.100000001490116,');
  L.push('\t\t\t\t\t\t\tINP_MaxScale = '+totalDispDist.toFixed(6)+','); // capped to total workout distance
  L.push('\t\t\t\t\t\t\tINP_MinAllowed = 0.00100000004749745,');
  L.push('\t\t\t\t\t\t\tINP_MaxAllowed = '+totalDispDist.toFixed(6)+','); // capped to total workout distance
  L.push('\t\t\t\t\t\t\tINP_SplineType = "Default",');
  L.push('\t\t\t\t\t\t\tICS_ControlPage = "Controls"');
  L.push('\t\t\t\t\t\t}');
  L.push('\t\t\t\t\t}');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tColor = Background {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tEffectMask = Input {');
  L.push('\t\t\t\t\t\t\tSourceOp = "Rectangle3",');
  L.push('\t\t\t\t\t\t\tSource = "Mask",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tTopLeftRed = Input { Value = '+(lineDistRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftGreen = Input { Value = '+(lineDistRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tTopLeftBlue = Input { Value = '+(lineDistRgb[2]/255).toFixed(6)+', }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -184.666, 59.7804 } },');
  L.push('\t\t\t\t},');
  L.push('\t\t\t\tUnit = TextPlus {');
  L.push('\t\t\t\t\tNameSet = true,');
  L.push('\t\t\t\t\tInputs = {');
  L.push('\t\t\t\t\t\tWidth = Input { Value = 1920, },');
  L.push('\t\t\t\t\t\tHeight = Input { Value = 1080, },');
  L.push('\t\t\t\t\t\tUseFrameFormatSettings = Input { Value = 1, },');
  L.push('\t\t\t\t\t\t["Gamut.SLogVersion"] = Input { Value = FuID { "SLog2" }, },');
  L.push('\t\t\t\t\t\tWrap = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tCenter = Input {');
  L.push('\t\t\t\t\t\t\tValue = { 0.612645418095033, 0.538291 },');
  L.push('\t\t\t\t\t\t\tExpression = "Point(0.341+ Rectangle3.Width, 0.538291)",');
  L.push('\t\t\t\t\t\t},');
  L.push('\t\t\t\t\t\tLayoutSize = Input { Value = 0.677, },');
  L.push('\t\t\t\t\t\tLayoutRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tAngleY = Input { Value = 13, },');
  L.push('\t\t\t\t\t\tTransformRotation = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tRed1 = Input { Value = '+(mileTextRgb[0]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tGreen1 = Input { Value = '+(mileTextRgb[1]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tBlue1 = Input { Value = '+(mileTextRgb[2]/255).toFixed(6)+', },');
  L.push('\t\t\t\t\t\tSoftness1 = Input { Value = 1, },');
  L.push('\t\t\t\t\t\tStyledText = Input { Value = "'+unitLabel+'", },');
  L.push('\t\t\t\t\t\tFont = Input { Value = "Open Sans", },');
  L.push('\t\t\t\t\t\tStyle = Input { Value = "Bold", },');
  L.push('\t\t\t\t\t\tSize = Input { Value = 0.058, },');
  L.push('\t\t\t\t\t\tVerticalJustificationNew = Input { Value = 3, },');
  L.push('\t\t\t\t\t\tHorizontalJustificationNew = Input { Value = 3, }');
  L.push('\t\t\t\t\t},');
  L.push('\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 157.173, 22.1018 } },');
  L.push('\t\t\t\t}');
  L.push('\t\t\t},');
  L.push('\t\t},');
  L.push(buildBezierSplineTool('Rectangle3SPLData', mileKF, false));
  L.push('\t}');
  L.push('}');
  return L.join('\n');
}

function dl(content,filename){
  var b=new Blob([content],{type:'text/plain'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  promptSupport();
}
// Opens the support modal shortly after a download is initiated. Debounced so
// downloading several files in a row (e.g. via Download All) only pops it once,
// and gated by sessionStorage so it only auto-pops on the first download of the
// session — later downloads in the same tab session won't interrupt the user again.
var supportPromptTimer=null;
function promptSupport(){
  if(sessionStorage.getItem('supportModalShown')==='true') return;
  clearTimeout(supportPromptTimer);
  supportPromptTimer=setTimeout(function(){
    document.getElementById('supportModal').classList.add('open');
    sessionStorage.setItem('supportModalShown','true');
  },700);
}
 

// ── Button handlers ───────────────────────────────────────────────────────────
document.getElementById('btnSetting').addEventListener('click',function(){dl(buildSetting(),makeFilename('Speed_Overlay','setting'));setStatus('Downloaded Speed_Overlay.setting','ok');});
document.getElementById('btnRouteSetting').addEventListener('click',function(){dl(buildRouteSetting(),makeFilename('Route_Overlay','setting'));setStatus('Downloaded Route_Overlay.setting','ok');});
document.getElementById('btnElevSetting').addEventListener('click',function(){var s=buildElevSetting();if(!s){setStatus('No elevation data in this file','err');return;}dl(s,makeFilename('Elevation_Overlay','setting'));setStatus('Downloaded Elevation_Overlay.setting','ok');});
 
document.getElementById('btnHRSetting').addEventListener('click',function(){
  if(!hrData.length){setStatus('No heart rate data in this file','err');return;}
  dl(buildHRSetting(),makeFilename('HR_Overlay','setting'));
  setStatus('Downloaded HR_Overlay.setting','ok');
});

document.getElementById('btnInclineSetting').addEventListener('click',function(){
  if(!gradeData.length){setStatus('No elevation data in this file (incline requires elevation)','err');return;}
  dl(buildInclineSetting(),makeFilename('Incline_Overlay','setting'));
  setStatus('Downloaded Incline_Overlay.setting','ok');
});

document.getElementById('btnMileSetting').addEventListener('click',function(){
  if(!distData.length){setStatus('No GPS data in this file','err');return;}
  dl(buildMileSetting(),makeFilename('Mile_Marker_Overlay','setting'));
  setStatus('Downloaded Mile_Marker_Overlay.setting','ok');
});

function showExportProgress(){
  document.getElementById('exportProgressWrap').style.display='block';
  updateExportProgress(0,'Preparing files…');
}
function updateExportProgress(pct,label){
  document.getElementById('exportProgressFill').style.width=Math.max(0,Math.min(100,pct))+'%';
  if(label) document.getElementById('exportProgressLabel').textContent=label;
}
function hideExportProgress(){
  setTimeout(function(){document.getElementById('exportProgressWrap').style.display='none';},600);
}

document.getElementById('btnDownloadAll').addEventListener('click',function(){
  showExportProgress();
  // Building each .setting file (baking keyframes, etc.) is the bulk of the
  // work for long GPS tracks, so it gets its own share of the bar before the
  // zip's own compression progress takes over.
  var steps=[
    {label:'Building Speed overlay…',run:function(){return buildSetting();},name:function(){return makeFilename('Speed_Overlay','setting');}},
    {label:'Building Route overlay…',run:function(){return buildRouteSetting();},name:function(){return makeFilename('Route_Overlay','setting');}},
    {label:'Building Elevation overlay…',run:function(){return buildElevSetting();},name:function(){return makeFilename('Elevation_Overlay','setting');},optional:true},
    {label:'Building HR overlay…',run:function(){return hrData.length?buildHRSetting():null;},name:function(){return makeFilename('HR_Overlay','setting');},optional:true},
    {label:'Building Incline overlay…',run:function(){return gradeData.length?buildInclineSetting():null;},name:function(){return makeFilename('Incline_Overlay','setting');},optional:true},
    {label:'Building Mile Marker overlay…',run:function(){return distData.length?buildMileSetting():null;},name:function(){return makeFilename('Mile_Marker_Overlay','setting');},optional:true}
  ];
  var zip=new JSZip();
  var folder=zip.folder('GPX Overlay');
  var BUILD_SHARE=70; // percent of the bar reserved for the build phase, rest for zip compression
  steps.forEach(function(step,i){
    updateExportProgress((i/steps.length)*BUILD_SHARE, step.label);
    var content=step.run();
    if(content) folder.file(step.name(),content);
  });
  updateExportProgress(BUILD_SHARE,'Compressing…');
  zip.generateAsync({type:'blob'},function(meta){
    updateExportProgress(BUILD_SHARE+(meta.percent/100)*(100-BUILD_SHARE),'Compressing… '+Math.round(meta.percent)+'%');
  }).then(function(content){
    updateExportProgress(100,'Done');
    var u=URL.createObjectURL(content),a=document.createElement('a');
    a.href=u; a.download='GPX Overlay.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
    setStatus('Downloaded GPX Overlay.zip','ok');
    hideExportProgress();
    promptSupport();
  });
});
