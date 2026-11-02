// Garage Bandz — tiny bits of behaviour

// Deterministic RNG so the skyline looks the same every load
function rng(seed){return function(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}

// Skyline
document.querySelectorAll('[data-skyline]').forEach(function(el){
  var far=el.dataset.skyline==='far';
  var r=rng(far?7:23);
  var count=far?26:20;
  for(var i=0;i<count;i++){
    var b=document.createElement('div');
    b.className='bld'+(r()>.8?' spire':'');
    var h=far?80+r()*220:60+r()*170;
    b.style.height=h+'px';
    b.style.width=(far?46+r()*40:60+r()*50)+'px';
    b.style.setProperty('--g',(far?12:16)+'px');
    b.style.setProperty('--sp',(20+r()*40)+'px');
    el.appendChild(b);
  }
});

// Cash counter
var cash=document.getElementById('cash');
if(cash){
  var n=250000;
  setInterval(function(){
    n+=Math.floor(Math.random()*900)+100;
    var s=String(n).padStart(8,'0');
    cash.textContent=s.slice(0,2)+','+s.slice(2,5)+','+s.slice(5);
  },1600);
}

// Mobile menu
var burger=document.querySelector('.burger'),menu=document.querySelector('.menu');
burger.addEventListener('click',function(){
  var o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o);
});
menu.addEventListener('click',function(e){
  if(e.target.tagName==='A'){menu.classList.remove('open');burger.setAttribute('aria-expanded',false)}
});

// Active nav link on scroll
var links=[].slice.call(menu.querySelectorAll('a'));
var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'))});
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){
        var i=secs.indexOf(e.target);
        links.forEach(function(l,j){l.classList.toggle('active',i===j)});
      }
    });
  },{rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(function(s){s&&io.observe(s)});
}

// Notify modal
var modal=document.getElementById('modal');
var form=document.getElementById('notify-form');
var passed=modal.querySelector('.passed');
function open(){modal.hidden=false;form.hidden=false;passed.hidden=true;form.querySelector('input').focus()}
function close(){modal.hidden=true}
document.getElementById('notify-open').addEventListener('click',open);
document.getElementById('notify-close').addEventListener('click',close);
modal.addEventListener('click',function(e){if(e.target===modal)close()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!modal.hidden)close()});
form.addEventListener('submit',function(e){
  e.preventDefault();
  // TODO: hook up to your email list / backend
  form.hidden=true;passed.hidden=false;
  setTimeout(close,2200);
});
