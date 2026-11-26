/* =====================================================================
   0. FEATURE-DETECTION & INTRO-STATUS (einmal global, statt in jedem
   Block neu geprüft). onIntroDone() lässt andere Abschnitte (z.B. den
   Zähler/Scramble im Hero) warten, bis die Intro-Türen vollständig
   offen sind – siehe markIntroDone() im Intro-Block weiter unten.
   ===================================================================== */
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var introDone = false;
var introDoneCallbacks = [];
function onIntroDone(cb){
  if(introDone){ cb(); } else { introDoneCallbacks.push(cb); }
}
function markIntroDone(){
  if(introDone) return;
  introDone = true;
  introDoneCallbacks.forEach(function(cb){ cb(); });
  introDoneCallbacks = [];
}

/* =====================================================================
   0b. INHALTE AUS content/*.json LADEN
   Alle pflegbaren Texte, Zeiten, Trainer, Kontaktdaten und Bilder liegen
   im Ordner "content" und werden über Pages CMS bearbeitet. Die Texte in
   der index.html sind nur noch die Rückfallebene (falls eine Datei nicht
   lädt oder die Seite lokal per Doppelklick geöffnet wird).
   Zuordnung im HTML:
     data-c="datei.feld"        -> Text
     data-c-html / -src / -alt / -href -> HTML, Bildquelle, Alt-Text, Link
     data-list="datei.liste"    -> Liste, wird unten komplett neu gebaut
   Alles, was Inhalte braucht (Animationen, Zähler, Popup), startet erst
   über onContentReady().
   ===================================================================== */
var contentReady = false;
var contentReadyCallbacks = [];
function onContentReady(cb){
  if(contentReady){ cb(); } else { contentReadyCallbacks.push(cb); }
}
function markContentReady(){
  if(contentReady) return;
  contentReady = true;
  contentReadyCallbacks.forEach(function(cb){ try{ cb(); }catch(e){} });
  contentReadyCallbacks = [];
}

(function(){
  var FILES = ['hero','zielgruppen','werte','training','team','vorteile','kontakt','footer','rechtliches'];

  // Icons der Vorteile-Karten: fest im Code, werden der Reihe nach vergeben
  var ICONS = [
    '<path d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4Z"/>',
    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    '<path d="M4 4h16v6a8 8 0 0 1-16 0V4Z"/><path d="M4 4H2v2a3 3 0 0 0 3 3M20 4h2v2a3 3 0 0 1-3 3M12 18v3M8 21h8"/>',
    '<path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/>'
  ];

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function get(obj, path){
    return path.split('.').reduce(function(o, k){ return o == null ? undefined : o[k]; }, obj);
  }
  function isText(v){ return typeof v === 'string' || typeof v === 'number'; }
  function each(sel, fn){ Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function safe(fn){ try{ fn(); }catch(e){} }
  // Pages CMS speichert Bildpfade als "/img/datei.jpg" – relativ machen, damit
  // die Seite auch in einem Unterordner funktioniert.
  function url(p){ return String(p).replace(/^\//, ''); }

  function list(c, path, render){
    var el = document.querySelector('[data-list="' + path + '"]');
    var items = get(c, path);
    if(!el || !Array.isArray(items) || !items.length) return;
    el.innerHTML = items.map(render).join('');
  }

  function initials(name){
    return String(name).trim().split(/\s+/).map(function(w){ return w.charAt(0); })
      .slice(0, 2).join('').toUpperCase();
  }

  function telHref(nr){
    var d = String(nr).replace(/[^\d+]/g, '');
    if(d.charAt(0) === '0') d = '+49' + d.slice(1);
    return 'tel:' + d;
  }

  function options(id, values){
    var el = document.getElementById(id);
    if(!el || !Array.isArray(values) || !values.length) return;
    el.innerHTML = '<option value="">Bitte wählen</option>' + values.map(function(v){
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
  }

  function apply(c){
    /* --- einfache Felder --- */
    safe(function(){
      each('[data-c]', function(el){
        var v = get(c, el.getAttribute('data-c'));
        if(isText(v)) el.textContent = v;
      });
      each('[data-c-html]', function(el){
        var v = get(c, el.getAttribute('data-c-html'));
        if(isText(v) && v) el.innerHTML = v;
      });
      each('[data-c-src]', function(el){
        var v = get(c, el.getAttribute('data-c-src'));
        if(isText(v) && v) el.setAttribute('src', url(v));
      });
      each('[data-c-alt]', function(el){
        var v = get(c, el.getAttribute('data-c-alt'));
        if(isText(v)) el.setAttribute('alt', v);
      });
      each('[data-c-href]', function(el){
        var v = get(c, el.getAttribute('data-c-href'));
        if(isText(v) && v) el.setAttribute('href', url(v));
      });
    });

    /* --- Hero: Überschrift mit rot hervorgehobenem Wort + Statistiken --- */
    safe(function(){
      var h = c.hero, h1 = document.querySelector('[data-hero-titel]');
      if(!h || !h1 || !isText(h.titel)) return;
      var t = esc(h.titel).replace(/ &amp; /g, ' &amp; ');
      var hl = esc(h.titel_hervorhebung || '');
      var pos = hl ? t.indexOf(hl) : -1;
      if(pos !== -1) t = t.slice(0, pos) + '<em>' + hl + '</em>' + t.slice(pos + hl.length);
      h1.innerHTML = t;
    });
    safe(function(){
      list(c, 'hero.statistiken', function(s){
        var w = String(s.wert == null ? '' : s.wert).trim();
        // reine Zahlen zählen hoch, alles andere bekommt den Buchstaben-Effekt
        var cls = /^\d+$/.test(w) ? 'count-up' : 'scramble';
        return '<div class="stat"><b class="' + cls + '">' + esc(w) + '</b><span>' + esc(s.label) + '</span></div>';
      });
    });

    /* --- Zielgruppen --- */
    safe(function(){
      list(c, 'zielgruppen.karten', function(k, i){
        var red = i % 2 === 1 ? ' style="color:var(--red)"' : '';
        var mehr = k.mehr ? '<details class="more reveal"><summary>Mehr lesen</summary><p>' + esc(k.mehr) + '</p></details>' : '';
        return '<div class="audience-card reveal">' +
          '<span class="tag"' + red + '>● ' + esc(k.tag) + '</span>' +
          '<h3>' + esc(k.titel) + '</h3>' +
          '<p>' + esc(k.text) + '</p>' + mehr + '</div>';
      });
    });

    /* --- Werte --- */
    safe(function(){
      var q = document.querySelector('[data-werte-zitat]');
      if(q && c.werte && isText(c.werte.zitat)) q.textContent = '„' + c.werte.zitat + '“';
      list(c, 'werte.ziele', function(z){
        var punkte = (Array.isArray(z.punkte) ? z.punkte : []).map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('');
        return '<div class="ziel-card reveal"><h4>' + esc(z.titel) + '</h4><ul>' + punkte + '</ul></div>';
      });
    });

    /* --- Training: Zeiten + Auswahlfelder im Probetraining-Popup --- */
    safe(function(){
      list(c, 'training.zeiten', function(z){
        return '<div class="time-row"><span class="label">' + esc(z.gruppe) + '</span>' +
          '<span class="time">' + esc(z.tage) + ' · ' + esc(z.uhrzeit) + '</span></div>';
      });
      var t = c.training;
      if(!t) return;
      options('trial-day', t.probetraining_tage);
      if(Array.isArray(t.zeiten)){
        options('trial-time', t.zeiten.map(function(z){ return z.uhrzeit + ' (' + z.gruppe + ')'; }));
      }
    });

    /* --- Team: Foto falls vorhanden, sonst Initialen; Streifen = Dan-Grad --- */
    safe(function(){
      list(c, 'team.trainer', function(p){
        var dan = Math.max(0, Math.min(10, parseInt(p.dan, 10) || 0));
        var rank = (dan ? dan + '. Dan' : '') + (dan && p.rolle ? ' · ' : '') + (p.rolle ? p.rolle : '');
        var stripes = '';
        for(var i = 0; i < dan; i++) stripes += '<span></span>';
        var avatar = p.foto
          ? '<span class="avatar avatar-photo"><img src="' + esc(url(p.foto)) + '" alt="" loading="lazy"></span>'
          : '<span class="avatar">' + esc(initials(p.name)) + '</span>';
        return '<div class="team-card reveal">' + avatar +
          '<h4>' + esc(p.name) + '</h4>' +
          (rank ? '<span class="rank">' + esc(rank) + '</span>' : '') +
          (dan ? '<div class="dan-stripes" aria-hidden="true">' + stripes + '</div>' : '') +
          '<p>' + esc(p.text) + '</p></div>';
      });
    });

    /* --- Vorteile --- */
    safe(function(){
      list(c, 'vorteile.punkte', function(p, i){
        return '<div class="usp reveal"><span class="icon-badge">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + ICONS[i % ICONS.length] + '</svg>' +
          '</span><div class="usp-body"><h4>' + esc(p.titel) + '</h4><p>' + esc(p.text) + '</p></div></div>';
      });
    });

    /* --- Kontaktdaten (Kontakt-Section + Footer) --- */
    safe(function(){
      var k = c.kontakt;
      if(!k) return;
      var adresse = [k.ort_name, k.strasse, k.plz_ort].filter(function(x){ return isText(x) && x !== ''; }).map(esc).join('<br>');
      if(adresse) each('[data-k="adresse"]', function(el){ el.innerHTML = adresse; });
      if(isText(k.telefon) && k.telefon) each('[data-k="tel"]', function(el){
        el.textContent = k.telefon;
        el.setAttribute('href', telHref(k.telefon));
      });
      if(isText(k.email) && k.email) each('[data-k="mail"]', function(el){
        el.textContent = k.email;
        el.setAttribute('href', 'mailto:' + k.email);
      });
    });

    /* --- Fußbereich (Footer) --- */
    safe(function(){
      var f = c.footer;
      if(!f) return;
      if(isText(f.tagline) && f.tagline) each('[data-f="tagline"]', function(el){
        el.innerHTML = esc(f.tagline).replace(/\r?\n/g, '<br>');
      });
      list(c, 'footer.verband', function(v){
        if(!v || !isText(v.name) || !v.name) return '';
        var href = isText(v.url) ? String(v.url).trim() : '';
        if(href && !/^https?:\/\//i.test(href)) href = 'https://' + href;
        return '<p>' + (href
          ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(v.name) + '</a>'
          : esc(v.name)) + '</p>';
      });
      if(isText(f.rechteinhaber) && f.rechteinhaber) each('[data-f="copyright"]', function(el){
        el.textContent = '\u00A9 ' + new Date().getFullYear() + ' ' + f.rechteinhaber;
      });
    });
  }

  var done = false;
  function finish(c){
    if(done) return;
    done = true;
    if(c) safe(function(){ apply(c); });
    markContentReady();
  }

  // Sicherheitsnetz: lädt der Inhalt nicht rechtzeitig, startet die Seite mit
  // den Texten aus der index.html.
  setTimeout(function(){ finish(null); }, 2500);

  if(!window.fetch || !window.Promise || location.protocol === 'file:'){ finish(null); return; }

  Promise.all(FILES.map(function(name){
    return fetch('content/' + name + '.json', {cache:'no-cache'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(){ return null; })
      .then(function(data){ return [name, data]; });
  })).then(function(pairs){
    var c = {};
    pairs.forEach(function(p){ if(p[1]) c[p[0]] = p[1]; });
    finish(c);
  });
})();

/* =====================================================================
   1. INTRO-EFFEKT BEIM LADEN (Türflügel)
   ===================================================================== */
(function(){
  try{
    var intro = document.getElementById('intro');
    if(!intro){ markIntroDone(); return; }

    if(reduceMotion){ intro.remove(); markIntroDone(); return; }

    document.body.classList.add('intro-active');

    function play(){
      requestAnimationFrame(function(){
        document.body.classList.add('intro-ready');
      });
      setTimeout(function(){ document.body.classList.add('intro-exit'); }, 1100);
      setTimeout(function(){
        document.body.classList.remove('intro-active');
        intro.remove();
        markIntroDone(); // Türen sind jetzt vollständig offen
      }, 1900);
    }

    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(play);
    } else {
      play();
    }
  }catch(e){}
})();

/* =====================================================================
   2. EINTRITTS-ANIMATION BEIM SCROLLEN (.reveal)
   ===================================================================== */
onContentReady(function(){
  try{
    var revealEls = document.querySelectorAll('.reveal');
    if(!revealEls.length) return;

    if(reduceMotion){
      revealEls.forEach(function(el){ el.classList.add('is-visible'); });
      return;
    }

    // Niedrige Schwelle + prozentualer rootMargin (statt fixer 40px): auf dem Handy
    // stapeln sich die Grid-Spalten zu oft sehr hohen Blöcken, daher sonst zu spät/
    // gar nicht ausgelöst, wenn ein hoher Block erst zu 15% im kurzen Viewport steht.
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, {threshold:0.05, rootMargin:'0px 0px -5% 0px'});

    revealEls.forEach(function(el){ revealObserver.observe(el); });
  }catch(e){}
});

/* =====================================================================
   3. GRADUIERUNGS-FORTSCHRITTSBALKEN (Belt-Progress)
   Position unter der Navbar + Füllstand beim Scrollen
   ===================================================================== */
onContentReady(function(){
  try{
    var bar = document.querySelector('.belt-progress');
    var fill = document.getElementById('belt-progress-fill');
    var header = document.querySelector('header');
    if(!bar || !fill || !header) return;

    function positionBar(){
      bar.style.top = header.getBoundingClientRect().height + 'px';
    }

    function updateFill(){
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var maxScroll = (doc.scrollHeight - doc.clientHeight) || 1;
      var fraction = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      fill.style.width = (fraction * 100) + '%';
    }

    positionBar();
    updateFill();
    window.addEventListener('scroll', updateFill, {passive:true});
    window.addEventListener('resize', function(){
      positionBar();
      updateFill();
    });
  }catch(e){}
});

/* =====================================================================
   4. SEITEN-NAVIGATION (Dots rechts) – aktive Section hervorheben
   ===================================================================== */
onContentReady(function(){
  try{
    var dots = document.querySelectorAll('.section-dots .dot');
    if(!dots.length) return;

    var sections = [];
    dots.forEach(function(dot){
      var sec = document.getElementById(dot.dataset.section);
      if(sec) sections.push({dot:dot, el:sec});
    });
    if(!sections.length) return;

    var dotObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var match = sections.find(function(s){ return s.el === entry.target; });
        if(!match) return;
        dots.forEach(function(d){ d.classList.remove('is-active'); });
        match.dot.classList.add('is-active');
      });
    }, {rootMargin:'-45% 0px -45% 0px'});

    sections.forEach(function(s){ dotObserver.observe(s.el); });
  }catch(e){}
});

/* =====================================================================
   5. HEADER: Mobile-Menü schließt sich beim Klick auf einen Link
   ===================================================================== */
(function(){
  try{
    var toggle = document.getElementById('menu-toggle');
    if(!toggle) return;
    document.querySelectorAll('nav.links a').forEach(function(a){
      a.addEventListener('click', function(){ toggle.checked = false; });
    });
  }catch(e){}
})();

/* =====================================================================
   6. HEADER: Dark-Mode-Umschalter
   Standard ist immer Hell. Merkt sich eine bewusste Nutzer-Wahl (Klick auf
   den Umschalter) dauerhaft in localStorage – die Systemeinstellung wird
   nicht mehr automatisch übernommen.
   ===================================================================== */
(function(){
  try{
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');
    if(!btn) return;

    // Standard ist immer Hell – nur eine gespeicherte, bewusste Wahl des
    // Nutzers (Klick auf den Umschalter) aktiviert den Dark-Mode.
    var stored = null;
    try{ stored = localStorage.getItem('theme'); }catch(e){}
    var current = stored === 'dark' ? 'dark' : 'light';

    function applyTheme(theme){
      root.setAttribute('data-theme', theme);
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }

    applyTheme(current);

    btn.addEventListener('click', function(){
      current = current === 'dark' ? 'light' : 'dark';
      applyTheme(current);
      try{ localStorage.setItem('theme', current); }catch(e){}
    });
  }catch(e){}
})();

/* =====================================================================
   7. HERO: Zähler hochzählen (count-up), wiederholt sich bei jedem Scroll
   ===================================================================== */
onContentReady(function(){
  try{
    var els = document.querySelectorAll('.count-up');
    if(!els.length) return;

    function animateCount(el){
      var target = parseInt(el.textContent.replace(/\D/g,''), 10);
      if(isNaN(target)) return;
      if(reduceMotion){ el.textContent = target; return; }

      var duration = 1800, start = null;
      el.textContent = '0';
      function step(ts){
        if(!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if(progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    }

    var counterObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          animateCount(entry.target);
        }
      });
    }, {threshold:0.4});

    // Erst beobachten (und damit ggf. sofort auslösen), wenn die Intro-Türen
    // vollständig offen sind – sonst rattert der Zähler unsichtbar dahinter.
    onIntroDone(function(){
      els.forEach(function(el){ counterObserver.observe(el); });
    });
  }catch(e){}
});

/* =====================================================================
   8. HERO: DJKB-Scramble-Effekt, wiederholt sich bei jedem Scroll
   ===================================================================== */
onContentReady(function(){
  try{
    var els = document.querySelectorAll('.scramble');
    if(!els.length) return;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function scramble(el){
      var target = el.textContent;
      if(reduceMotion){ el.textContent = target; return; }

      var rattleFrames = 40;    // gemeinsames Rattern am Anfang (alle Buchstaben)
      var lockInterval = 20;    // Frames Pause zwischen jedem einzelnen Einrasten
      var totalFrames = rattleFrames + lockInterval * target.length;
      var frame = 0;

      function step(){
        var out = '';
        if(frame < rattleFrames){
          for(var i = 0; i < target.length; i++){
            out += chars[Math.floor(Math.random() * chars.length)];
          }
        } else {
          var framesIntoLockPhase = frame - rattleFrames;
          var revealCount = Math.min(target.length, Math.floor(framesIntoLockPhase / lockInterval) + 1);
          for(var j = 0; j < target.length; j++){
            out += j < revealCount ? target[j] : chars[Math.floor(Math.random() * chars.length)];
          }
        }
        el.textContent = out;
        frame++;
        if(frame < totalFrames){
          requestAnimationFrame(step);
        } else {
          el.textContent = target;
        }
      }
      step();
    }

    var scrambleObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          scramble(entry.target);
        }
      });
    }, {threshold:0.4});

    // Gleiches Prinzip wie beim Zähler: erst starten, wenn die Türen offen sind.
    onIntroDone(function(){
      els.forEach(function(el){ scrambleObserver.observe(el); });
    });
  }catch(e){}
});

/* =====================================================================
   9. WARUM WIR: Stack-Titel (WAS/UNS/AUSMACHT) auf Breite/Höhe fitten
   ===================================================================== */
onContentReady(function(){
  try{
    var lines = document.querySelectorAll('.stack-line');
    var container = document.querySelector('.stack-title');
    if(!lines.length || !container) return;

    function fitLines(){
      var containerWidth = container.clientWidth * 0.78;
      var probeSize = 100;
      lines.forEach(function(el){ el.style.fontSize = probeSize + 'px'; });
      var widths = Array.prototype.map.call(lines, function(el){ return el.getBoundingClientRect().width; });
      var maxWidth = Math.max.apply(null, widths);
      if(!maxWidth) return;

      var masterScale = containerWidth / maxWidth;
      lines.forEach(function(el, i){
        var lineScale = (maxWidth / widths[i]) * masterScale;
        el.style.fontSize = (probeSize * lineScale) + 'px';
      });

      // Eyebrow-Laufweite an die neue Titelbreite anpassen
      var eyebrow = document.querySelector('.usp-title .eyebrow');
      if(eyebrow){
        eyebrow.style.letterSpacing = 'normal';
        var eyebrowWidth = eyebrow.getBoundingClientRect().width;
        var gaps = eyebrow.textContent.trim().length - 1;
        if(gaps > 0 && eyebrowWidth > 0){
          eyebrow.style.letterSpacing = ((containerWidth - eyebrowWidth) / gaps) + 'px';
        }
      }

      // Höhe an die 4 Karten rechts angleichen
      container.style.lineHeight = '.86';
      var list = document.querySelector('.usp-list');
      var uspTitle = document.querySelector('.usp-title');
      if(list && uspTitle){
        var listHeight = list.getBoundingClientRect().height;
        var titleHeight = uspTitle.getBoundingClientRect().height;
        var stackHeight = container.getBoundingClientRect().height;
        var diff = titleHeight - listHeight;
        if(stackHeight > 0){
          var newStackHeight = stackHeight - diff;
          var scale = Math.max(newStackHeight / stackHeight, 0.3);
          container.style.lineHeight = (0.86 * scale) + '';
        }
      }
    }

    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(fitLines);
    } else {
      fitLines();
    }
    window.addEventListener('resize', fitLines);
  }catch(e){}
});

/* =====================================================================
   10. FORMULAR-VERSAND per EmailJS (Kontakt + Probetraining)
   ===================================================================== */
var EMAILJS = {
  publicKey: 'TTIpGlrGxdXzpr06h',
  serviceId: 'service_n8dkjwh',
  templateKontakt: 'template_ay7rajo',
  templateProbetraining: 'template_ay7rajo'
};

/* Spam-Schutz: Bots füllen das unsichtbare Feld "_website" aus, schicken in
   Sekunden nach dem Laden ab oder setzen Zufallszeichen mit Ziffern als Namen.
   Solche Anfragen werden still verworfen (der Bot sieht trotzdem "Danke"). */
var SEITE_GELADEN_UM = Date.now();
function istSpam(form){
  var hp = form.querySelector('[name="_website"]');
  if(hp && hp.value) return true;
  if(Date.now() - SEITE_GELADEN_UM < 4000) return true;
  var nameFeld = form.querySelector('[name="name"]');
  if(nameFeld && /\d/.test(nameFeld.value)) return true;
  return false;
}

function sendViaEmailJS(templateId, form){
  if(istSpam(form)) return Promise.resolve({ ok: true });
  /* Beschriftungen der Felder in der Mail (Reihenfolge = Reihenfolge in der Tabelle) */
  var LABELS = {
    'kontakt-form': [['name','Name'],['email','E-Mail'],['message','Nachricht']],
    'trial-form':   [['day','Wochentag'],['time','Uhrzeit'],['name','Name'],['age','Alter'],['experience','Kampfsport-Erfahrung'],['mail','E-Mail']]
  };
  var istProbe = form.id === 'trial-form';
  var data = {};
  new FormData(form).forEach(function(value, key){ data[key] = String(value).trim(); });

  function esc(t){ return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var rows = (LABELS[form.id] || []).map(function(pair){
    var wert = esc(data[pair[0]]).replace(/\n/g,'<br>');
    if(pair[0] === 'age' && wert) wert += ' Jahre';
    return '<tr><td style="padding:10px 0;border-bottom:1px solid #eadfcd;width:38%;font:600 12px/1.4 Arial,Helvetica,sans-serif;color:#8a7560;text-transform:uppercase;letter-spacing:.06em;vertical-align:top;">' + pair[1] + '</td>'
         + '<td style="padding:10px 0;border-bottom:1px solid #eadfcd;font:15px/1.5 Arial,Helvetica,sans-serif;color:#3b2e21;vertical-align:top;">' + (wert || '–') + '</td></tr>';
  }).join('');

  var name = data.name || '';
  var params = {
    art: istProbe ? 'Probetraining' : 'Kontakt',
    name: name,
    reply_email: istProbe ? data.mail : data.email,
    betreff: istProbe ? ('Probetraining: ' + name + ' – ' + (data.day || '')) : ('Neue Nachricht von ' + name),
    titel: istProbe ? (name + ' möchte zum Probetraining kommen') : ('Nachricht von ' + name),
    bestaetigung_betreff: istProbe ? 'Deine Anfrage zum Probetraining ist angekommen' : 'Deine Nachricht ist angekommen',
    bestaetigung_text: istProbe
      ? 'danke für deine Anfrage zum kostenlosen Probetraining! Sie ist gut bei uns angekommen. Wir melden uns in Kürze bei dir, um den Termin zu bestätigen.'
      : 'danke für deine Nachricht! Sie ist gut bei uns angekommen. Wir melden uns so schnell wie möglich bei dir.',
    details_html: '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + '</table>',
    gesendet_am: new Date().toLocaleString('de-DE', {dateStyle:'full', timeStyle:'short'})
  };

  return fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: templateId,
      user_id: EMAILJS.publicKey,
      template_params: params
    })
  });
}

/* Kontakt: Gutschein-Formular */
(function(){
  try{
    var form = document.getElementById('kontakt-form');
    var note = document.getElementById('kontakt-note');
    if(!form || !note) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      note.hidden = true;

           sendViaEmailJS(EMAILJS.templateKontakt, form).then(function(response){
        if(response.ok){
          note.textContent = 'Danke für deine Nachricht! Wir melden uns bei dir.';
          note.className = 'voucher-note voucher-note-ok';
          note.hidden = false;
          form.reset();
        } else {
          note.textContent = 'Da ist etwas schiefgelaufen. Bitte versuch es nochmal oder schreib uns direkt eine Mail.';
          note.className = 'voucher-note voucher-note-error';
          note.hidden = false;
        }
      }).catch(function(){
        note.textContent = 'Da ist etwas schiefgelaufen. Bitte versuch es nochmal oder schreib uns direkt eine Mail.';
        note.className = 'voucher-note voucher-note-error';
        note.hidden = false;
      });
    });
  }catch(e){}
})();

/* =====================================================================
   11. RECHTLICHES: Impressum/Datenschutz per URL-Hash automatisch öffnen
   ===================================================================== */
(function(){
  try{
    function openLegalFromHash(){
      var id = location.hash.slice(1);
      if(!id) return;
      var el = document.getElementById(id);
      if(el && el.tagName === 'DETAILS'){
        el.open = true;
        el.scrollIntoView({behavior:'smooth', block:'start'});
      }
    }
    window.addEventListener('hashchange', openLegalFromHash);
    openLegalFromHash();
  }catch(e){}
})();

/* =====================================================================
   12. PROBETRAINING-POPUP (Modal: öffnen, schließen, per EmailJS senden)
   ===================================================================== */
onContentReady(function(){
  try{
    var modal = document.getElementById('trial-modal');
    var form = document.getElementById('trial-form');
    if(!modal || !form) return;

    // Jeder Button, dessen Text "Probetraining" enthält, öffnet das Modal
    document.querySelectorAll('a.btn').forEach(function(btn){
      if(/probetraining/i.test(btn.textContent)){
        btn.addEventListener('click', function(e){
          e.preventDefault();
          modal.showModal();
        });
      }
    });

    modal.querySelector('.trial-modal-close').addEventListener('click', function(){
      modal.close();
    });
    modal.addEventListener('click', function(e){
      if(e.target === modal){ modal.close(); }
    });

    var note = document.getElementById('trial-note');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      note.hidden = true;

            sendViaEmailJS(EMAILJS.templateProbetraining, form).then(function(response){
        if(response.ok){
          note.textContent = 'Danke! Deine Anfrage ist raus, wir melden uns bei dir.';
          note.className = 'trial-modal-note trial-modal-note-ok';
          note.hidden = false;
          form.reset();
          setTimeout(function(){ modal.close(); note.hidden = true; }, 2500);
        } else {
          note.textContent = 'Da ist etwas schiefgelaufen. Bitte versuch es nochmal oder schreib uns direkt eine Mail.';
          note.className = 'trial-modal-note trial-modal-note-error';
          note.hidden = false;
        }
      }).catch(function(){
        note.textContent = 'Da ist etwas schiefgelaufen. Bitte versuch es nochmal oder schreib uns direkt eine Mail.';
        note.className = 'trial-modal-note trial-modal-note-error';
        note.hidden = false;
      });
    });
  }catch(e){}
});
