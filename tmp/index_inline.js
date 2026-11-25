/* ---------------- 基础 ---------------- */
function d(n){return Math.floor(Math.random()*n)+1}
function r3d6x5(){return (d(6)+d(6)+d(6))*5}
function r2d6p6x5(){return (d(6)+d(6)+6)*5}
function pad2(n){return n<10?'0'+n:''+n}
function nowStr(){var t=new Date();return pad2(t.getHours())+':'+pad2(t.getMinutes())+':'+pad2(t.getSeconds())}

var logLines=[];
function addLog(s){
  logLines.push(nowStr()+'  '+s);
  var ul=document.getElementById('history');
  var li=document.createElement('li');
  li.textContent=logLines[logLines.length-1];
  ul.insertBefore(li,ul.firstChild);
  pushRoll(s);
}

/* ---------------- 骰子桥（把结果递给阿蓝） ---------------- */
var BRIDGE='http://127.0.0.1:3999';
var bridgeOk=false, bridgeChecked=false;
function setBridge(ok){
  bridgeOk=ok; bridgeChecked=true;
  var d=document.getElementById('bridgeDot');
  if(!d)return;
  d.className='dot '+(ok?'on':'off');
  d.textContent=ok?'已连上阿蓝':'桥没开';
}
function pingBridge(){
  try{
    fetch(BRIDGE+'/ping',{method:'GET',mode:'no-cors',cache:'no-store'})
      .then(function(){setBridge(true)})
      .catch(function(){setBridge(false)});
  }catch(e){setBridge(false)}
}
function pushRoll(s){
  if(!bridgeOk){ return }
  try{
    fetch(BRIDGE+'/roll',{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain'},body:s}).catch(function(){setBridge(false)});
  }catch(e){setBridge(false)}
}
document.getElementById('bridgeDot').onclick=pingBridge;
pingBridge();
setInterval(function(){ if(!bridgeOk) pingBridge() },8000);
function copyLog(){
  if(!logLines.length){alert('还没有记录');return}
  var txt=logLines.slice().reverse().join('\n');
  navigator.clipboard.writeText(txt).then(function(){alert('已复制 '+logLines.length+' 条')},function(){alert('复制失败，手动选中吧')});
}
function clearLog(){logLines=[];document.getElementById('history').innerHTML=''}
function exportLog(){
  if(!logLines.length){alert('还没有记录');return}
  var t=new Date();
  var name='coc记录-'+t.getFullYear()+pad2(t.getMonth()+1)+pad2(t.getDate())+'-'+pad2(t.getHours())+pad2(t.getMinutes())+'.txt';
  var txt='COC 骰子记录  '+t.toLocaleString()+'\n'+logLines.join('\n')+'\n';
  var b=new Blob([txt],{type:'text/plain;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download=name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1200);
}

/* ---------------- 3D 骰子 ---------------- */
var SFX=true, AC=null, rolling=false, lastTick=0;
var FACES=['f-front','f-back','f-right','f-left','f-top','f-bottom'];
var PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};

function toggleSfx(){SFX=!SFX;document.getElementById('sfxBtn').textContent='音效 '+(SFX?'开':'关')}
function actx(){
  try{
    if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended') AC.resume();
  }catch(e){AC=null}
  return AC;
}
function sTick(){
  if(!SFX)return; var c=actx(); if(!c)return;
  var t=c.currentTime, o=c.createOscillator(), g=c.createGain();
  o.type='triangle'; o.frequency.setValueAtTime(900+Math.random()*700,t);
  g.gain.setValueAtTime(0.03,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+0.06);
}
function tickThrottled(){var n=performance.now(); if(n-lastTick>78){lastTick=n;sTick()}}
function sClack(){
  if(!SFX)return; var c=actx(); if(!c)return; var t=c.currentTime;
  var len=Math.floor(c.sampleRate*0.13), buf=c.createBuffer(1,len,c.sampleRate), dd=buf.getChannelData(0);
  for(var i=0;i<len;i++) dd[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);
  var src=c.createBufferSource(); src.buffer=buf;
  var bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500; bp.Q.value=1.1;
  var g=c.createGain(); g.gain.value=0.5;
  src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t);
  var o=c.createOscillator(), g2=c.createGain();
  o.type='sine'; o.frequency.setValueAtTime(210,t); o.frequency.exponentialRampToValueAtTime(58,t+0.14);
  g2.gain.setValueAtTime(0.3,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
  o.connect(g2); g2.connect(c.destination); o.start(t); o.stop(t+0.22);
}
function sTone(freqs,dur){
  if(!SFX)return; var c=actx(); if(!c)return; var t=c.currentTime;
  freqs.forEach(function(f,i){
    var o=c.createOscillator(), g=c.createGain(), st=t+i*0.11;
    o.type='sine'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,st); g.gain.exponentialRampToValueAtTime(0.15,st+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,st+dur);
    o.connect(g); g.connect(c.destination); o.start(st); o.stop(st+dur+0.02);
  });
}
function pipsHtml(v){
  var on=PIPS[v]||[], s='';
  for(var i=0;i<9;i++) s+='<i class="'+(on.indexOf(i)>=0?'':'off')+'"></i>';
  return s;
}
function buildDice(){
  ['cb0','cb1'].forEach(function(id){
    var el=document.getElementById(id);
    el.innerHTML=FACES.map(function(f){return '<div class="face '+f+'"><span class="lbl">0</span></div>'}).join('');
  });
}
function setCube(el,type,val){
  var faces=el.children;
  for(var i=0;i<faces.length;i++){
    var sp=faces[i].firstChild; if(!sp)continue;
    if(type==='pip'){ sp.className='pips'; sp.innerHTML=pipsHtml(val) }
    else {
      sp.className='lbl'; sp.textContent=String(val);
      var L=String(val).length;
      sp.style.fontSize=(L>2?24:(L>1?32:46))+'px';
    }
  }
}
function randVal(type){
  if(type==='pip')return 1+Math.floor(Math.random()*6);
  return Math.floor(Math.random()*10);
}
function spinCube(el,type,val,dur,cb){
  var start=performance.now(), rx=-15, ry=20;
  el.style.transition='none';
  function frame(now){
    var p=(now-start)/dur;
    if(p<1){
      var k=1-p;
      rx+=5+26*k*k; ry+=8+40*k*k;
      el.style.transform='rotateX('+rx+'deg) rotateY('+ry+'deg)';
      setCube(el,type,randVal(type)); tickThrottled();
      requestAnimationFrame(frame);
    }else{
      var tx=Math.round((rx+15)/360)*360-15;
      var ty=Math.round((ry-20)/360)*360+20;
      el.style.transition='transform .46s cubic-bezier(.18,1.5,.36,1)';
      el.style.transform='rotateX('+tx+'deg) rotateY('+ty+'deg)';
      setCube(el,type,val);
      setTimeout(function(){el.style.transition='none'; if(cb)cb()},470);
    }
  }
  requestAnimationFrame(frame);
}
function rollVisual(specs,cb){
  var left=specs.length;
  if(!left){if(cb)cb();return}
  specs.forEach(function(s){
    spinCube(s.el,s.type,s.val,760,function(){ if(--left===0 && cb) cb() });
  });
}
function rollD100(pick,cb){
  document.getElementById('cb1').style.display='';
  rollVisual([
    {el:document.getElementById('cb0'),type:'num',val:Math.floor(pick/10)%10},
    {el:document.getElementById('cb1'),type:'num',val:pick%10}
  ],cb);
}
function rollSingle(type,val,cb){
  document.getElementById('cb1').style.display='none';
  rollVisual([{el:document.getElementById('cb0'),type:type,val:val}],cb);
}
buildDice();
setCube(document.getElementById('cb0'),'num',0);
setCube(document.getElementById('cb1'),'num',0);
document.getElementById('cb1').style.display='none';

/* ---------------- 检定 ---------------- */
function rankOf(t,skill){
  if(t<=5)return {k:'大成功',c:'#1f6b4e'};
  if(t>=96&&skill<50||t===100)return {k:'大失败',c:'#b03030'};
  if(t<=Math.floor(skill/5))return {k:'极难成功',c:'#1f6b4e'};
  if(t<=Math.floor(skill/2))return {k:'困难成功',c:'#2f7a56'};
  if(t<=skill)return {k:'成功',c:'#3a5a4a'};
  return {k:'失败',c:'#b03030'};
}
function doCheck(){
  if(rolling)return;
  var skill=parseInt(document.getElementById('checkTarget').value)||0;
  var bonus=parseInt(document.getElementById('bonus').value)||0;
  var dice=[d(100)];
  var extra=Math.abs(bonus);
  for(var i=0;i<extra;i++)dice.push(d(100));
  var pick;
  if(bonus>0)pick=Math.min.apply(null,dice);
  else if(bonus<0)pick=Math.max.apply(null,dice);
  else pick=dice[0];
  var hint=document.getElementById('rankHint');
  if(hint){
    var e=Math.max(1,Math.floor(skill/5)), hh=Math.max(1,Math.floor(skill/2));
    hint.textContent='档位：01–05 大成功｜≤'+e+' 极难成功｜≤'+hh+' 困难成功｜≤'+skill+' 成功｜'+(skill<50?'96–100':'100')+' 大失败';
  }
  var r=rankOf(pick,skill);
  var big=document.getElementById('checkRoll'), v=document.getElementById('checkVerdict');
  actx(); rolling=true; big.textContent=''; v.textContent=''; v.style.color='';
  rollD100(pick,function(){
    rolling=false;
    big.textContent=pick;
    v.textContent=r.k+'（目标 '+skill+'）'+(dice.length>1?'  骰：'+dice.join(' / '):'');
    v.style.color=r.c;
    addLog('检定 目标'+skill+' → '+pick+' '+r.k+(dice.length>1?' ['+dice.join('/')+']':''));
    sClack();
    if(r.k==='大成功')setTimeout(function(){sTone([784,988,1319],0.24)},240);
    else if(r.k==='大失败')setTimeout(function(){sTone([330,247,175],0.32)},240);
  });
}
function doSan(){
  if(rolling)return;
  var cur=parseInt(document.getElementById('sanCur').value)||0;
  var w=parseInt(document.getElementById('sanWin').value)||0;
  var l=parseInt(document.getElementById('sanLose').value)||0;
  var t=d(100);
  var ok=t<=cur;
  var loss=ok?w:l;
  var left=cur-loss;
  var big=document.getElementById('sanRoll'), v=document.getElementById('sanVerdict');
  actx(); rolling=true; big.textContent=''; v.textContent=''; v.style.color='';
  rollD100(t,function(){
    rolling=false;
    big.textContent=t;
    v.textContent=(ok?'理智检定成功':'理智检定失败')+'　损失 '+loss+'　剩余 '+left+' / '+cur;
    v.style.color=ok?'#2f7a56':'#b03030';
    addLog('SAN检定 当前'+cur+' → '+t+(ok?' 成功':' 失败')+' 损'+loss+' 余'+left);
    sClack();
    if(!ok)setTimeout(function(){sTone([300,240,170],0.34)},240);
  });
}
function doFree(){
  if(rolling)return;
  var n=parseInt(document.getElementById('dn').value)||1;
  var s=parseInt(document.getElementById('dside').value)||6;
  var p=parseInt(document.getElementById('dplus').value)||0;
  var arr=[],sum=0;
  for(var i=0;i<n;i++){var x=d(s);arr.push(x);sum+=x}
  var total=sum+p;
  var big=document.getElementById('freeRoll');
  actx(); rolling=true; big.textContent='';
  var asPips=(n===1&&s===6&&p===0);
  rollSingle(asPips?'pip':'num',total,function(){
    rolling=false;
    big.textContent=total;
    addLog('掷 '+n+'d'+s+(p?'+' + p:'')+' = '+total+'  明细 '+arr.join(','));
    sClack();
  });
}

/* ---------------- 角色卡 ---------------- */
var ATTRS=[
  {k:'str',n:'力量 STR',roll:r3d6x5},
  {k:'con',n:'体质 CON',roll:r3d6x5},
  {k:'siz',n:'体型 SIZ',roll:r2d6p6x5},
  {k:'dex',n:'敏捷 DEX',roll:r3d6x5},
  {k:'app',n:'外貌 APP',roll:r3d6x5},
  {k:'int',n:'智力 INT',roll:r2d6p6x5},
  {k:'pow',n:'意志 POW',roll:r3d6x5},
  {k:'edu',n:'教育 EDU',roll:r2d6p6x5}
];
var CATS=['战斗','查线索','人际','学问','零碎'];
var SKILLS=[
  ['格斗(斗殴)','战斗',25],['格斗(刀剑)','战斗',20],['格斗(斧)','战斗',15],['格斗(矛)','战斗',20],
  ['格斗(鞭)','战斗',5],['闪避','战斗','dex2'],['投掷','战斗',20],
  ['射击(手枪)','战斗',20],['射击(步枪/霰弹)','战斗',25],['射击(弓)','战斗',15],
  ['侦查','查线索',25],['聆听','查线索',20],['图书馆使用','查线索',20],['心理学','查线索',10],
  ['追踪','查线索',10],['导航','查线索',10],['开锁','查线索',1],['妙手','查线索',10],
  ['潜行','查线索',20],['乔装','查线索',5],['估价','查线索',5],['会计','查线索',5],
  ['话术','人际',5],['魅惑','人际',15],['恐吓','人际',15],['说服','人际',10],
  ['信用评级','人际',0],['人类学','人际',1],
  ['母语','学问','edu'],['外语','学问',1],['历史','学问',5],['神秘学','学问',5],['考古学','学问',1],
  ['医学','学问',1],['急救','学问',30],['科学','学问',1],['法律','学问',5],['精神分析','学问',1],
  ['博物学','学问',10],['计算机使用','学问',5],['电子学','学问',1],['技艺','学问',5],
  ['机械维修','零碎',10],['电气维修','零碎',10],['汽车驾驶','零碎',25],['攀爬','零碎',20],
  ['跳跃','零碎',20],['游泳','零碎',20],['骑术','零碎',5],['操船','零碎',1],['摄影','零碎',5]
];
var ATTR_OK={str:[3,18],con:[3,18],siz:[2,12],dex:[3,18],app:[3,18],int:[2,12],pow:[3,18],edu:[2,12]};

/* ---------------- 职业（7 版规则书，照抄主要几项；不确定的以书上那栏为准） ---------------- */
var JOBS={
  '自定 / 不设职业':{sk:[],credit:[0,99],pts:'edu4'},
  '教授':{sk:['图书馆使用','母语','外语','心理学','历史','科学','考古学','技艺'],credit:[20,70],pts:'edu4'},
  '图书管理员':{sk:['会计','图书馆使用','外语','母语','历史','科学','计算机使用','技艺'],credit:[9,35],pts:'edu4'},
  '记者':{sk:['母语','技艺','话术','说服','历史','图书馆使用','聆听','心理学'],credit:[9,30],pts:'edu4'},
  '私家侦探':{sk:['摄影','乔装','法律','图书馆使用','心理学','侦查'],social:['魅惑','话术','恐吓','说服'],free:1,credit:[9,30],pts:'edu2max'},
  '医生':{sk:['急救','外语','医学','心理学','科学','博物学','说服','技艺'],credit:[30,80],pts:'edu4'},
  '警察':{sk:['格斗(斗殴)','射击(手枪)','急救','说服','法律','心理学','侦查','汽车驾驶'],credit:[9,30],pts:'edu2dex2'},
  '古董商':{sk:['估价','技艺','历史','图书馆使用','外语','说服','侦查','会计'],credit:[30,70],pts:'edu4'},
  '工程师':{sk:['电气维修','机械维修','科学','计算机使用','技艺','侦查','开锁','会计'],credit:[30,60],pts:'edu4'},
  '士兵':{sk:['攀爬','游泳','闪避','格斗(斗殴)','射击(步枪/霰弹)','潜行','急救','机械维修'],credit:[9,30],pts:'edu2str2'},
  '神秘学家':{sk:['人类学','历史','图书馆使用','神秘学','外语','科学','说服','技艺'],credit:[9,65],pts:'edu4'},
  '艺术家':{sk:['技艺','历史','博物学','说服','外语','心理学','侦查','摄影'],credit:[9,30],pts:'edu2dex2'},
  '罪犯':{sk:['估价','说服','恐吓','潜行','心理学','侦查','妙手','开锁'],credit:[5,65],pts:'edu2dex2'}
};
function curJob(){return JOBS[card.job]||JOBS['自定 / 不设职业']}
function isJobSkill(name){
  var j=curJob();
  if(!j.sk.length)return true;
  if(j.sk.indexOf(name)>=0)return true;
  if(j.social&&j.social.indexOf(name)>=0)return card.socialChoice===name;
  if(j.free&&card.freeSkill===name)return true;
  return false;
}
function setFree(name){
  card.freeSkill=name||'';
  renderSkills();
  renderDerived();
}
function setSocial(name){
  card.socialChoice=name||'';
  /* 换了社交技能，把旧那一项的职业技能点清出来 */
  var j=curJob();
  if(j.social) j.social.forEach(function(s){
    if(s!==card.socialChoice && card.alloc[s]) card.alloc[s].occ=0;
  });
  renderSkills();
  renderDerived();
}
function occPoolOf(){
  var a=card.attrs, j=curJob();
  var edu=(a.edu||0), dex=(a.dex||0), str=(a.str||0), app=(a.app||0);
  if(j.pts==='edu2max')return edu*2+Math.max(dex,str)*2;
  if(j.pts==='edu2dex2')return edu*2+dex*2;
  if(j.pts==='edu2str2')return edu*2+str*2;
  if(j.pts==='edu2app2')return edu*2+app*2;
  return edu*4;
}
function setJob(name){
  card.job=name;
  if(!curJob().free) card.freeSkill='';
  if(!curJob().social||curJob().social.indexOf(card.socialChoice)<0) card.socialChoice='';
  var ij=document.getElementById('i_job');
  if(ij&&name!=='自定 / 不设职业'){ij.value=name;card.info.job=name;}
  /* 换了职业，把不再属于本行的职业点清掉，免得悄悄超支 */
  for(var k in card.alloc){
    if(card.alloc[k].occ && !isJobSkill(k)) card.alloc[k].occ=0;
  }
  renderAll();
}

var card={attrs:{},luck:0,alloc:{},info:{},job:'自定 / 不设职业',freeSkill:'',socialChoice:''};

function baseOf(sk){
  var b=sk[2];
  if(b==='dex2')return Math.floor((card.attrs.dex||0)/2);
  if(b==='edu')return (card.attrs.edu||0);
  return b;
}
function totalOf(name){
  var sk=null;
  for(var i=0;i<SKILLS.length;i++)if(SKILLS[i][0]===name)sk=SKILLS[i];
  if(!sk)return 0;
  var a=card.alloc[name]||{occ:0,int:0};
  return baseOf(sk)+(+a.occ||0)+(+a.int||0);
}

function rollAll(){
  ATTRS.forEach(function(a){card.attrs[a.k]=a.roll()});
  card.luck=r3d6x5();
  card.alloc={};
  renderAll();
}
function rollOne(k){
  ATTRS.forEach(function(a){if(a.k===k)card.attrs[k]=a.roll()});
  renderAll();
}

function dbOf(){
  var s=(card.attrs.str||0)+(card.attrs.siz||0);
  var t=[[64,'-2','-2'],[84,'-1','-1'],[124,'0','0'],[164,'+1d4','1'],[204,'+1d6','2'],
         [284,'+2d6','3'],[364,'+3d6','4'],[444,'+4d6','5'],[9999,'+5d6','6']];
  for(var i=0;i<t.length;i++)if(s<=t[i][0])return t[i][1]+' / 体格 '+t[i][2];
  return '0 / 体格 0';
}
function movOf(){
  var dex=card.attrs.dex||0,str=card.attrs.str||0,siz=card.attrs.siz||0;
  if(dex<siz&&str<siz)return 7;
  if(dex>siz&&str>siz)return 9;
  return 8;
}

function renderAttrs(){
  var box=document.getElementById('attrBox');
  box.innerHTML='';
  ATTRS.forEach(function(a){
    var el=document.createElement('div');
    el.className='attr';
    el.innerHTML='<div class="n">'+a.n+'</div><div class="v">'+(card.attrs[a.k]||0)+'</div>'+
      '<button onclick="rollOne(\''+a.k+'\')">重掷</button>';
    box.appendChild(el);
  });
  var el=document.createElement('div');
  el.className='attr';
  el.innerHTML='<div class="n">幸运 LUCK</div><div class="v">'+(card.luck||0)+'</div>'+
    '<button onclick="card.luck=r3d6x5();renderAll()">重掷</button>';
  box.appendChild(el);
}
function renderDerived(){
  var a=card.attrs;
  var hp=Math.floor(((a.con||0)+(a.siz||0))/10);
  var mp=Math.floor((a.pow||0)/5);
  var san=(a.pow||0);
  var dodge=Math.floor((a.dex||0)/2);
  var occ=occPoolOf(), itr=(a.int||0)*2;
  var occUsed=0,itrUsed=0;
  for(var k in card.alloc){occUsed+=(+card.alloc[k].occ||0);itrUsed+=(+card.alloc[k].int||0)}
  var data=[
    ['生命 HP',hp],['魔法 MP',mp],['理智 SAN',san],['幸运',card.luck||0],
    ['闪避',dodge],['移动 MOV',movOf()],['伤害加值 / 体格',dbOf()],['年龄',card.info.age||'—']
  ];
  var box=document.getElementById('derivedBox');
  box.innerHTML='';
  data.forEach(function(x){
    var el=document.createElement('div');
    el.className='dbox';
    el.innerHTML='<div class="n">'+x[0]+'</div><div class="v">'+x[1]+'</div>';
    box.appendChild(el);
  });
  var o=document.getElementById('occLeft'),n=document.getElementById('intLeft');
  o.textContent=(occ-occUsed);
  n.textContent=(itr-itrUsed);
  o.className=(occ-occUsed<0)?'over':'';
  n.className=(itr-itrUsed<0)?'over':'';
}

function fillJobSelect(){
  var s=document.getElementById('jobSel');
  if(!s)return;
  var keys=Object.keys(JOBS);
  if(s.options.length!==keys.length){
    s.innerHTML='';
    keys.forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;s.appendChild(o)});
  }
  s.value=card.job||'自定 / 不设职业';
}
function fillFreeSelect(j){
  var wrap=document.getElementById('freeWrap'), s=document.getElementById('freeSel');
  if(!wrap||!s)return;
  if(!j.free){wrap.style.display='none';return}
  wrap.style.display='';
  if(!s.options.length){
    var none=document.createElement('option');none.value='';none.textContent='（还没选）';s.appendChild(none);
    SKILLS.forEach(function(sk){var o=document.createElement('option');o.value=sk[0];o.textContent=sk[0];s.appendChild(o)});
  }
  s.value=card.freeSkill||'';
}
function fillSocialSelect(j){
  var wrap=document.getElementById('socialWrap'), s=document.getElementById('socialSel');
  if(!wrap||!s)return;
  if(!j.social||!j.social.length){wrap.style.display='none';return}
  wrap.style.display='';
  if(!s.options.length||s.options.length!==j.social.length+1){
    s.innerHTML='';
    var none=document.createElement('option');none.value='';none.textContent='（还没选）';s.appendChild(none);
    j.social.forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=k;s.appendChild(o)});
  }
  s.value=card.socialChoice||'';
  if(!card.socialChoice) s.value='';
}
function autoPickSocial(){
  var j=curJob();
  if(!j.social||!j.social.length||card.socialChoice)return;
  var best='',bv=0;
  j.social.forEach(function(s){var a=card.alloc[s];if(a&&(+a.occ||0)>bv){bv=+a.occ;best=s}});
  if(best){
    card.socialChoice=best;
    j.social.forEach(function(s){ if(s!==best && card.alloc[s]) card.alloc[s].occ=0; });
  }
}
function pruneOcc(){
  /* 非本行的技能不可能有职业技能点，切职业/切社交后把残留清掉 */
  for(var k in card.alloc){
    if(card.alloc[k] && card.alloc[k].occ && !isJobSkill(k)) card.alloc[k].occ=0;
  }
}
function renderSkills(){
  fillJobSelect();
  var j=curJob();
  autoPickSocial();
  pruneOcc();
  fillFreeSelect(j);
  fillSocialSelect(j);
  var hint=document.getElementById('jobHint');
  if(hint){
    hint.textContent=j.sk.length
      ? ('本行：'+j.sk.join('、')+(j.social?('｜社交选一：'+j.social.join('/')):'')+'｜信用评级 '+j.credit[0]+'–'+j.credit[1]+'%，职业点池 '+occPoolOf()+(j.pts==='edu2max'?'（EDU×2＋力量/敏捷取高×2）':''))
      : '职业点只能填本行，兴趣点除克苏鲁神话外随便填';
  }
  var t=document.getElementById('skillTable');
  t.innerHTML='';
  var head=document.createElement('tr');
  head.innerHTML='<th>技能</th><th class="num">起始</th><th class="num">职业点</th><th class="num">兴趣点</th><th class="num">合计</th>';
  t.appendChild(head);
  CATS.forEach(function(cat){
    var tr0=document.createElement('tr');
    tr0.innerHTML='<td class="cat" colspan="5">'+cat+'</td>';
    t.appendChild(tr0);
    SKILLS.forEach(function(sk){
      if(sk[1]!==cat)return;
      var name=sk[0];
      var a=card.alloc[name]||{occ:0,int:0};
      var mine=isJobSkill(name);
      var tot=totalOf(name);
      var tr=document.createElement('tr');
      tr.innerHTML='<td>'+name+(mine&&j.sk.length?'<span class="jobtag">本行</span>':'')+'</td>'+
        '<td class="num">'+baseOf(sk)+'</td>'+
        '<td class="num"><input type="number" min="0" value="'+(a.occ||0)+'" data-k="'+name+'" data-t="occ"'+(mine?'':' disabled')+'></td>'+
        '<td class="num"><input type="number" min="0" value="'+(a.int||0)+'" data-k="'+name+'" data-t="int"></td>'+
        '<td class="tot'+(tot>99?' over':'')+'">'+tot+'</td>';
      t.appendChild(tr);
    });
  });
  t.querySelectorAll('input').forEach(function(inp){
    if(inp.disabled)return;
    inp.addEventListener('input',function(){
      var k=inp.getAttribute('data-k'),ty=inp.getAttribute('data-t');
      var v=parseInt(inp.value)||0;
      if(v<0)v=0;
      if(!card.alloc[k])card.alloc[k]={occ:0,int:0};
      card.alloc[k][ty]=v;
      var row=inp.closest('tr');
      var tt=totalOf(k);
      var el=row.querySelector('.tot');
      el.textContent=tt;
      el.className='tot'+(tt>99?' over':'');
      renderDerived();
    });
  });
}

function bindInfo(){
  [['i_name','name'],['i_age','age'],['i_sex','sex'],['i_job','job'],['i_home','home'],['i_era','era']].forEach(function(p){
    var el=document.getElementById(p[0]);
    el.value=card.info[p[1]]||'';
    el.addEventListener('input',function(){card.info[p[1]]=el.value});
  });
  [['b_belief','belief'],['b_person','person'],['b_place','place'],['b_item','item'],['b_trait','trait'],['b_look','look'],['b_gear','gear']].forEach(function(p){
    var el=document.getElementById(p[0]);
    el.value=card.info[p[1]]||'';
    el.addEventListener('input',function(){card.info[p[1]]=el.value});
  });
}

function renderAll(){
  renderAttrs();renderDerived();renderSkills();bindInfo();
}

function saveLocal(){
  try{localStorage.setItem('coc-card-v1',JSON.stringify(card));alert('存好了')}
  catch(e){alert('存不进去：'+e.message)}
}
function loadLocal(){
  var s=localStorage.getItem('coc-card-v1');
  if(!s){alert('之前没存过');return}
  card=JSON.parse(s);
  if(!card.alloc)card.alloc={};
  if(!card.info)card.info={};
  if(!card.job)card.job='自定 / 不设职业';
  if(!card.freeSkill)card.freeSkill='';
  if(!card.socialChoice)card.socialChoice='';
  renderAll();
}
function resetAll(){
  if(!confirm('清空整张卡？'))return;
  card={attrs:{},luck:0,alloc:{},info:{},job:'自定 / 不设职业',freeSkill:'',socialChoice:''};
  renderAll();
}

/* ---------------- 导出 JPG ---------------- */
function wrap(ctx,text,x,y,maxW,lh){
  var line='',lines=[];
  for(var i=0;i<text.length;i++){
    var t=line+text[i];
    if(ctx.measureText(t).width>maxW){lines.push(line);line=text[i]}
    else line=t;
  }
  if(line)lines.push(line);
  lines.forEach(function(l,i){ctx.fillText(l,x,y+i*lh)});
  return y+lines.length*lh;
}

function exportJPG(){
  var W=1240,H=1760;
  var cv=document.createElement('canvas');
  cv.width=W;cv.height=H;
  var c=cv.getContext('2d');
  c.fillStyle='#f7f4ec';c.fillRect(0,0,W,H);
  c.strokeStyle='#2b2721';c.lineWidth=6;c.strokeRect(18,18,W-36,H-36);
  c.fillStyle='#2b2721';
  c.font='bold 34px "Microsoft YaHei"';
  c.fillText('调查员角色卡',46,80);
  c.font='16px "Microsoft YaHei"';
  c.fillStyle='#7d7566';
  c.fillText('克苏鲁的呼唤 · 第七版　　'+new Date().toLocaleDateString(),46,110);

  var i=card.info||{};
  c.fillStyle='#2b2721';c.font='19px "Microsoft YaHei"';
  var info='姓名：'+(i.name||'—')+'　　年龄：'+(i.age||'—')+'　　性别：'+(i.sex||'—')+
           '　　职业：'+(i.job||'—')+'　　居住地：'+(i.home||'—');
  c.fillText(info,46,150);

  c.strokeStyle='#c9c1b0';c.lineWidth=1;
  c.beginPath();c.moveTo(46,170);c.lineTo(W-46,170);c.stroke();

  // 属性
  c.font='bold 18px "Microsoft YaHei"';c.fillStyle='#1f6b4e';
  c.fillText('属性',46,205);
  c.font='17px "Microsoft YaHei"';c.fillStyle='#2b2721';
  var ax=46,ay=235;
  ATTRS.forEach(function(a,idx){
    var col=idx%4,row=Math.floor(idx/4);
    c.fillText(a.n.replace(' STR','').replace(' CON','').replace(' SIZ','').replace(' DEX','').replace(' APP','').replace(' INT','').replace(' POW','').replace(' EDU','')+'　'+(card.attrs[a.k]||0),ax+col*290,ay+row*34);
  });
  c.fillText('幸运　'+(card.luck||0),ax+0*290,ay+2*34);
  c.fillText('理智　'+(card.attrs.pow||0),ax+1*290,ay+2*34);
  var a2=card.attrs;
  var hpv=Math.floor(((a2.con||0)+(a2.siz||0))/10),mpv=Math.floor((a2.pow||0)/5),dgv=Math.floor((a2.dex||0)/2);
  c.font='16px "Microsoft YaHei"';c.fillStyle='#1f6b4e';
  c.fillText('生命 '+hpv+'　魔法 '+mpv+'　闪避 '+dgv+'　移动 '+movOf()+'　伤害加值 '+dbOf(),46,ay+2*34+42);

  var y=ay+3*34+70;
  c.strokeStyle='#c9c1b0';c.beginPath();c.moveTo(46,y);c.lineTo(W-46,y);c.stroke();
  y+=34;

  // 技能
  c.font='bold 18px "Microsoft YaHei"';c.fillStyle='#1f6b4e';
  c.fillText('技能',46,y);y+=30;
  c.font='16px "Microsoft YaHei"';c.fillStyle='#2b2721';
  var must={'母语':1,'信用评级':1,'闪避':1};
  var shown=SKILLS.filter(function(sk){
    var a=card.alloc[sk[0]];
    return must[sk[0]] || (a&&((+a.occ||0)+(+a.int||0))>0);
  });
  if(!shown.length)shown=SKILLS.slice(0,24);
  var colW=(W-92)/2;
  shown.forEach(function(sk,idx){
    var col=Math.floor(idx/Math.ceil(shown.length/2));
    var row=idx%Math.ceil(shown.length/2);
    var x=46+col*colW;
    var yy=y+row*26;
    c.fillText(sk[0],x,yy);
    c.fillText(String(totalOf(sk[0])),x+colW-70,yy);
  });
  y+=Math.ceil(shown.length/2)*26+26;

  c.strokeStyle='#c9c1b0';c.beginPath();c.moveTo(46,y);c.lineTo(W-46,y);c.stroke();
  y+=34;

  c.font='bold 18px "Microsoft YaHei"';c.fillStyle='#1f6b4e';
  c.fillText('背景',46,y);y+=30;
  c.font='16px "Microsoft YaHei"';c.fillStyle='#2b2721';
  var bg=[['信念',i.belief],['重要的人',i.person],['意义非凡之地',i.place],['宝贵之物',i.item],['特质',i.trait]];
  bg.forEach(function(b){
    if(y>H-120)return;
    c.fillStyle='#7d7566';c.fillText(b[0]+'：',46,y);
    c.fillStyle='#2b2721';
    var yy2=wrap(c,b[1]||'—',46+ (b[0].length+1)*16,y,H-140,22);
    y=Math.max(y+26,yy2+6);
  });
  if(i.gear){c.fillStyle='#7d7566';c.fillText('随身物品：',46,y);c.fillStyle='#2b2721';wrap(c,i.gear,46+90,y,H-140,22);}

  cv.toBlob(function(b){
    var a=document.createElement('a');
    a.href=URL.createObjectURL(b);
    a.download='角色卡_'+(i.name||'无名')+'_'+new Date().toISOString().slice(0,10)+'.jpg';
    a.click();
  },'image/jpeg',0.92);
}

/* ---------------- tab ---------------- */
function switchTab(which){
  document.getElementById('tab-dice').className=(which==='dice')?'on':'';
  document.getElementById('tab-card').className=(which==='card')?'on':'';
  document.getElementById('tabBtnDice').className=(which==='dice')?'on':'';
  document.getElementById('tabBtnCard').className=(which==='card')?'on':'';
}

/* 初始化 */
(function(){
  card.attrs={str:50,con:55,siz:60,dex:70,app:45,int:65,pow:50,edu:75};
  card.luck=55;
  card.info={job:'大学生',era:'1920s',age:20};
  renderAll();
})();
