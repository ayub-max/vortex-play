
(function(){
"use strict";
const LANG_KEY="vortexplay.language";
const labels={en:{welcome:"Choose your language",desc:"VORTEX//PLAY will use this language where available.",continue:"Continue",home:"Home",news:"News",library:"Library",history:"History",profile:"Profile",explore:"Explore"},ru:{welcome:"Выберите язык",desc:"VORTEX//PLAY будет использовать выбранный язык там, где это доступно.",continue:"Продолжить",home:"Главная",news:"Новости",library:"Библиотека",history:"История",profile:"Профиль",explore:"Обзор"},uz:{welcome:"Tilni tanlang",desc:"VORTEX//PLAY mavjud joylarda tanlangan tildan foydalanadi.",continue:"Davom etish",home:"Bosh sahifa",news:"Yangiliklar",library:"Kutubxona",history:"Tarix",profile:"Profil",explore:"Kashf etish"}};
let lang=localStorage.getItem(LANG_KEY)||"";
function languagePicker(){
 if(lang)return;
 const m=document.createElement("div");m.className="vp-lang";m.innerHTML='<section class="vp-lang__card"><span class="vp-arcade__badge">VORTEX // PLAY</span><h2>Choose your language</h2><p>Pick the language for your experience.</p><div class="vp-lang__options"><button data-l="en">🇬🇧 English<small>English interface</small></button><button data-l="ru">🇷🇺 Русский<small>Русский интерфейс</small></button><button data-l="uz">🇺🇿 O‘zbekcha<small>O‘zbekcha interfeys</small></button><button data-l="es">🇪🇸 Español<small>Spanish interface</small></button></div></section>';
 document.body.appendChild(m);m.addEventListener("click",e=>{let b=e.target.closest("[data-l]");if(!b)return;lang=b.dataset.l;localStorage.setItem(LANG_KEY,lang);m.remove();applyLanguage();});
}
function applyLanguage(){
 const l=labels[lang];if(!l)return;
 document.documentElement.lang=lang;
 document.querySelectorAll(".nav a").forEach(a=>{let key=a.textContent.trim().toLowerCase();if(l[key])a.textContent=l[key]});
}
document.addEventListener("DOMContentLoaded",()=>{applyLanguage();languagePicker()});
})();
