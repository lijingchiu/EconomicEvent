const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2a1f17"/>
  <g transform="translate(0 1)">
    <path d="M14 45h36M18 40V29m9 11V22m10 18V31m9 9V19" fill="none" stroke="#e7e5df" stroke-width="3.5" stroke-linecap="round"/>
    <path d="m17 25 10-7 10 5 10-8" fill="none" stroke="#c98752" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="47" cy="15" r="3.5" fill="#c98752"/>
  </g>
</svg>`;

const PAPER_TEXTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <defs>
    <pattern id="dots" width="64" height="64" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="12" r="1.2" fill="#2a1f17" fill-opacity=".16"/>
      <circle cx="36" cy="18" r=".9" fill="#2a1f17" fill-opacity=".16"/>
      <circle cx="18" cy="44" r="1" fill="#2a1f17" fill-opacity=".12"/>
      <circle cx="52" cy="52" r="1.1" fill="#2a1f17" fill-opacity=".14"/>
    </pattern>
  </defs>
  <rect width="320" height="320" fill="#e7e5df" fill-opacity="0"/>
  <rect width="320" height="320" fill="url(#dots)"/>
</svg>`;

export function faviconRoute(): Response {
  return new Response(APP_ICON_SVG, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=604800, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export function paperTextureRoute(): Response {
  return new Response(PAPER_TEXTURE_SVG, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=604800, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export function dashboardRoute(): Response {
  return new Response(DASHBOARD_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
    },
  });
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="zh-Hant" data-theme="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#e7e5df">
  <meta name="description" content="美國經濟事件、官方數值與多頻道提醒控制台">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <title>Macro Pulse｜美國經濟事件</title>
  <script>(function(){try{var value=localStorage.getItem('macro-pulse-theme'),lang=localStorage.getItem('macro-pulse-language');if(['light','dark','system'].indexOf(value)>=0)document.documentElement.setAttribute('data-theme',value);if(lang==='en')document.documentElement.setAttribute('lang','en')}catch(error){}})();</script>
  <style>
    :root{color-scheme:light;--paper:#e7e5df;--paper-2:#f2eee8;--paper-3:#ddd7cb;--ink:#2a1f17;--muted:#6d6258;--faint:#92867c;--line:rgba(42,31,23,.14);--line-strong:rgba(42,31,23,.28);--accent:#7a4a28;--accent-soft:rgba(122,74,40,.11);--positive:#446c56;--positive-soft:rgba(68,108,86,.1);--warning:#9b6b25;--danger:#9d5050;--danger-soft:rgba(157,80,80,.1);--shadow:0 24px 80px rgba(58,45,35,.1);--serif:"Noto Serif TC","Songti TC",Georgia,serif;--sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;--mono:"SFMono-Regular",Consolas,monospace}
    html[data-theme="dark"]{color-scheme:dark;--paper:#18130d;--paper-2:#221b13;--paper-3:#2b2117;--ink:#f0e4d2;--muted:#b1a087;--faint:#887962;--line:rgba(240,228,210,.14);--line-strong:rgba(240,228,210,.26);--accent:#d39a68;--accent-soft:rgba(211,154,104,.12);--positive:#81b895;--positive-soft:rgba(129,184,149,.1);--warning:#dfad61;--danger:#df8585;--danger-soft:rgba(223,133,133,.1);--shadow:0 28px 90px rgba(0,0,0,.34)}
    @media(prefers-color-scheme:dark){html[data-theme="system"]{color-scheme:dark;--paper:#18130d;--paper-2:#221b13;--paper-3:#2b2117;--ink:#f0e4d2;--muted:#b1a087;--faint:#887962;--line:rgba(240,228,210,.14);--line-strong:rgba(240,228,210,.26);--accent:#d39a68;--accent-soft:rgba(211,154,104,.12);--positive:#81b895;--positive-soft:rgba(129,184,149,.1);--warning:#dfad61;--danger:#df8585;--danger-soft:rgba(223,133,133,.1);--shadow:0 28px 90px rgba(0,0,0,.34)}}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 14% -8%,color-mix(in srgb,var(--paper-2) 70%,var(--paper) 30%),transparent 42%),radial-gradient(ellipse at 88% 18%,color-mix(in srgb,var(--paper-3) 36%,transparent),transparent 42%),linear-gradient(145deg,var(--paper-2),var(--paper) 52%,var(--paper-3));color:var(--ink);font-family:var(--sans);overflow-x:hidden}
    body:before,body:after{content:"";position:fixed;inset:-80px;z-index:-1;pointer-events:none;background-image:url('/paper-texture.svg');background-repeat:repeat;mix-blend-mode:multiply}
    body:before{opacity:.68;background-size:360px 360px;background-position:0 0}body:after{opacity:.18;background-size:540px 540px;background-position:140px 80px;transform:rotate(.35deg)}
    html[data-theme="dark"] body:before{opacity:.16;filter:invert(1) sepia(.4);mix-blend-mode:screen}html[data-theme="dark"] body:after{opacity:.08;filter:invert(1) sepia(.4);mix-blend-mode:screen}
    @media(prefers-color-scheme:dark){html[data-theme="system"] body:before{opacity:.16;filter:invert(1) sepia(.4);mix-blend-mode:screen}html[data-theme="system"] body:after{opacity:.08;filter:invert(1) sepia(.4);mix-blend-mode:screen}}
    button,input,select{font:inherit}button{cursor:pointer}.hidden{display:none!important}
    .app-shell{min-height:100vh}
    .site-header{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--paper) 90%,transparent);backdrop-filter:blur(18px)}
    .header-inner{width:min(1440px,calc(100% - 64px));margin:auto;min-height:76px;display:flex;align-items:center;gap:18px}
    .brand{display:flex;align-items:center;gap:12px;min-width:260px}
    .brand-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--ink);box-shadow:0 8px 20px rgba(0,0,0,.12)}
    .brand-icon svg{width:24px;height:24px}
    .brand-copy strong{display:block;font:700 13px/1 var(--serif);letter-spacing:.16em}
    .brand-copy small{display:block;margin-top:7px;color:var(--muted);font:600 9px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase}
    .nav{display:flex;align-items:center;gap:4px;margin-right:auto;flex-wrap:nowrap;white-space:nowrap}
    .nav button{border:0;background:transparent;color:var(--muted);padding:9px 10px;font-size:12px;letter-spacing:.05em;position:relative}
    .nav button:after{content:"";position:absolute;left:10px;right:10px;bottom:4px;height:1px;background:var(--accent);transform:scaleX(0);transition:transform .2s}
    .nav button:hover,.nav button.active{color:var(--ink)}
    .nav button.active:after{transform:scaleX(1)}
    .header-tools{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;white-space:nowrap}
    .online{display:flex;align-items:center;gap:7px;color:var(--muted);font:600 10px/1 var(--mono);letter-spacing:.06em;white-space:nowrap}
    .dot{width:7px;height:7px;border-radius:50%;background:var(--positive);box-shadow:0 0 0 4px var(--positive-soft)}.dot.danger{background:var(--danger);box-shadow:0 0 0 4px var(--danger-soft)}
    .theme-switcher{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:3px;border:1px solid var(--line);border-radius:999px;background:var(--paper-3)}
    .theme-switcher button{width:30px;height:28px;border:0;border-radius:999px;background:transparent;color:var(--muted);display:grid;place-items:center}
    .theme-switcher button[aria-pressed="true"]{background:var(--paper-2);color:var(--accent);box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .theme-switcher svg{width:14px;height:14px}
    .language-switcher{display:flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--paper-3)}
    .language-switcher button{height:27px;padding:0 9px;border:0;border-radius:999px;background:transparent;color:var(--muted);font:600 8px/1 var(--mono)}
    .language-switcher button.active{background:var(--paper-2);color:var(--accent);box-shadow:0 2px 10px rgba(42,31,23,.1)}
    .time-chip{border:1px solid var(--line);background:var(--paper-2);color:var(--ink);border-radius:10px;padding:10px 12px;font-size:12px;white-space:nowrap}
    .control-trigger{height:34px;border:1px solid var(--line-strong);border-radius:999px;padding:0 13px;background:var(--ink);color:var(--paper-2);font:700 9px/1 var(--mono);letter-spacing:.05em;white-space:nowrap;transition:transform .2s,background .2s}
    .control-trigger:hover{transform:translateY(-1px);background:var(--accent)}
    .page{width:min(1440px,calc(100% - 64px));margin:0 auto;padding:60px 0 80px}
    .hero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.55fr);gap:44px;align-items:end;padding-bottom:48px;border-bottom:1px solid var(--line-strong)}
    .section-kicker{display:flex;align-items:center;gap:10px;color:var(--accent);font:600 10px/1 var(--mono);letter-spacing:.15em;text-transform:uppercase}
    .section-kicker:before{content:"";width:30px;height:1px;background:currentColor}
    .hero h1{max-width:900px;margin:18px 0 18px;font:700 clamp(48px,6.5vw,96px)/.96 var(--serif);letter-spacing:-.045em}
    .hero h1 span{display:block;margin-top:10px;color:var(--accent);font-size:.56em;font-style:italic;letter-spacing:-.02em}
    .hero-intro{max-width:720px;margin:0;color:var(--muted);font-size:13px;line-height:1.9;letter-spacing:.02em}
    .hero-actions{display:flex;align-items:center;gap:10px;margin-top:26px;flex-wrap:wrap}
    .btn{min-height:42px;border:1px solid var(--line-strong);border-radius:2px;padding:10px 15px;background:transparent;color:var(--ink);font-size:11px;font-weight:700;letter-spacing:.08em;transition:transform .16s,background .16s,color .16s,border-color .16s}
    .btn:hover{transform:translateY(-1px);background:var(--accent-soft)}
    .btn.primary{border-color:var(--ink);background:var(--ink);color:var(--paper-2)}
    .btn.primary:hover{background:var(--accent);border-color:var(--accent)}
    .btn:disabled{opacity:.5;cursor:wait;transform:none}
    .btn .button-icon{margin-right:7px;font-size:14px}
    .hero-focus{border-top:4px solid var(--ink);padding-top:16px}
    .focus-label{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font:600 9px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase}
    .focus-name{margin:22px 0 16px;font:600 clamp(24px,3vw,38px)/1.22 var(--serif)}
    .focus-time{display:flex;align-items:end;justify-content:space-between;gap:12px;padding-top:15px;border-top:1px solid var(--line)}
    .focus-time strong{font:700 18px/1 var(--mono);color:var(--accent)}
    .focus-time span{color:var(--muted);font-size:10px;text-align:right}
    .ledger{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line-strong)}
    .stat{padding:24px 22px;border-right:1px solid var(--line)}
    .stat:first-child{padding-left:0}
    .stat:last-child{border-right:0}
    .stat-label{color:var(--muted);font:600 10px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase}
    .stat-value{margin:13px 0 8px;font:700 34px/1 var(--serif)}
    .stat-note{color:var(--faint);font-size:10px}
    .content-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.55fr);gap:38px;padding-top:58px}
    .section-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:26px}
    .section-number{color:var(--accent);font:600 10px/1 var(--mono);letter-spacing:.16em}
    .section-title{margin:8px 0 0;font:600 clamp(28px,3.5vw,48px)/1.1 var(--serif);letter-spacing:-.02em}
    .section-sub{max-width:480px;margin:9px 0 0;color:var(--muted);font-size:11px;line-height:1.7}
    .event-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}
    .view-switch{display:flex;gap:4px;padding-right:8px;margin-right:2px;border-right:1px solid var(--line)}
    .filter-btn{height:34px;border:1px solid var(--line);border-radius:999px;padding:0 12px;background:transparent;color:var(--muted);font:600 9px/1 var(--mono);letter-spacing:.05em}
    .filter-btn:hover,.filter-btn.active{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
    .filter-link{display:inline-grid;place-items:center;text-decoration:none;white-space:nowrap}
    .control{min-height:38px;border:1px solid var(--line);border-radius:2px;padding:8px 10px;background:var(--paper-2);color:var(--ink);font-size:10px;outline:none}
    .control:focus{border-color:var(--accent)}
    .events{border-top:1px solid var(--line-strong)}
    .event{display:grid;grid-template-columns:88px minmax(0,1fr);gap:20px;padding:24px 0;border-bottom:1px solid var(--line);animation:reveal .45s both}
    .event-date{padding-left:12px;border-left:3px solid var(--muted)}
    .event-date.high{border-color:var(--danger)}
    .event-date.medium{border-color:var(--warning)}
    .event-date.low{border-color:var(--muted)}
    .event-date small{display:block;color:var(--muted);font:600 9px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
    .event-date strong{display:block;margin-top:9px;font:700 18px/1 var(--mono)}
    .event-date span{display:block;margin-top:7px;color:var(--muted);font-size:9px}
    .event-main{min-width:0}
    .event-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
    .event-name-row{display:flex;align-items:flex-start;gap:8px;min-width:0}.event-name-row .event-name,.event-name-row h3{min-width:0}.event-info{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;width:17px;height:17px;margin-top:3px;padding:0;border:1px solid var(--accent);border-radius:50%;background:transparent;color:var(--accent);font:700 10px/1 var(--mono);cursor:help}.event-tooltip{position:absolute;left:calc(100% + 10px);top:-8px;z-index:30;width:300px;padding:14px 15px;border:1px solid var(--line-strong);background:var(--paper-2);color:var(--ink);box-shadow:var(--shadow);font:400 10px/1.7 var(--sans);text-align:left;white-space:pre-line;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-4px);transition:opacity .15s,transform .15s,visibility .15s}.event-tooltip strong{display:block;margin-bottom:5px;font:700 13px/1.35 var(--serif);color:var(--accent)}.event-tooltip em{display:block;margin-top:8px;color:var(--muted);font-style:normal}.event-info:hover .event-tooltip,.event-info:focus .event-tooltip,.event-info.open .event-tooltip{opacity:1;visibility:visible;transform:none}.event:has(.event-info:hover),.event:has(.event-info:focus),.event:has(.event-info.open){z-index:40}
    .event-name{font:600 18px/1.35 var(--serif)}
    .event-meta{display:flex;gap:11px;flex-wrap:wrap;color:var(--muted);font-size:9px;margin-top:9px}
    .event-meta span+span:before{content:"·";margin-right:11px;color:var(--faint)}
    .impact-badge{flex:0 0 auto;border:1px solid var(--line);border-radius:999px;padding:5px 8px;color:var(--muted);font:600 8px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase}
    .impact-badge.high{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 45%,transparent);background:var(--danger-soft)}
    .impact-badge.medium{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}
    .metrics{display:grid;grid-template-columns:repeat(3,minmax(76px,1fr));margin-top:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    .metric{padding:11px 13px;border-right:1px solid var(--line)}
    .metric:first-child{padding-left:0}
    .metric:last-child{border-right:0}
    .metric small{display:block;color:var(--muted);font:500 8px/1 var(--mono);letter-spacing:.09em;text-transform:uppercase}
    .metric b{display:block;margin-top:7px;font:700 13px/1 var(--mono)}
    .metric.actual b{color:var(--accent)}
    .empty{padding:46px 10px;text-align:center;color:var(--muted);font-size:12px;border-bottom:1px solid var(--line)}
    .calendar-shell{border-top:1px solid var(--line-strong)}
    .calendar-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 0}
    .calendar-head strong{font:600 20px/1 var(--serif)}
    .calendar-nav{display:flex;gap:5px}
    .calendar-nav button{width:34px;height:32px;border:1px solid var(--line);background:transparent;color:var(--ink)}
    .calendar-weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
    .calendar-weekdays span{padding:9px 7px;border-bottom:1px solid var(--line-strong);color:var(--muted);font:600 8px/1 var(--mono);letter-spacing:.08em;text-align:center}
    .calendar-day{min-height:116px;padding:8px;border:0;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--paper-2) 38%,transparent);color:var(--ink);text-align:left;overflow:hidden}
    .calendar-day:nth-child(7n){border-right:0}
    .calendar-day.outside{background:transparent;color:var(--faint)}
    .calendar-day.today{background:var(--accent-soft)}
    .calendar-day.selected{box-shadow:inset 0 0 0 2px var(--accent)}
    .calendar-date-number{display:block;margin-bottom:7px;font:600 9px/1 var(--mono)}
    .calendar-event-name{display:block;width:100%;margin:4px 0;padding:5px 6px;border:0;border-left:2px solid var(--muted);background:var(--paper-2);color:var(--ink);font-size:8px;line-height:1.35;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .calendar-event-name.high{border-color:var(--danger)}
    .calendar-event-name.medium{border-color:var(--warning)}
    .calendar-detail{margin-top:18px;padding:22px;border:1px solid var(--line-strong);background:var(--paper-2);animation:reveal .25s both}
    .calendar-detail h3{margin:0;font:600 24px/1.25 var(--serif)}
    .calendar-detail-time{margin:8px 0 0;color:var(--accent);font:600 10px/1.5 var(--mono)}
    .calendar-detail-description{margin:15px 0 0;color:var(--muted);font-size:10px;line-height:1.7}
    .side-column{display:grid;gap:18px;align-content:start}
    .editorial-panel{border-top:4px solid var(--ink);padding-top:16px}
    .panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
    .panel-title{margin:0;font:600 23px/1.2 var(--serif)}
    .panel-sub{margin:7px 0 0;color:var(--muted);font-size:10px;line-height:1.6}
    .panel-code{color:var(--accent);font:600 9px/1 var(--mono);letter-spacing:.1em}
    .setting-list{border-top:1px solid var(--line)}
    .setting-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 0;border-bottom:1px solid var(--line)}
    .setting-title{font-size:11px;font-weight:700}
    .setting-help{max-width:220px;color:var(--muted);font-size:9px;line-height:1.55;margin-top:4px}
    .toggle{width:42px;height:23px;border:1px solid var(--line-strong);border-radius:999px;background:transparent;position:relative;flex:0 0 auto}
    .toggle:after{content:"";position:absolute;top:3px;left:3px;width:15px;height:15px;border-radius:50%;background:var(--muted);transition:left .2s,background .2s}
    .toggle.on{border-color:var(--accent);background:var(--accent-soft)}
    .toggle.on:after{left:21px;background:var(--accent)}
    .reminders{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
    .reminder-choice{position:relative}
    .reminder-choice input{position:absolute;opacity:0;pointer-events:none}
    .reminder-choice span{display:block;border:1px solid var(--line);border-radius:2px;padding:6px 7px;color:var(--muted);font:600 8px/1 var(--mono)}
    .reminder-choice input:checked+span{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
    .number-control{width:78px}
    .save-row{display:flex;justify-content:flex-end;gap:7px;margin-top:15px}
    .provider-list{border-top:1px solid var(--line)}
    .provider{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid var(--line)}
    .provider-icon{width:31px;height:31px;border:1px solid var(--line-strong);border-radius:50%;display:grid;place-items:center;color:var(--accent);font:700 8px/1 var(--mono)}
    .provider-name{font:600 11px/1.2 var(--serif)}
    .provider-state{color:var(--muted);font-size:8px;line-height:1.4;margin-top:4px}
    .provider-health{font:600 8px/1 var(--mono);color:var(--positive)}
    .provider-health.warn{color:var(--warning)}
    .provider-health.fail{color:var(--danger)}
    .notice{margin-top:18px;padding:13px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--muted);font-size:9px;line-height:1.7}
    .footer{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:70px;padding-top:20px;border-top:1px solid var(--line-strong);color:var(--muted);font:500 9px/1.5 var(--mono);letter-spacing:.04em}
    .mobile-dock{display:none}
    .logout{border:0;background:transparent;color:var(--muted);padding:5px 0;font:600 9px/1 var(--mono);letter-spacing:.08em}
    .logout:hover{color:var(--danger)}
    .toast{position:fixed;right:24px;bottom:24px;z-index:60;max-width:390px;padding:14px 17px;border:1px solid var(--accent);background:var(--paper-2);color:var(--ink);box-shadow:var(--shadow);font-size:11px;opacity:0;transform:translateY(12px);pointer-events:none;transition:.22s}
    .toast.show{opacity:1;transform:translateY(0)}
    .toast.error{border-color:var(--danger);color:var(--danger)}
    body.modal-open{overflow:hidden}
    .modal-layer{position:fixed;inset:0;z-index:80;display:grid;justify-items:end;background:rgba(20,14,9,.26);backdrop-filter:blur(0);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s,visibility .28s,backdrop-filter .28s}
    .modal-layer.open{opacity:1;visibility:visible;pointer-events:auto;backdrop-filter:blur(10px)}
    .control-drawer{width:min(720px,100%);height:100%;overflow:auto;padding:30px clamp(22px,4vw,48px) 54px;border-left:1px solid var(--line-strong);background:linear-gradient(145deg,var(--paper-2),var(--paper));box-shadow:-30px 0 90px rgba(20,14,9,.2);transform:translateX(104%);transition:transform .54s cubic-bezier(.2,.8,.2,1)}
    .modal-layer.open .control-drawer{transform:none}
    .drawer-head{position:sticky;top:-30px;z-index:4;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:-30px 0 28px;padding:30px 0 18px;background:color-mix(in srgb,var(--paper-2) 92%,transparent);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
    .drawer-head h2{margin:5px 0 0;font:700 clamp(32px,5vw,54px)/1 var(--serif);letter-spacing:-.035em}
    .drawer-head p{max-width:470px;margin:11px 0 0;color:var(--muted);font-size:10px;line-height:1.7}
    .drawer-close{width:42px;height:42px;flex:0 0 auto;border:1px solid var(--line-strong);border-radius:50%;background:transparent;color:var(--ink);font-size:20px;transition:transform .25s,background .25s}
    .drawer-close:hover{transform:rotate(8deg);background:var(--accent-soft)}
    .drawer-grid{display:grid;grid-template-columns:1fr 1fr;gap:36px 30px}
    .drawer-grid .editorial-panel{opacity:0;transform:translateY(12px)}
    .modal-layer.open .drawer-grid .editorial-panel{animation:drawerReveal .42s both}
    .modal-layer.open .drawer-grid .editorial-panel:nth-child(2){animation-delay:.06s}.modal-layer.open .drawer-grid .editorial-panel:nth-child(3){animation-delay:.12s}.modal-layer.open .drawer-grid .editorial-panel:nth-child(4){animation-delay:.18s}
    .drawer-grid .wide{grid-column:1/-1}
    .health-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .health-card{padding:13px;border:1px solid var(--line);background:color-mix(in srgb,var(--paper) 60%,transparent)}
    .health-card strong{display:block;font:700 10px/1.3 var(--mono)}.health-card span{display:block;margin-top:6px;color:var(--muted);font-size:8px;line-height:1.45}.health-card.ok strong{color:var(--positive)}.health-card.warn strong{color:var(--warning)}.health-card.fail strong{color:var(--danger)}
    .channel-list{display:grid;gap:7px;margin-top:12px}.channel-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}.channel-row strong{font:700 10px/1.2 var(--serif)}.channel-row small{display:block;margin-top:4px;color:var(--muted);font-size:8px}.channel-state{font:700 8px/1 var(--mono);color:var(--positive)}.channel-state.missing{color:var(--faint)}
    .event-detail-layer{z-index:85}.event-detail-drawer{width:min(620px,100%)}
    .detail-status{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.status-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:var(--muted);font:700 8px/1 var(--mono);text-transform:uppercase}.status-pill.official{border-color:color-mix(in srgb,var(--positive) 45%,transparent);color:var(--positive);background:var(--positive-soft)}.status-pill.revised{border-color:var(--warning);color:var(--warning)}.status-pill.source_error{border-color:var(--danger);color:var(--danger)}
    .history-list{margin-top:22px;border-top:1px solid var(--line)}.history-item{display:grid;grid-template-columns:74px 1fr;gap:16px;padding:15px 0;border-bottom:1px solid var(--line)}.history-revision{font:700 9px/1 var(--mono);color:var(--accent)}.history-values{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.history-values small{display:block;color:var(--muted);font:600 7px/1 var(--mono);text-transform:uppercase}.history-values strong{display:block;margin-top:6px;font:700 11px/1 var(--mono)}
    .derived-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.derived-card{padding:13px;border:1px solid var(--line);background:var(--accent-soft)}.derived-card small{display:block;color:var(--muted);font:600 7px/1 var(--mono);letter-spacing:.07em;text-transform:uppercase}.derived-card strong{display:block;margin-top:7px;color:var(--accent);font:700 12px/1.2 var(--mono)}
    .record-actions{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}.record-list{border-top:1px solid var(--line)}.record-item{display:grid;grid-template-columns:100px minmax(0,1fr) auto;gap:12px;align-items:start;padding:12px 0;border-bottom:1px solid var(--line)}.record-item strong{font:700 9px/1.35 var(--mono);overflow-wrap:anywhere}.record-item span{color:var(--muted);font-size:8px;line-height:1.5;overflow-wrap:anywhere}.record-state{color:var(--positive)!important;font:700 8px/1 var(--mono)!important;text-transform:uppercase}.record-state.partial{color:var(--warning)!important}.record-state.failed{color:var(--danger)!important}
    .event-open{width:100%;margin-top:12px;border:0;border-bottom:1px solid transparent;padding:7px 0;background:transparent;color:var(--accent);font:700 8px/1 var(--mono);letter-spacing:.05em;text-align:left}.event-open:hover{border-color:var(--accent)}
    .favorite-btn{width:29px;height:29px;margin-left:7px;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--muted);font-size:14px;vertical-align:middle;transition:transform .2s,color .2s,background .2s}.favorite-btn:hover{transform:rotate(-8deg) scale(1.06)}.favorite-btn.active{color:var(--accent);background:var(--accent-soft);border-color:var(--accent)}
    .compact-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.compact-field label{display:block;margin-bottom:6px;color:var(--muted);font:600 8px/1 var(--mono);text-transform:uppercase}.compact-field .control{width:100%}
    .metric-state{font-size:9px!important;line-height:1.35!important;color:var(--muted)!important}.metric-state.error{color:var(--danger)!important}
    @keyframes drawerReveal{to{opacity:1;transform:none}}
    .login-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:20px;background:color-mix(in srgb,var(--paper) 90%,transparent);backdrop-filter:blur(18px)}
    .login-card{width:min(470px,100%);padding:38px;border:1px solid var(--line-strong);border-top:5px solid var(--ink);background:var(--paper-2);box-shadow:var(--shadow);position:relative}
    .login-card h2{margin:10px 0 12px;font:700 36px/1.15 var(--serif);letter-spacing:-.02em}
    .login-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.75}
    .login-card label{display:block;margin:25px 0 8px;color:var(--muted);font:600 9px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
    .login-card input{width:100%;padding:13px;border:1px solid var(--line-strong);border-radius:2px;background:var(--paper);color:var(--ink);outline:none}
    .login-card input:focus{border-color:var(--accent)}
    .login-card .btn{width:100%;margin-top:12px}
    .login-error{min-height:17px;color:var(--danger);font-size:10px;margin-top:9px}
    .login-theme{position:absolute;top:22px;right:22px}
    .login-language{position:absolute;top:22px;left:22px}
    @media(max-width:1180px) and (min-width:761px){
      .header-inner{width:min(100%,calc(100% - 32px));gap:10px}
      .brand{min-width:220px}
      .nav{gap:0}
      .nav button{padding-left:7px;padding-right:7px}
      .header-tools{gap:5px}
      .online{font-size:9px}
      .time-chip{padding-left:8px;padding-right:8px}
    }
    @keyframes reveal{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.modal-layer,.control-drawer,.drawer-grid .editorial-panel,.event,.toast,.btn,.drawer-close{animation:none!important;transition-duration:.01ms!important}}
    @media(max-width:760px){
      .site-header{position:sticky}
      .header-inner{width:min(100%,calc(100% - 28px));min-height:auto;padding:14px 0 10px;display:grid;grid-template-columns:1fr;gap:10px}
      .brand{min-width:0}
      .nav{display:none}
      .header-tools{width:100%;display:grid;grid-template-columns:1fr auto auto;gap:8px;white-space:normal}
      .online{grid-column:1;align-self:center}
      .control-trigger{grid-column:2 / 4;margin-left:0;justify-self:end}
      .language-switcher{grid-column:2;justify-self:end}
      .theme-switcher{grid-column:3;justify-self:end}
      .page{width:min(100%,calc(100% - 28px));padding:26px 0 110px}
      .hero{grid-template-columns:1fr;gap:26px;padding-bottom:34px}
      .hero h1{font-size:clamp(38px,12vw,58px)}
      .ledger{overflow:visible;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      .stat,.stat:first-child{min-width:0;padding:18px 12px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
      .stat:nth-child(2n){border-right:0}
      .stat:nth-last-child(-n+2){border-bottom:0}
      .stat-value{font-size:29px}
      .content-grid{grid-template-columns:1fr;padding-top:34px}
      .section-title{font-size:34px}
      .section-sub{font-size:10px}
      .event-toolbar{justify-content:flex-start;overflow-x:auto;padding:4px 0 10px;scrollbar-width:none}
      .event-toolbar::-webkit-scrollbar{display:none}
      .event-toolbar>*{flex:0 0 auto}
      .event{grid-template-columns:1fr;gap:12px;padding:20px 0}
      .event-date{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:8px;padding-left:10px}
      .event-date small,.event-date strong,.event-date span{display:block;margin:0}
      .event-date span{text-align:right}
      .event-top{display:flex}
      .metrics{grid-template-columns:repeat(3,1fr)}
      .metric,.metric:first-child{padding:10px 8px;border-right:1px solid var(--line);border-bottom:0}
      .metric:last-child{border-right:0}
      .calendar-day{min-height:76px;padding:3px}
      .calendar-date-number{margin-bottom:4px;font-size:8px}
      .calendar-event-name{padding:3px;font-size:7px}
      .footer{flex-direction:column;align-items:flex-start;gap:10px;margin-top:48px}
      .mobile-dock{position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:55;display:grid;grid-template-columns:repeat(4,1fr);padding:6px;border:1px solid var(--line-strong);border-radius:16px;background:color-mix(in srgb,var(--paper-2) 94%,transparent);box-shadow:0 16px 45px rgba(0,0,0,.2);backdrop-filter:blur(18px)}
      .mobile-dock button{min-height:44px;border:0;border-radius:11px;background:transparent;color:var(--muted);font:700 10px/1 var(--sans)}
      .mobile-dock button.active,.mobile-dock button:active{background:var(--accent-soft);color:var(--accent)}
      .event-tooltip{position:fixed;left:16px;right:16px;top:auto;bottom:calc(82px + env(safe-area-inset-bottom));width:auto;max-width:none}
      .toast{left:16px;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));max-width:none}
      .control-drawer{width:100%;padding:24px 20px 110px;border-left:0}.drawer-head{top:-24px;margin:-24px 0 24px;padding-top:24px}.drawer-grid{grid-template-columns:1fr}.drawer-grid .wide{grid-column:auto}.health-grid,.derived-grid{grid-template-columns:1fr}.history-values{gap:7px}.record-item{grid-template-columns:78px minmax(0,1fr)}.record-state{grid-column:2}.time-chip{display:none}
      .login-theme{top:14px;right:14px}
      .login-language{top:14px;left:14px}
    }
  </style>
</head>
<body>
  <div id="login" class="login-backdrop">
    <div class="login-language language-switcher" aria-label="語言"><button type="button" data-language="zh-Hant">繁中</button><button type="button" data-language="en">EN</button></div>
    <form id="login-form" class="login-card">
      <div class="login-theme theme-switcher" data-theme-switcher aria-label="顯示模式">
        <button type="button" data-theme-choice="light" aria-label="白天模式" title="白天模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/></svg></button>
        <button type="button" data-theme-choice="dark" aria-label="黑夜模式" title="黑夜模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 15.2A8.3 8.3 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/></svg></button>
        <button type="button" data-theme-choice="system" aria-label="跟隨裝置" title="跟隨裝置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8m-4-4v4"/></svg></button>
      </div>
      <div class="brand"><div class="brand-icon">${APP_ICON_SVG}</div><div class="brand-copy"><strong>MACRO PULSE</strong><small>Economic Intelligence</small></div></div>
      <div class="section-kicker">Secure Console / 00</div>
      <h2>進入經濟事件控制台</h2>
      <p>輸入一次 ADMIN_TOKEN 以建立加密的短期登入工作階段；Token 不會保存在瀏覽器儲存空間。</p>
      <label for="token">管理員 Token</label>
      <input id="token" type="password" autocomplete="current-password" placeholder="輸入 ADMIN_TOKEN">
      <div id="login-error" class="login-error"></div>
      <button id="login-submit" class="btn primary" type="submit">驗證並進入</button>
    </form>
  </div>
  <div id="app" class="app-shell hidden">
    <header class="site-header">
      <div class="header-inner">
        <div class="brand"><div class="brand-icon">${APP_ICON_SVG}</div><div class="brand-copy"><strong>MACRO PULSE</strong><small>U.S. Economic Events</small></div></div>
        <nav class="nav" aria-label="主要導覽"><button class="active" data-scroll="overview">總覽</button><button data-scroll="events-section">事件日曆</button><button type="button" data-open-control>控制中心</button></nav>
        <div class="header-tools"><div class="online"><span class="dot" id="worker-dot"></span><span id="worker-state">WORKER ONLINE</span></div><button type="button" class="control-trigger" data-open-control>CONTROL CENTER</button><div class="language-switcher" aria-label="語言"><button type="button" data-language="zh-Hant">繁中</button><button type="button" data-language="en">EN</button></div><div class="theme-switcher" data-theme-switcher aria-label="顯示模式"><button type="button" data-theme-choice="light" aria-label="白天模式" title="白天模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/></svg></button><button type="button" data-theme-choice="dark" aria-label="黑夜模式" title="黑夜模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 15.2A8.3 8.3 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/></svg></button><button type="button" data-theme-choice="system" aria-label="跟隨裝置" title="跟隨裝置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8m-4-4v4"/></svg></button></div><div class="time-chip" id="clock">—</div></div>
      </div>
    </header>
    <main class="page" id="overview">
      <section class="hero">
        <div>
          <div class="section-kicker">Daily Macro Brief / 01</div>
          <h1>美國經濟事件<span>Economic Intelligence Desk</span></h1>
          <p class="hero-intro">追蹤七個官方來源的經濟數據與央行事件；支援的量化事件會在發布後自動回填 Actual / Prior。清單與月曆可切換，並可手動更新官方數值。</p>
          <div class="hero-actions">
            <button class="btn primary" data-action="sync"><span class="button-icon">↻</span>立即同步事件</button>
            <button class="btn" data-action="refresh-values"><span class="button-icon">⟲</span>更新官方數值</button>
            <button class="btn" data-action="refresh"><span class="button-icon">↺</span>重新整理</button>
          </div>
        </div>
        <aside class="hero-focus">
          <div class="focus-label"><span>Next Release</span><span id="clock-mini">—</span></div>
          <div class="focus-name" id="next-event">等待事件資料</div>
          <div class="focus-time"><strong id="next-countdown">—</strong><span id="sync-status">尚未同步</span></div>
        </aside>
      </section>
      <section class="ledger" aria-label="事件摘要">
        <div class="stat"><div class="stat-label">Upcoming / 30 Days</div><div class="stat-value" id="stat-events">—</div><div class="stat-note">未來 30 天事件</div></div>
        <div class="stat"><div class="stat-label">High Impact</div><div class="stat-value" id="stat-high">—</div><div class="stat-note">優先提醒項目</div></div>
        <div class="stat"><div class="stat-label">Official Sources</div><div class="stat-value" id="stat-providers">—</div><div class="stat-note">啟用資料來源</div></div>
        <div class="stat"><div class="stat-label">Pending Alerts</div><div class="stat-value" id="stat-pending">—</div><div class="stat-note">等待排程發送</div></div>
      </section>
      <div class="content-grid">
        <section id="events-section">
          <div class="section-head">
            <div>
              <div class="section-number">§ 02 · EVENT CALENDAR</div>
              <h2 class="section-title">近期事件日曆</h2>
              <p class="section-sub">包含過去 24 小時與未來 30 天。可切換清單或月曆模式，並依影響程度、分類與官方來源篩選。</p>
            </div>
            <div class="event-toolbar">
              <div class="view-switch" aria-label="閱覽模式"><button class="filter-btn active" data-view="list">清單</button><button class="filter-btn" data-view="calendar">月曆</button></div>
              <button class="filter-btn active" data-filter-impact="all">全部</button><button class="filter-btn" data-filter-impact="high">High</button><button class="filter-btn" data-filter-impact="medium">Medium</button>
              <select class="control" id="filter-category"><option value="all">所有分類</option><option value="inflation">通膨</option><option value="employment">就業</option><option value="growth">成長</option><option value="monetary_policy">貨幣政策</option><option value="housing">房市</option><option value="consumer">消費</option><option value="manufacturing">製造</option><option value="services">服務</option><option value="energy">能源</option><option value="trade">貿易</option></select>
              <select class="control" id="filter-provider"><option value="all">所有來源</option></select>
              <a class="filter-btn filter-link" href="/api/events.ics" download>匯出 .ics</a>
            </div>
          </div>
          <div id="events" class="events"><div class="empty">正在載入事件資料…</div></div>
        </section>
        <aside class="side-column">
          <section class="editorial-panel">
            <div class="panel-head"><div><h2 class="panel-title">系統脈動</h2><p class="panel-sub">排程、資料來源與通知頻道的即時摘要。</p></div><span class="panel-code">§ 03</span></div>
            <div id="health-preview" class="health-grid"><div class="health-card"><strong>等待健康資料</strong><span>完成登入後自動檢查</span></div></div>
            <div class="hero-actions"><button type="button" class="btn primary" data-open-control>開啟控制中心</button></div>
          </section>
          <section class="editorial-panel">
            <div class="panel-head"><div><h2 class="panel-title">資料原則</h2><p class="panel-sub">Actual 與 Prior 只採官方發布值；Forecast 沒有可信來源時保持未提供。</p></div><span class="panel-code">OFFICIAL</span></div>
            <div class="notice">事件若已公布但官方值尚未同步，會顯示等待官方資料或來源異常，不再用空白破折號掩蓋狀態。</div>
          </section>
        </aside>
      </div>
      <footer class="footer"><span>© 2026 MACRO PULSE · U.S. ECONOMIC EVENTS</span><span id="last-refresh">尚未載入</span><button class="logout" id="logout">LOG OUT ↗</button></footer>
    </main>
    <nav class="mobile-dock" aria-label="行動版功能列"><button data-scroll="overview">總覽</button><button data-scroll="events-section">日曆</button><button data-open-control>控制</button><button data-action="refresh">更新</button></nav>
  </div>
  <div id="control-center" class="modal-layer" aria-hidden="true">
    <section class="control-drawer" role="dialog" aria-modal="true" aria-labelledby="control-center-title" tabindex="-1">
      <header class="drawer-head"><div><div class="section-kicker">Operations / Settings</div><h2 id="control-center-title">控制中心</h2><p>同步、通知、資料來源與健康狀態集中管理；關閉後回到事件閱讀畫面。</p></div><button type="button" class="drawer-close" data-close-control aria-label="關閉視窗">×</button></header>
      <div class="drawer-grid">
        <section class="editorial-panel">
          <div class="panel-head"><div><h3 class="panel-title">同步操作</h3><p class="panel-sub">重新抓取排程、官方數值或畫面資料。</p></div><span class="panel-code">01</span></div>
          <div class="hero-actions"><button class="btn primary" data-action="sync">立即同步事件</button><button class="btn" data-action="refresh-values">更新官方數值</button><button class="btn" data-action="refresh">重新整理</button><button class="btn hidden" id="install-app">安裝網頁 App</button><a class="btn filter-link" href="/api/events" target="_blank" rel="noopener noreferrer">開啟資料 API</a></div>
        </section>
        <section class="editorial-panel">
          <div class="panel-head"><div><h3 class="panel-title">排程健康</h3><p class="panel-sub">顯示最近成功時間、錯誤與逾時狀態。</p></div><span class="panel-code">02</span></div>
          <div id="scheduled-tasks" class="health-grid"></div>
        </section>
        <section class="editorial-panel wide" id="settings-section">
          <div class="panel-head"><div><h3 class="panel-title">通知與資料設定</h3><p class="panel-sub">提醒時間於下一次事件同步套用；其他設定立即生效。</p></div><span class="panel-code">03</span></div>
          <div class="setting-list">
            <div class="setting-row"><div><div class="setting-title">啟用通知</div><div class="setting-help">控制所有已設定頻道的事件提醒。</div></div><button class="toggle" id="notificationsEnabled" data-toggle="notificationsEnabled" aria-label="切換通知"></button></div>
            <div class="setting-row"><div><div class="setting-title">最低通知影響程度</div><div class="setting-help">High 只通知高影響事件。</div></div><select class="control" id="eventImpactFilter"><option value="high">High</option><option value="medium">Medium+</option><option value="low">全部</option></select></div>
            <div class="setting-row"><div><div class="setting-title">提醒時間</div><div class="setting-help">事件發布前多久提醒。</div></div><div class="reminders" id="reminders"><label class="reminder-choice"><input type="checkbox" value="60"><span>60m</span></label><label class="reminder-choice"><input type="checkbox" value="30"><span>30m</span></label><label class="reminder-choice"><input type="checkbox" value="15"><span>15m</span></label><label class="reminder-choice"><input type="checkbox" value="5"><span>5m</span></label></div></div>
            <div class="setting-row"><div><div class="setting-title">同步未來天數</div><div class="setting-help">官方來源同步的預覽範圍。</div></div><input class="control number-control" id="syncDaysAhead" type="number" min="1" max="365"></div>
            <div class="setting-row"><div><div class="setting-title">儲存中影響事件</div><div class="setting-help">是否保留 Medium 事件。</div></div><button class="toggle" id="storeMediumEvents" data-toggle="storeMediumEvents" aria-label="切換中影響事件"></button></div>
            <div class="setting-row"><div><div class="setting-title">每日摘要</div><div class="setting-help">每天在指定時間整理未來重要事件。</div></div><button class="toggle" id="digestEnabled" aria-label="切換每日摘要"></button></div>
            <div class="setting-row"><div><div class="setting-title">安靜時段</div><div class="setting-help">此區間不發送即時提醒。</div></div><div class="compact-fields"><div class="compact-field"><label for="quietHoursStart">開始</label><input class="control" id="quietHoursStart" type="time"></div><div class="compact-field"><label for="quietHoursEnd">結束</label><input class="control" id="quietHoursEnd" type="time"></div><div class="compact-field"><label for="digestTime">摘要時間</label><input class="control" id="digestTime" type="time"></div></div></div>
          </div>
          <div class="save-row"><button class="btn primary" id="save-settings">保存設定</button></div>
        </section>
        <section class="editorial-panel" id="providers-section">
          <div class="panel-head"><div><h3 class="panel-title">官方資料來源</h3><p class="panel-sub">個別控制七個事件來源。</p></div><span class="panel-code">04</span></div>
          <div id="providers" class="provider-list"></div>
        </section>
        <section class="editorial-panel">
          <div class="panel-head"><div><h3 class="panel-title">通知頻道</h3><p class="panel-sub">只有已設定憑證的頻道可以啟用與測試。</p></div><span class="panel-code">05</span></div>
          <div id="notification-channels" class="channel-list"></div>
        </section>
        <section class="editorial-panel wide">
          <div class="panel-head"><div><h3 class="panel-title">儲存檢視</h3><p class="panel-sub">保存目前影響程度、分類、來源與清單／月曆模式。</p></div><span class="panel-code">06</span></div>
          <div class="compact-fields"><div class="compact-field"><label for="saved-filter-list">已儲存檢視</label><select class="control" id="saved-filter-list"><option value="">選擇已儲存檢視</option></select></div><div class="compact-field"><label for="saved-filter-name">新檢視名稱</label><input class="control" id="saved-filter-name" maxlength="80" placeholder="例如：高影響能源事件"></div></div>
          <div class="save-row"><button class="btn" id="delete-filter">刪除檢視</button><button class="btn primary" id="save-filter">儲存目前檢視</button></div>
        </section>
        <section class="editorial-panel wide">
          <div class="panel-head"><div><h3 class="panel-title">系統紀錄</h3><p class="panel-sub">按需載入管理操作與官方來源解析快照，不佔用主畫面。</p></div><span class="panel-code">07</span></div>
          <div class="record-actions"><button type="button" class="btn" data-record-view="audit">載入稽核紀錄</button><button type="button" class="btn" data-record-view="sources">載入來源快照</button></div>
          <div id="system-records" class="notice">選擇要查看的紀錄。</div>
        </section>
      </div>
    </section>
  </div>
  <div id="event-detail" class="modal-layer event-detail-layer" aria-hidden="true">
    <section class="control-drawer event-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="event-detail-title" tabindex="-1">
      <header class="drawer-head"><div><div class="section-kicker">Official Release Record</div><h2 id="event-detail-title">事件詳情</h2><p id="event-detail-subtitle">載入官方資料中…</p></div><button type="button" class="drawer-close" data-close-detail aria-label="關閉視窗">×</button></header>
      <div id="event-detail-content"></div>
    </section>
  </div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script>
    (function(){
      var themeKey='macro-pulse-theme',languageKey='macro-pulse-language',offlineKey='macro-pulse-offline-overview',state={data:null,impact:'all',category:'all',provider:'all',view:'list',language:document.documentElement.lang==='en'?'en':'zh-Hant',calendarCursor:new Date(Date.UTC(new Date().getFullYear(),new Date().getMonth(),1)),selectedEventId:null,refreshTimer:null,lastFocus:null,activeModal:null,installPrompt:null,preferencesApplied:false};
      var $=function(id){return document.getElementById(id)};
      var i18n={'管理員驗證':'Administrator Access','進入經濟事件控制台':'Open Economic Event Console','輸入 Worker 的 ADMIN_TOKEN。憑證只會保留在目前分頁，關閉分頁後即自動清除。':'Enter the Worker ADMIN_TOKEN. The credential remains only in this tab and is cleared when the tab closes.','管理員 Token':'Admin Token','輸入 ADMIN_TOKEN':'Enter ADMIN_TOKEN','驗證並進入':'Verify and continue','主要導覽':'Main navigation','總覽':'Overview','事件日曆':'Events','控制中心':'Control Center','通知設定':'Notifications','資料來源':'Sources','語言':'Language','顯示模式':'Display mode','白天模式':'Light mode','黑夜模式':'Dark mode','跟隨裝置':'Follow device','美國經濟事件':'U.S. Economic Events','追蹤七個官方來源的經濟數據與央行事件；BLS 與 University of Michigan 在發布後自動同步 Actual / Prior。公布窗口每 5 秒更新，其餘時間每分鐘更新。':'Track economic releases and central-bank events from seven official sources. BLS and University of Michigan Actual / Prior values sync automatically after release. Updates run every 5 seconds around release time and every minute otherwise.','等待事件資料':'Waiting for event data','尚未同步':'Not synced yet','未來 30 天事件':'Events in the next 30 days','優先提醒項目':'Priority alerts','啟用資料來源':'Enabled sources','等待排程發送':'Awaiting delivery','事件摘要':'Event summary','近期事件日曆':'Upcoming Events','包含過去 24 小時與未來 30 天。可切換清單或月曆模式，並依影響程度、分類與官方來源篩選。':'Includes the past 24 hours and next 30 days. Switch between list and calendar views, then filter by impact, category or official source.','閱覽模式':'View mode','清單':'List','月曆':'Calendar','全部':'All','所有分類':'All categories','通膨':'Inflation','就業':'Employment','成長':'Growth','貨幣政策':'Monetary policy','房市':'Housing','消費':'Consumer','製造':'Manufacturing','服務':'Services','能源':'Energy','貿易':'Trade','所有來源':'All sources','正在載入事件資料…':'Loading events…','控制面板':'Control panel','關閉視窗':'Close dialog','手動同步事件排程、官方數值或重新載入頁面資料。':'Manually sync event schedules, refresh official values or reload dashboard data.','立即同步事件':'Sync events now','更新官方數值':'Refresh official values','重新整理':'Refresh','更新':'Refresh','儲存後下一次排程立即套用。':'Changes apply to the next scheduled run.','Discord 通知':'Discord notifications','控制提醒與來源健康警告。':'Controls event alerts and source health warnings.','切換 Discord 通知':'Toggle Discord notifications','最低通知影響程度':'Minimum alert impact','High 只通知高影響事件。':'High sends alerts only for high-impact events.','提醒時間':'Reminder times','事件發布前多久提醒。':'Time before release to send alerts.','同步未來天數':'Days to sync ahead','官方來源同步的預覽範圍。':'The future window fetched from official sources.','儲存中影響事件':'Store medium-impact events','是否保留 Medium 事件。':'Whether to retain Medium-impact events.','切換中影響事件':'Toggle medium-impact events','測試 Discord':'Test Discord','保存設定':'Save settings','官方資料來源':'Official Sources','個別控制七個經濟事件來源。':'Control each of the seven official economic-event sources.','BLS 與 Michigan 的 Actual / Prior 會在官方發布後自動寫入並發送結果 webhook。Forecast 屬市場共識，官方通常不提供；缺少 Forecast 時不判斷利多或利空。演說、聽證等非量化事件顯示「不適用」。':'BLS and Michigan Actual / Prior values are saved after official release and included in result webhooks. Forecast is a market consensus value that official sources usually do not provide; no directional signal is assigned without it. Speeches and other qualitative events show Not applicable.','尚未載入':'Not loaded','行動版功能列':'Mobile action bar','日曆':'Events','控制':'Controls','通知':'Alerts','來源':'Sources','Token 無效或已過期':'The token is invalid or expired','請求失敗':'Request failed','不適用':'Not applicable','經濟事件':'Economic event','官方排程事件。':'An event listed on an official schedule.','目前沒有足夠資料判斷市場方向。':'There is not enough information to assess market direction.','最近同步正常':'Last sync succeeded','啟用':'Enabled','停用':'Disabled','目前沒有符合條件的事件':'No events match these filters','開啟官方資料來源 ↗':'Open official source ↗','上個月':'Previous month','下個月':'Next month','未來 30 天無事件':'No events in the next 30 days','即將公布':'Releasing now','尚未完成同步':'No completed sync','請輸入 ADMIN_TOKEN':'Enter ADMIN_TOKEN','驗證中…':'Verifying…','同步完成，但有來源失敗':'Sync completed, but a source failed','七個來源同步完成':'All seven sources synced','官方尚未發布新的數值':'No new official values have been released','Discord 測試訊息已發送':'Discord test message sent','至少選擇一個提醒時間':'Select at least one reminder time','設定已保存':'Settings saved'};
      i18n['追蹤七個官方來源的經濟數據與央行事件；支援的量化事件會在發布後自動回填 Actual / Prior。清單與月曆可切換，並可手動更新官方數值。']='Track economic releases and central-bank events from seven official sources. Supported quantitative events automatically sync Actual / Prior after release. Switch between list and calendar views, or refresh official values manually.';
      i18n['提醒時間於下一次事件同步套用；其他設定立即生效。']='Reminder times apply at the next event sync; other settings take effect immediately.';
      i18n['BLS、EIA、Census、ISM 與 Michigan 的支援事件會在發布後更新官方 Actual / Prior；Forecast 屬市場共識，官方通常不提供。演說、聽證等非量化事件顯示為不適用。']='Supported BLS, EIA, Census, ISM and Michigan events update official Actual / Prior values after release. Forecast is a market consensus value that official sources usually do not provide. Speeches and other qualitative events show Not applicable.';
      i18n['上次同步']='Last sync';
      Object.assign(i18n,{'系統脈動':'System Pulse','排程、資料來源與通知頻道的即時摘要。':'Live summary of schedules, providers and notification channels.','等待健康資料':'Waiting for health data','完成登入後自動檢查':'Checked automatically after sign-in','開啟控制中心':'Open Control Center','資料原則':'Data Policy','Actual 與 Prior 只採官方發布值；Forecast 沒有可信來源時保持未提供。':'Actual and Prior use official releases only. Forecast remains unavailable without a trusted source.','事件若已公布但官方值尚未同步，會顯示等待官方資料或來源異常，不再用空白破折號掩蓋狀態。':'Released events show a pending or source-error state instead of an unexplained dash.','同步操作':'Sync Operations','重新抓取排程、官方數值或畫面資料。':'Refresh schedules, official values or dashboard data.','排程健康':'Schedule Health','顯示最近成功時間、錯誤與逾時狀態。':'Shows latest success, failures and stale tasks.','通知與資料設定':'Notifications and Data','啟用通知':'Enable notifications','控制所有已設定頻道的事件提醒。':'Controls alerts for every configured channel.','切換通知':'Toggle notifications','通知頻道':'Notification Channels','只有已設定憑證的頻道可以啟用與測試。':'Only channels with configured credentials can be enabled and tested.','事件詳情':'Event Details','載入官方資料中…':'Loading official data…','尚未公布':'Not released','等待官方值':'Waiting for official value','等待前值':'Waiting for prior','未提供':'Not provided','來源異常':'Source error','官方資料':'Official data','已修訂':'Revised','資料待更新':'Pending update','數值歷史':'Value history','尚無數值修訂紀錄':'No value revision history yet','查看完整資料':'View full record','已設定':'Configured','未設定':'Not configured','測試':'Test','通知測試成功':'Notification test succeeded','沒有排程紀錄':'No schedule history','最近完成':'Last completed','執行失敗':'Failed','已逾時':'Stale','運作正常':'Healthy','系統狀態異常':'System degraded','CONTROL CENTER':'CONTROL CENTER'});
      i18n['輸入一次 ADMIN_TOKEN 以建立加密的短期登入工作階段；Token 不會保存在瀏覽器儲存空間。']='Enter ADMIN_TOKEN once to create an encrypted short-lived session. The token is never stored in browser storage.';
      Object.assign(i18n,{'每日摘要':'Daily digest','每天在指定時間整理未來重要事件。':'Summarize upcoming important events at the selected time.','切換每日摘要':'Toggle daily digest','安靜時段':'Quiet hours','此區間不發送即時提醒。':'Instant alerts are suppressed during this interval.','開始':'Start','結束':'End','摘要時間':'Digest','儲存檢視':'Saved Views','保存目前影響程度、分類、來源與清單／月曆模式。':'Save the current impact, category, provider and list or calendar view.','已儲存檢視':'Saved views','新檢視名稱':'New view name','選擇已儲存檢視':'Choose a saved view','例如：高影響能源事件':'For example: High-impact energy','刪除檢視':'Delete view','儲存目前檢視':'Save current view','請輸入檢視名稱':'Enter a view name','檢視已儲存':'View saved','檢視已刪除':'View deleted','加入收藏':'Add favorite','移除收藏':'Remove favorite'});
      Object.assign(i18n,{'同步、通知、資料來源與健康狀態集中管理；關閉後回到事件閱讀畫面。':'Manage sync, notifications, sources and system health in one place. Close the panel to return to events.','個別控制七個事件來源。':'Control each of the seven official event sources.','匯出 .ics':'Export .ics','安裝網頁 App':'Install Web App','開啟資料 API':'Open Data API','系統紀錄':'System Records','按需載入管理操作與官方來源解析快照，不佔用主畫面。':'Load administrative actions and official-source parser snapshots on demand.','載入稽核紀錄':'Load Audit Log','載入來源快照':'Load Source Snapshots','選擇要查看的紀錄。':'Choose a record type to view.','正在載入紀錄…':'Loading records…','目前沒有紀錄':'No records yet','稽核紀錄':'Audit Log','來源快照':'Source Snapshots','驚喜值':'Surprise','驚喜幅度':'Surprise %','較前值變化':'Change from prior','已排程':'Scheduled','已公布':'Released','等待數值':'Value pending','數值可用':'Value available','已改期':'Rescheduled','已取消':'Cancelled','網頁 App 已安裝':'Web App installed','離線模式：顯示最後一次成功載入的資料':'Offline: showing the last successfully loaded data'});
      var tr=function(value){return state.language==='en'?(i18n[value]||value):value};
      var originalText=new WeakMap(),originalAttributes=new WeakMap();
      var translateInterface=function(){var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),node;while((node=walker.nextNode())){var parent=node.parentElement;if(!parent||parent.tagName==='SCRIPT'||parent.tagName==='STYLE')continue;if(!originalText.has(node))originalText.set(node,node.nodeValue||'');var raw=originalText.get(node)||'',trimmed=raw.trim();if(trimmed)node.nodeValue=raw.replace(trimmed,tr(trimmed))}document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(function(element){var originals=originalAttributes.get(element)||{};['aria-label','title','placeholder'].forEach(function(attribute){if(element.hasAttribute(attribute)&&originals[attribute]==null)originals[attribute]=element.getAttribute(attribute)});originalAttributes.set(element,originals);Object.keys(originals).forEach(function(attribute){element.setAttribute(attribute,tr(originals[attribute]))})});document.querySelectorAll('[data-language]').forEach(function(button){button.classList.toggle('active',button.getAttribute('data-language')===state.language);button.setAttribute('aria-pressed',String(button.getAttribute('data-language')===state.language))})};
      var setLanguage=function(language,persist){state.language=language==='en'?'en':'zh-Hant';document.documentElement.lang=state.language;document.title=state.language==='en'?'Macro Pulse | U.S. Economic Events':'Macro Pulse｜美國經濟事件';if(persist)try{localStorage.setItem(languageKey,state.language)}catch(error){}if(state.data)render(state.data);else translateInterface()};
      var esc=function(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]})};
      var systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
      var updateThemeColor=function(){var mode=document.documentElement.getAttribute('data-theme')||'system',dark=mode==='dark'||(mode==='system'&&systemTheme.matches);document.querySelector('meta[name="theme-color"]').setAttribute('content',dark?'#151310':'#e7e5df')};
      var setTheme=function(mode,persist){document.documentElement.setAttribute('data-theme',mode);document.querySelectorAll('[data-theme-choice]').forEach(function(button){button.setAttribute('aria-pressed',String(button.getAttribute('data-theme-choice')===mode))});if(persist)try{localStorage.setItem(themeKey,mode)}catch(error){}updateThemeColor()};
      document.querySelectorAll('[data-theme-choice]').forEach(function(button){button.addEventListener('click',function(){setTheme(button.getAttribute('data-theme-choice')||'system',true)})});
      if(systemTheme.addEventListener)systemTheme.addEventListener('change',updateThemeColor);setTheme(document.documentElement.getAttribute('data-theme')||'system',false);
      var api=async function(path,options){options=options||{};var headers=Object.assign({},options.headers||{});if(options.body&&!headers['content-type'])headers['content-type']='application/json';var response=await fetch(path,Object.assign({credentials:'same-origin'},options,{headers:headers}));if(response.status===401){$('app').classList.add('hidden');$('login').classList.remove('hidden');throw new Error('Token 無效或已過期')}var body=await response.json().catch(function(){return{}});if(!response.ok)throw new Error(body.message||body.error||'請求失敗');return body};
      var showToast=function(message,error){var node=$('toast');node.textContent=message;node.className='toast show'+(error?' error':'');clearTimeout(showToast.timer);showToast.timer=setTimeout(function(){node.className='toast'},3800)};
      var setBusyAction=function(action,busy){document.querySelectorAll('[data-action="'+action+'"]').forEach(function(button){button.disabled=busy})};
      var locale=function(){return state.language==='en'?'en-US':'zh-TW'};
      var formatDate=function(iso,tz){try{return new Intl.DateTimeFormat(locale(),{timeZone:tz||'Asia/Taipei',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso))}catch(error){return iso}};
      var formatShort=function(iso,tz){try{return new Intl.DateTimeFormat(locale(),{timeZone:tz||'Asia/Taipei',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso))}catch(error){return iso}};
      var dateParts=function(iso,tz){try{var values={},parts=new Intl.DateTimeFormat(locale(),{timeZone:tz||'Asia/Taipei',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));parts.forEach(function(item){values[item.type]=item.value});return{date:values.month+'.'+values.day,time:values.hour+':'+values.minute,weekday:values.weekday}}catch(error){return{date:'—',time:'—',weekday:''}}};
      var localDateKey=function(iso,tz){try{var values={};new Intl.DateTimeFormat('en',{timeZone:tz||'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso)).forEach(function(item){values[item.type]=item.value});return values.year+'-'+values.month+'-'+values.day}catch(error){return String(iso).slice(0,10)}};
      var metric=function(value,unit){return value==null||value===''?null:String(value)+(unit?' '+unit:'')};
      var qualitative=function(event){return /(speech|testimony|discussion|press conference|minutes|beige book)/i.test(event.name||'')};
      var eventMetric=function(event,value,kind){if(qualitative(event))return tr('不適用');var formatted=metric(value,event.valueUnit);if(formatted)return formatted;if(kind==='forecast')return tr('未提供');if(event.dataQuality==='source_error')return tr('來源異常');if(kind==='prior')return tr('等待前值');return new Date(event.eventTimeUtc).getTime()>Date.now()?tr('尚未公布'):tr('等待官方值')};
      var qualityLabel=function(event){if(event.lifecycleStatus==='cancelled')return state.language==='en'?'Cancelled':'已取消';if(event.lifecycleStatus==='rescheduled')return state.language==='en'?'Rescheduled':'已改期';if(event.dataQuality==='official')return tr('官方資料');if(event.dataQuality==='revised')return tr('已修訂');if(event.dataQuality==='source_error')return tr('來源異常');return tr('資料待更新')};
      var lifecycleLabel=function(value){return tr({scheduled:'已排程',released:'已公布',value_pending:'等待數值',value_available:'數值可用',revised:'已修訂',rescheduled:'已改期',cancelled:'已取消',source_error:'來源異常'}[value]||value||'已排程')};
      var signedMetric=function(value,suffix){if(value==null||!Number.isFinite(Number(value)))return null;var number=Number(value),formatted=new Intl.NumberFormat(locale(),{maximumFractionDigits:3}).format(number);return(number>0?'+':'')+formatted+(suffix?' '+suffix:'')};
      var derivedMetricsHtml=function(event){var metrics=event.derivedMetrics||{},items=[{label:tr('驚喜值'),value:signedMetric(metrics.surprise,event.valueUnit)},{label:tr('驚喜幅度'),value:signedMetric(metrics.surprisePercent,'%')},{label:tr('較前值變化'),value:signedMetric(metrics.changeFromPrior,event.valueUnit)}].filter(function(item){return item.value!=null});if(!items.length)return'';return'<div class="derived-grid">'+items.map(function(item){return'<div class="derived-card"><small>'+esc(item.label)+'</small><strong>'+esc(item.value)+'</strong></div>'}).join('')+'</div>'};
      var favoriteHtml=function(event){var favorite=((state.data&&state.data.favorites)||[]).indexOf(event.id)>=0,label=favorite?tr('移除收藏'):tr('加入收藏');return'<button type="button" class="favorite-btn '+(favorite?'active':'')+'" data-favorite="'+esc(event.id)+'" aria-label="'+esc(label)+'" aria-pressed="'+String(favorite)+'">'+(favorite?'★':'☆')+'</button>'};
      var infoHtml=function(event){var info=event.eventExplanation||{chineseName:'經濟事件',definition:'官方排程事件。',marketImpact:'目前沒有足夠資料判斷市場方向。',englishName:'Economic event',definitionEn:'An event listed on an official schedule.',marketImpactEn:'There is not enough information to assess market direction.'},name=state.language==='en'?(info.englishName||event.name):(info.chineseName||event.name),definition=state.language==='en'?(info.definitionEn||info.definition):(info.definition||''),impact=state.language==='en'?(info.marketImpactEn||info.marketImpact):(info.marketImpact||''),label=state.language==='en'?'View '+name+' explanation':'查看 '+name+' 說明';return'<button type="button" class="event-info" aria-label="'+esc(label)+'"><span aria-hidden="true">!</span><span class="event-tooltip" role="tooltip"><strong>'+esc(name)+'</strong><span>'+esc(definition)+'</span><em>'+esc(impact)+'</em></span></button>'};
      var providerLabel={bls:'BLS',bea:'BEA',federal_reserve:'Federal Reserve',eia:'EIA',census:'U.S. Census',ism:'ISM PMI',umich:'University of Michigan'};
      var categoryLabels={zh:{inflation:'通膨',employment:'就業',growth:'成長',monetary_policy:'貨幣政策',housing:'房市',consumer:'消費',manufacturing:'製造',services:'服務',energy:'能源',trade:'貿易',other:'其他'},en:{inflation:'Inflation',employment:'Employment',growth:'Growth',monetary_policy:'Monetary policy',housing:'Housing',consumer:'Consumer',manufacturing:'Manufacturing',services:'Services',energy:'Energy',trade:'Trade',other:'Other'}};
      var categoryName=function(category){return(state.language==='en'?categoryLabels.en:categoryLabels.zh)[category]||category||''};
      var setToggle=function(id,on){$(id).classList.toggle('on',Boolean(on));$(id).setAttribute('aria-pressed',String(Boolean(on)))};
      var renderSettings=function(settings){$('eventImpactFilter').value=settings.eventImpactFilter||'high';$('syncDaysAhead').value=settings.syncDaysAhead||45;setToggle('notificationsEnabled',settings.notificationsEnabled);setToggle('storeMediumEvents',settings.storeMediumEvents);document.querySelectorAll('#reminders input').forEach(function(input){input.checked=(settings.reminderMinutes||[]).indexOf(Number(input.value))>=0})};
      var renderPreferences=function(preferences){preferences=preferences||{};setToggle('digestEnabled',preferences.digestEnabled);$('quietHoursStart').value=preferences.quietHoursStart||'';$('quietHoursEnd').value=preferences.quietHoursEnd||'';$('digestTime').value=preferences.digestTime||'08:00'};
      var currentPreferences=function(){return{language:state.language,theme:document.documentElement.getAttribute('data-theme')||'system',quietHoursStart:$('quietHoursStart').value||null,quietHoursEnd:$('quietHoursEnd').value||null,digestEnabled:$('digestEnabled').classList.contains('on'),digestTime:$('digestTime').value||'08:00'}};
      var renderSavedFilters=function(data){var filters=data.savedFilters||[],select=$('saved-filter-list'),current=select.value;select.innerHTML='<option value="">'+esc(tr('選擇已儲存檢視'))+'</option>'+filters.map(function(item){return'<option value="'+esc(item.id)+'">'+esc(item.name)+'</option>'}).join('');if(filters.some(function(item){return item.id===current}))select.value=current};
      var currentSettings=function(){return{notificationsEnabled:$('notificationsEnabled').classList.contains('on'),storeMediumEvents:$('storeMediumEvents').classList.contains('on'),eventImpactFilter:$('eventImpactFilter').value,syncDaysAhead:Number($('syncDaysAhead').value),reminderMinutes:Array.from(document.querySelectorAll('#reminders input:checked')).map(function(input){return Number(input.value)}),enabledProviders:(state.data&&state.data.settings&&state.data.settings.enabledProviders)||[],notificationChannels:(state.data&&state.data.settings&&state.data.settings.notificationChannels)||[]}};
      var renderProviderFilter=function(events){var current=state.provider,names=[];events.forEach(function(event){if(names.indexOf(event.provider)<0)names.push(event.provider)});if(current!=='all'&&names.indexOf(current)<0){current='all';state.provider='all'}$('filter-provider').innerHTML='<option value="all">'+esc(tr('所有來源'))+'</option>'+names.sort().map(function(name){return'<option value="'+esc(name)+'">'+esc(providerLabel[name]||name)+'</option>'}).join('');$('filter-provider').value=current};
      var renderProviders=function(data){var settings=data.settings||{},health={};(data.providers||[]).forEach(function(item){health[item.provider]=item});$('providers').innerHTML=Object.keys(providerLabel).map(function(name){var row=health[name]||{},fail=Number(row.consecutiveFailures||0),enabled=(settings.enabledProviders||[]).indexOf(name)>=0,stateText=fail?(state.language==='en'?fail+' consecutive failures':'連續失敗 '+fail+' 次'):tr('最近同步正常'),countText=row.lastEventCount!=null?' · '+esc(row.lastEventCount)+(state.language==='en'?' events':' 筆'):'',stateClass=fail>=3?'fail':fail?'warn':'',toggleLabel=(state.language==='en'?'Toggle ':'切換 ')+providerLabel[name];return'<div class="provider"><div class="provider-icon">'+esc(name==='federal_reserve'?'FED':name.toUpperCase().slice(0,3))+'</div><div><div class="provider-name">'+esc(providerLabel[name])+'</div><div class="provider-state">'+esc(stateText)+countText+'</div></div><span class="provider-health '+stateClass+'">'+esc(enabled?tr('啟用'):tr('停用'))+'</span><button class="toggle '+(enabled?'on':'')+'" data-provider="'+name+'" aria-label="'+esc(toggleLabel)+'" aria-pressed="'+String(enabled)+'"></button></div>'}).join('')};
      var filteredEvents=function(data){return(data.events||[]).filter(function(event){return(state.impact==='all'||event.impact===state.impact)&&(state.category==='all'||event.category===state.category)&&(state.provider==='all'||event.provider===state.provider)})};
      var eventMetricsHtml=function(event){var error=event.dataQuality==='source_error'?' error':'';return'<div class="metrics"><div class="metric actual"><small>Actual</small><b class="'+(event.actualValue?'':'metric-state'+error)+'">'+esc(eventMetric(event,event.actualValue,'actual'))+'</b></div><div class="metric"><small>Forecast</small><b class="'+(event.forecastValue?'':'metric-state')+'">'+esc(eventMetric(event,event.forecastValue,'forecast'))+'</b></div><div class="metric"><small>Prior</small><b class="'+(event.previousValue?'':'metric-state'+error)+'">'+esc(eventMetric(event,event.previousValue,'prior'))+'</b></div></div>'};
      var renderListEvents=function(events,tz){$('events').className='events';$('events').innerHTML=events.length?events.map(function(event){var markets='',parts=dateParts(event.eventTimeUtc,tz);try{markets=JSON.parse(event.affectedMarketsJson||'[]').join(' · ')}catch(error){}return'<article class="event" data-event-id="'+esc(event.id)+'"><div class="event-date '+esc(event.impact)+'"><small>'+esc(parts.weekday)+'</small><strong>'+esc(parts.date)+'</strong><span>'+esc(parts.time)+' · '+esc(event.localDisplayTimezone||tz)+'</span></div><div class="event-main"><div class="event-top"><div><div class="event-name-row"><div class="event-name">'+esc(event.name)+'</div>'+infoHtml(event)+'</div><div class="event-meta"><span>'+esc(providerLabel[event.provider]||event.provider||'')+'</span><span>'+esc(categoryName(event.category))+'</span>'+(markets?'<span>'+esc(markets)+'</span>':'')+'</div></div><div><span class="impact-badge '+esc(event.impact)+'">'+esc(event.impact)+'</span><span class="status-pill '+esc(event.dataQuality||'pending')+'">'+esc(qualityLabel(event))+'</span>'+favoriteHtml(event)+'</div></div>'+eventMetricsHtml(event)+(event.description?'<p class="calendar-detail-description" style="margin-top:12px">'+esc(event.description)+'</p>':'')+'<button type="button" class="event-open" data-event-detail="'+esc(event.id)+'">'+esc(tr('查看完整資料'))+' →</button></div></article>'}).join(''):'<div class="empty">'+esc(tr('目前沒有符合條件的事件'))+'</div>'};
      var calendarDetailHtml=function(event,tz){if(!event)return'<article class="calendar-detail"><p class="calendar-detail-description">'+esc(state.language==='en'?'Select an event to view details.':'請點選某個事件查看細節。')+'</p></article>';var markets='';try{markets=JSON.parse(event.affectedMarketsJson||'[]').join(' · ')}catch(error){}return'<article class="calendar-detail"><div class="event-top"><div><div class="event-name-row"><h3>'+esc(event.name)+'</h3>'+infoHtml(event)+'</div><p class="calendar-detail-time">'+esc(formatDate(event.eventTimeUtc,tz))+' · '+esc(event.localDisplayTimezone||tz)+'</p></div><span class="impact-badge '+esc(event.impact)+'">'+esc(event.impact)+'</span></div><div class="detail-status"><span class="status-pill '+esc(event.dataQuality||'pending')+'">'+esc(qualityLabel(event))+'</span></div><div class="event-meta"><span>'+esc(providerLabel[event.provider]||event.provider||'')+'</span><span>'+esc(categoryName(event.category))+'</span>'+(markets?'<span>'+esc(markets)+'</span>':'')+'</div>'+(event.description?'<p class="calendar-detail-description">'+esc(event.description)+'</p>':'')+eventMetricsHtml(event)+'<p class="calendar-detail-description"><a href="'+esc(event.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(tr('開啟官方資料來源 ↗'))+'</a></p><button type="button" class="event-open" data-event-detail="'+esc(event.id)+'">'+esc(tr('查看完整資料'))+' →</button></article>'};
      var renderCalendarEvents=function(events,tz){var year=state.calendarCursor.getUTCFullYear(),month=state.calendarCursor.getUTCMonth(),firstWeekday=new Date(Date.UTC(year,month,1)).getUTCDay(),cells=[],byDate={},weekdays=state.language==='en'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['日','一','二','三','四','五','六'],monthTitle=new Intl.DateTimeFormat(locale(),{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));events.forEach(function(event){var key=localDateKey(event.eventTimeUtc,tz);(byDate[key]||(byDate[key]=[])).push(event)});for(var index=0;index<42;index+=1){var day=index-firstWeekday+1,date=new Date(Date.UTC(year,month,day)),key=date.toISOString().slice(0,10),outside=date.getUTCMonth()!==month,dayEvents=byDate[key]||[],today=key===localDateKey(new Date().toISOString(),tz),selected=dayEvents.some(function(event){return event.id===state.selectedEventId});cells.push('<div class="calendar-day'+(outside?' outside':'')+(today?' today':'')+(selected?' selected':'')+'"><span class="calendar-date-number">'+date.getUTCDate()+'</span>'+dayEvents.map(function(event){return'<button type="button" class="calendar-event-name '+esc(event.impact)+'" data-calendar-event="'+esc(event.id)+'" title="'+esc(event.name)+'">'+esc(event.name)+'</button>'}).join('')+'</div>')}var selectedEvent=events.find(function(event){return event.id===state.selectedEventId})||null;$('events').className='calendar-shell';$('events').innerHTML='<div class="calendar-head"><strong>'+esc(monthTitle)+'</strong><div class="calendar-nav"><button type="button" data-calendar-nav="prev" aria-label="'+esc(tr('上個月'))+'">←</button><button type="button" data-calendar-nav="next" aria-label="'+esc(tr('下個月'))+'">→</button></div></div><div class="calendar-weekdays">'+weekdays.map(function(day){return'<span>'+day+'</span>'}).join('')+'</div><div class="calendar-grid">'+cells.join('')+'</div>'+calendarDetailHtml(selectedEvent,tz)};
      var renderEvents=function(data){var all=data.events||[];renderProviderFilter(all);var events=filteredEvents(data),tz=(data.settings||{}).appTimezone||'Asia/Taipei';if(state.view==='calendar')renderCalendarEvents(events,tz);else renderListEvents(events,tz);document.querySelectorAll('[data-view]').forEach(function(button){button.classList.toggle('active',button.getAttribute('data-view')===state.view)})};
      var channelLabels={discord:'Discord',web_push:'Web Push Gateway',telegram:'Telegram',email:'Email',slack:'Slack',line:'LINE'};
      var renderScheduledTasks=function(data){var tasks=data.scheduledTasks||[],tz=(data.settings||{}).appTimezone||'Asia/Taipei';$('scheduled-tasks').innerHTML=tasks.length?tasks.map(function(task){var bad=task.status==='failed'||task.stale,label=task.stale?tr('已逾時'):task.status==='failed'?tr('執行失敗'):tr('運作正常'),time=task.completedAt?formatShort(task.completedAt,tz):task.startedAt?formatShort(task.startedAt,tz):'—';return'<div class="health-card '+(bad?'fail':'ok')+'"><strong>'+esc(task.taskName)+' · '+esc(label)+'</strong><span>'+esc(tr('最近完成'))+' '+esc(time)+(task.errorMessage?'<br>'+esc(task.errorMessage):'')+'</span></div>'}).join(''):'<div class="health-card warn"><strong>'+esc(tr('沒有排程紀錄'))+'</strong><span>Cron heartbeat pending</span></div>'};
      var renderChannels=function(data){var enabled=(data.settings&&data.settings.notificationChannels)||[],summary=data.deliveryChannelSummary||{};$('notification-channels').innerHTML=(data.notificationChannels||[]).map(function(item){var active=enabled.indexOf(item.channel)>=0,label=channelLabels[item.channel]||item.channel,counts=summary[item.channel]||{},detail=item.configured?(state.language==='en'?(counts.pending||0)+' pending · '+(counts.sent||0)+' sent':'待發 '+(counts.pending||0)+' · 已發 '+(counts.sent||0)):tr('未設定');return'<div class="channel-row"><div><strong>'+esc(label)+'</strong><small>'+esc(detail)+'</small></div><span class="channel-state '+(item.configured?'':'missing')+'">'+esc(item.configured?tr('已設定'):tr('未設定'))+'</span><div><button type="button" class="toggle '+(active?'on':'')+'" data-channel="'+esc(item.channel)+'" aria-pressed="'+String(active)+'" '+(item.configured?'':'disabled')+' aria-label="'+esc(label)+'"></button><button type="button" class="btn" data-test-channel="'+esc(item.channel)+'" '+(item.configured?'':'disabled')+'>'+esc(tr('測試'))+'</button></div></div>'}).join('')};
      var renderHealthPreview=function(data){var tasks=data.scheduledTasks||[],providers=data.providers||[],enabled=(data.settings&&data.settings.enabledProviders)||[],badTasks=tasks.filter(function(item){return item.stale||item.status==='failed'}).length,badProviders=providers.filter(function(item){return enabled.indexOf(item.provider)>=0&&Number(item.consecutiveFailures||0)>=3}).length,configured=(data.notificationChannels||[]).filter(function(item){return item.configured}).length,degraded=badTasks+badProviders>0,issues=state.language==='en'?badTasks+' task issues · '+badProviders+' source issues':'排程異常 '+badTasks+' · 來源異常 '+badProviders,channels=state.language==='en'?configured+' / 6 channels':configured+' / 6 個頻道';$('health-preview').innerHTML='<div class="health-card '+(degraded?'fail':'ok')+'"><strong>'+esc(degraded?tr('系統狀態異常'):tr('運作正常'))+'</strong><span>'+esc(issues)+'</span></div><div class="health-card '+(configured?'ok':'warn')+'"><strong>'+esc(channels)+'</strong><span>'+esc(configured?tr('已設定'):tr('未設定'))+'</span></div>';$('worker-dot').className='dot'+(degraded?' danger':'');$('worker-state').textContent=degraded?'WORKER DEGRADED':'WORKER ONLINE'};
      var renderSystemRecords=function(type,items){var title=type==='audit'?tr('稽核紀錄'):tr('來源快照'),tz=(state.data&&state.data.settings&&state.data.settings.appTimezone)||'Asia/Taipei';if(!items.length){$('system-records').className='notice';$('system-records').textContent=tr('目前沒有紀錄');return}var rows=items.map(function(item){if(type==='audit'){var target=[item.targetType,item.targetId].filter(Boolean).join(' · ')||item.actor||'admin';return'<div class="record-item"><strong>'+esc(item.action)+'</strong><span>'+esc(target)+'<br>'+esc(formatShort(item.createdAt,tz))+'</span><span class="record-state">'+esc(item.actor||'admin')+'</span></div>'}var status=item.parseStatus||'unknown',detail=(item.errorMessage||item.sourceUrl||'').toString();return'<div class="record-item"><strong>'+esc(providerLabel[item.provider]||item.provider)+'</strong><span>'+esc(formatShort(item.fetchedAt,tz))+' · '+esc(item.parserVersion||'')+'<br>'+esc(detail)+'</span><span class="record-state '+esc(status)+'">'+esc(status)+'</span></div>'}).join('');$('system-records').className='';$('system-records').innerHTML='<div class="panel-head"><div><h4 class="panel-title">'+esc(title)+'</h4></div><span class="panel-code">'+items.length+'</span></div><div class="record-list">'+rows+'</div>'};
      var loadSystemRecords=async function(type,button){button.disabled=true;$('system-records').className='notice';$('system-records').textContent=tr('正在載入紀錄…');try{var response=await api(type==='audit'?'/admin/audit?limit=50':'/admin/source-snapshots?limit=50');renderSystemRecords(type,type==='audit'?(response.audit||[]):(response.snapshots||[]))}catch(error){$('system-records').textContent=error.message;showToast(error.message,true)}finally{button.disabled=false}};
      var renderNextEvent=function(events,tz){var now=Date.now(),next=events.filter(function(item){return new Date(item.eventTimeUtc).getTime()>=now}).sort(function(a,b){return new Date(a.eventTimeUtc).getTime()-new Date(b.eventTimeUtc).getTime()})[0];state.nextEvent=next||null;$('next-event').textContent=next?next.name:tr('未來 30 天無事件');$('next-countdown').textContent=next?formatShort(next.eventTimeUtc,tz):'—'};
      var updateCountdown=function(){if(!state.nextEvent){$('next-countdown').textContent='—';return}var diff=new Date(state.nextEvent.eventTimeUtc).getTime()-Date.now();if(diff<=0){$('next-countdown').textContent=tr('即將公布');return}var days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),minutes=Math.floor(diff%3600000/60000);$('next-countdown').textContent=(days?days+'D ':'')+String(hours).padStart(2,'0')+'H '+String(minutes).padStart(2,'0')+'M'};
      var scheduleRefresh=function(){clearTimeout(state.refreshTimer);var now=Date.now(),near=((state.data&&state.data.events)||[]).some(function(event){var release=new Date(event.eventTimeUtc).getTime();return !event.actualValue&&Math.abs(release-now)<=15*60*1000});state.refreshTimer=setTimeout(function(){load().catch(function(){state.refreshTimer=setTimeout(scheduleRefresh,15000)})},near?5000:60000)};
      var render=function(data){state.data=data;var events=data.events||[],now=Date.now(),upcoming=events.filter(function(item){return new Date(item.eventTimeUtc).getTime()>=now}),high=upcoming.filter(function(item){return item.impact==='high'}).length,enabled=(data.settings.enabledProviders||[]).length,summary=data.deliverySummary||{},tz=data.settings.appTimezone||'Asia/Taipei';$('stat-events').textContent=upcoming.length;$('stat-high').textContent=high;$('stat-providers').textContent=enabled+' / 7';$('stat-pending').textContent=summary.pending||0;$('sync-status').textContent=data.lastSuccessfulSync?tr('上次同步')+' '+formatShort(data.lastSuccessfulSync.completedAt,tz):tr('尚未完成同步');$('clock-mini').textContent=new Date().toLocaleString(locale(),{timeZone:tz,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});$('last-refresh').textContent='LAST REFRESH · '+new Date().toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'});renderNextEvent(events,tz);renderSettings(data.settings);renderPreferences(data.preferences);renderSavedFilters(data);renderProviders(data);renderScheduledTasks(data);renderChannels(data);renderHealthPreview(data);renderEvents(data);translateInterface();scheduleRefresh();updateCountdown()};
      var applyServerPreferences=function(preferences){if(state.preferencesApplied||!preferences)return;state.preferencesApplied=true;try{if(!localStorage.getItem(languageKey)&&(preferences.language==='en'||preferences.language==='zh-Hant')){state.language=preferences.language;document.documentElement.lang=state.language;document.title=state.language==='en'?'Macro Pulse | U.S. Economic Events':'Macro Pulse｜美國經濟事件'}if(!localStorage.getItem(themeKey)&&['light','dark','system'].indexOf(preferences.theme)>=0)setTheme(preferences.theme,false)}catch(error){}};
      var load=async function(){var data,offline=false;try{data=await api('/admin/overview');try{localStorage.setItem(offlineKey,JSON.stringify(data))}catch(error){}}catch(error){if(navigator.onLine!==false)throw error;try{data=JSON.parse(localStorage.getItem(offlineKey)||'null')}catch(parseError){}if(!data)throw error;offline=true}applyServerPreferences(data.preferences);$('login').classList.add('hidden');$('app').classList.remove('hidden');render(data);if(offline){$('worker-dot').className='dot danger';$('worker-state').textContent='OFFLINE CACHE';showToast(tr('離線模式：顯示最後一次成功載入的資料'))}return data};
      var onSync=async function(){setBusyAction('sync',true);try{var result=await api('/admin/sync',{method:'POST',body:JSON.stringify({})}),failed=(result.summaries||[]).filter(function(item){return item.status==='failed'}).length,updated=(result.valueRefresh&&result.valueRefresh.updatedEvents)||0;showToast(failed?tr('同步完成，但有來源失敗'):tr('七個來源同步完成')+(updated?(state.language==='en'?', updated '+updated+' official values':'，並回填 '+updated+' 筆官方值'):''),failed>0);await load()}catch(error){showToast(error.message,true)}finally{setBusyAction('sync',false)}};
      var onRefreshValues=async function(){setBusyAction('refresh-values',true);try{var result=await api('/admin/refresh-values',{method:'POST'}),summary=result.result||{},count=summary.updatedEvents||0,error=summary.errors&&summary.errors[0];showToast(error?(state.language==='en'?'Official value refresh failed: ':'官方數值回填失敗：')+error.message:(count?(state.language==='en'?'Updated '+count+' official values':'已更新 '+count+' 筆官方數值'):tr('官方尚未發布新的數值')),Boolean(error));await load()}catch(error){showToast(error.message,true)}finally{setBusyAction('refresh-values',false)}};
      var focusableSelector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
      var openModal=function(id,trigger){var layer=$(id);if(!layer)return;state.lastFocus=trigger||document.activeElement;state.activeModal=id;layer.classList.add('open');layer.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');requestAnimationFrame(function(){var target=layer.querySelector('.control-drawer');if(target)target.focus()})};
      var closeModal=function(id){var layer=$(id||state.activeModal);if(!layer)return;layer.classList.remove('open');layer.setAttribute('aria-hidden','true');state.activeModal=null;if(!document.querySelector('.modal-layer.open'))document.body.classList.remove('modal-open');if(state.lastFocus&&typeof state.lastFocus.focus==='function')state.lastFocus.focus()};
      var historyHtml=function(history,event){if(!history.length)return'<div class="notice">'+esc(tr('尚無數值修訂紀錄'))+'</div>';return'<div class="history-list">'+history.map(function(item){return'<div class="history-item"><div><div class="history-revision">R'+esc(item.revisionNumber)+(item.isRevision?' · '+esc(tr('已修訂')):'')+'</div><span class="panel-sub">'+esc(formatShort(item.sourceUpdatedAt,event.localDisplayTimezone))+'</span></div><div class="history-values"><div><small>Actual</small><strong>'+esc(eventMetric(event,item.actualValue,'actual'))+'</strong></div><div><small>Forecast</small><strong>'+esc(eventMetric(event,item.forecastValue,'forecast'))+'</strong></div><div><small>Prior</small><strong>'+esc(eventMetric(event,item.previousValue,'prior'))+'</strong></div></div></div>'}).join('')+'</div>'};
      var openEventDetail=async function(id,trigger){var cached=((state.data&&state.data.events)||[]).find(function(item){return item.id===id});if(!cached)return;openModal('event-detail',trigger);$('event-detail-title').textContent=cached.name;$('event-detail-subtitle').textContent=tr('載入官方資料中…');$('event-detail-content').innerHTML='<div class="empty">'+esc(tr('載入官方資料中…'))+'</div>';try{var response=await api('/admin/events/'+encodeURIComponent(id)+'/history'),event=Object.assign({},cached,response.event||{}),source=event.valueSourceUrl||event.sourceUrl;$('event-detail-subtitle').textContent=formatDate(event.eventTimeUtc,event.localDisplayTimezone)+' · '+(providerLabel[event.provider]||event.provider);$('event-detail-content').innerHTML='<div class="detail-status"><span class="status-pill '+esc(event.dataQuality||'pending')+'">'+esc(qualityLabel(event))+'</span><span class="status-pill">'+esc(lifecycleLabel(event.lifecycleStatus))+'</span>'+(event.valueRevision?'<span class="status-pill">R'+esc(event.valueRevision)+'</span>':'')+'</div>'+(event.description?'<p class="calendar-detail-description">'+esc(event.description)+'</p>':'')+eventMetricsHtml(event)+derivedMetricsHtml(event)+'<div class="notice">'+esc(event.releasePeriod||'')+(event.sourceUpdatedAt?' · '+esc(tr('最近完成'))+' '+esc(formatShort(event.sourceUpdatedAt,event.localDisplayTimezone)):'')+'<br><a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">'+esc(tr('開啟官方資料來源 ↗'))+'</a></div><div class="panel-head" style="margin-top:28px"><div><h3 class="panel-title">'+esc(tr('數值歷史'))+'</h3></div><span class="panel-code">'+esc((response.history||[]).length)+'</span></div>'+historyHtml(response.history||[],event)}catch(error){$('event-detail-content').innerHTML='<div class="notice">'+esc(error.message)+'</div>'}};
      $('login-form').addEventListener('submit',function(event){event.preventDefault();var value=$('token').value.trim();if(!value){$('login-error').textContent=tr('請輸入 ADMIN_TOKEN');return}$('login-error').textContent=tr('驗證中…');$('login-submit').disabled=true;fetch('/auth/session',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token:value})}).then(function(response){if(!response.ok)throw new Error(tr('Token 無效或已過期'));$('token').value='';return load()}).catch(function(error){$('login-error').textContent=error.message}).finally(function(){ $('login-submit').disabled=false;})});
      $('logout').addEventListener('click',function(){fetch('/auth/logout',{method:'POST',credentials:'same-origin'}).finally(function(){location.reload()})});
      document.querySelectorAll('[data-action="refresh"]').forEach(function(button){button.addEventListener('click',function(){setBusyAction('refresh',true);load().catch(function(error){showToast(error.message,true)}).finally(function(){setBusyAction('refresh',false)})})});
      document.querySelectorAll('[data-action="sync"]').forEach(function(button){button.addEventListener('click',onSync)});
      document.querySelectorAll('[data-action="refresh-values"]').forEach(function(button){button.addEventListener('click',onRefreshValues)});
      $('save-settings').addEventListener('click',async function(){var settings=currentSettings();if(!settings.reminderMinutes.length){showToast(tr('至少選擇一個提醒時間'),true);return}setBusyAction('save-settings',true);try{var results=await Promise.all([api('/admin/settings',{method:'PUT',body:JSON.stringify(settings)}),api('/admin/preferences',{method:'PUT',body:JSON.stringify(currentPreferences())})]);state.data.settings=results[0].settings;state.data.preferences=results[1].preferences;renderSettings(results[0].settings);renderPreferences(results[1].preferences);showToast(tr('設定已保存'))}catch(error){showToast(error.message,true)}finally{setBusyAction('save-settings',false)}});
      ['notificationsEnabled','storeMediumEvents','digestEnabled'].forEach(function(id){$(id).addEventListener('click',function(){setToggle(id,!$(id).classList.contains('on'))})});
      $('providers').addEventListener('click',function(event){var button=event.target.closest('button[data-provider]');if(!button||!state.data)return;var name=button.getAttribute('data-provider'),enabled=(state.data.settings.enabledProviders||[]).slice(),index=enabled.indexOf(name);if(index>=0)enabled.splice(index,1);else enabled.push(name);state.data.settings.enabledProviders=enabled;renderProviders(state.data)});
      $('notification-channels').addEventListener('click',async function(event){var toggle=event.target.closest('button[data-channel]'),test=event.target.closest('button[data-test-channel]');if(toggle&&state.data){var name=toggle.getAttribute('data-channel'),enabled=(state.data.settings.notificationChannels||[]).slice(),index=enabled.indexOf(name);if(index>=0)enabled.splice(index,1);else enabled.push(name);state.data.settings.notificationChannels=enabled;renderChannels(state.data);return}if(test){test.disabled=true;try{await api('/admin/test-notification',{method:'POST',body:JSON.stringify({channel:test.getAttribute('data-test-channel')})});showToast(tr('通知測試成功'))}catch(error){showToast(error.message,true)}finally{test.disabled=false}}});
      document.querySelectorAll('[data-filter-impact]').forEach(function(button){button.addEventListener('click',function(){state.impact=button.getAttribute('data-filter-impact');document.querySelectorAll('[data-filter-impact]').forEach(function(item){item.classList.toggle('active',item===button)});if(state.data)renderEvents(state.data)})});
      document.querySelectorAll('[data-view]').forEach(function(button){button.addEventListener('click',function(){state.view=button.getAttribute('data-view')||'list';if(state.data)renderEvents(state.data)})});
      $('events').addEventListener('click',function(event){var favorite=event.target.closest('[data-favorite]');if(favorite&&state.data){var id=favorite.getAttribute('data-favorite'),favorites=(state.data.favorites||[]).slice(),index=favorites.indexOf(id),next=index<0;favorite.disabled=true;api('/admin/favorites/'+encodeURIComponent(id),{method:next?'PUT':'DELETE'}).then(function(){if(next)favorites.push(id);else favorites.splice(index,1);state.data.favorites=favorites;renderEvents(state.data)}).catch(function(error){showToast(error.message,true)});return}var detail=event.target.closest('[data-event-detail]');if(detail){openEventDetail(detail.getAttribute('data-event-detail'),detail);return}var target=event.target.closest('[data-calendar-event],[data-calendar-nav]');if(!target||!state.data)return;if(target.hasAttribute('data-calendar-event'))state.selectedEventId=target.getAttribute('data-calendar-event');else{var amount=target.getAttribute('data-calendar-nav')==='next'?1:-1;state.calendarCursor=new Date(Date.UTC(state.calendarCursor.getUTCFullYear(),state.calendarCursor.getUTCMonth()+amount,1));state.selectedEventId=null}renderEvents(state.data)});
      $('save-filter').addEventListener('click',async function(){var name=$('saved-filter-name').value.trim();if(!name){showToast(tr('請輸入檢視名稱'),true);return}this.disabled=true;try{var result=await api('/admin/saved-filters',{method:'POST',body:JSON.stringify({name:name,filter:{impact:state.impact,category:state.category,provider:state.provider,view:state.view}})});state.data.savedFilters=result.savedFilters;$('saved-filter-name').value='';renderSavedFilters(state.data);$('saved-filter-list').value=result.id;showToast(tr('檢視已儲存'))}catch(error){showToast(error.message,true)}finally{this.disabled=false}});
      $('delete-filter').addEventListener('click',async function(){var id=$('saved-filter-list').value;if(!id)return;this.disabled=true;try{await api('/admin/saved-filters/'+encodeURIComponent(id),{method:'DELETE'});state.data.savedFilters=(state.data.savedFilters||[]).filter(function(item){return item.id!==id});renderSavedFilters(state.data);showToast(tr('檢視已刪除'))}catch(error){showToast(error.message,true)}finally{this.disabled=false}});
      $('saved-filter-list').addEventListener('change',function(){var selected=(state.data.savedFilters||[]).find(function(item){return item.id===$('saved-filter-list').value});if(!selected)return;var filter=selected.filter||{};state.impact=filter.impact||'all';state.category=filter.category||'all';state.provider=filter.provider||'all';state.view=filter.view||'list';$('filter-category').value=state.category;document.querySelectorAll('[data-filter-impact]').forEach(function(item){item.classList.toggle('active',item.getAttribute('data-filter-impact')===state.impact)});renderEvents(state.data)});
      document.querySelectorAll('[data-record-view]').forEach(function(button){button.addEventListener('click',function(){loadSystemRecords(button.getAttribute('data-record-view'),button)})});
      document.addEventListener('click',function(event){var button=event.target.closest('.event-info'),open=document.querySelectorAll('.event-info.open');open.forEach(function(item){if(item!==button)item.classList.remove('open')});if(button){event.preventDefault();button.classList.toggle('open')}});
      document.querySelectorAll('[data-language]').forEach(function(button){button.addEventListener('click',function(){setLanguage(button.getAttribute('data-language'),true)})});
      document.querySelectorAll('[data-open-control]').forEach(function(button){button.addEventListener('click',function(){openModal('control-center',button)})});
      document.querySelectorAll('[data-close-control]').forEach(function(button){button.addEventListener('click',function(){closeModal('control-center')})});
      document.querySelectorAll('[data-close-detail]').forEach(function(button){button.addEventListener('click',function(){closeModal('event-detail')})});
      document.querySelectorAll('.modal-layer').forEach(function(layer){layer.addEventListener('mousedown',function(event){if(event.target===layer)closeModal(layer.id)})});
      document.addEventListener('keydown',function(event){if(!state.activeModal)return;var layer=$(state.activeModal);if(event.key==='Escape'){event.preventDefault();closeModal(state.activeModal);return}if(event.key==='Tab'&&layer){var focusable=Array.from(layer.querySelectorAll(focusableSelector));if(!focusable.length)return;var first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
      $('filter-category').addEventListener('change',function(){state.category=this.value;if(state.data)renderEvents(state.data)});$('filter-provider').addEventListener('change',function(){state.provider=this.value;if(state.data)renderEvents(state.data)});
      document.querySelectorAll('[data-scroll]').forEach(function(button){button.addEventListener('click',function(){document.getElementById(button.getAttribute('data-scroll')).scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('[data-scroll]').forEach(function(item){item.classList.toggle('active',item===button)})})});
      setInterval(function(){var tz=(state.data&&state.data.settings&&state.data.settings.appTimezone)||'Asia/Taipei';$('clock').textContent=new Date().toLocaleString(locale(),{timeZone:tz,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});updateCountdown()},1000);
      window.addEventListener('beforeinstallprompt',function(event){event.preventDefault();state.installPrompt=event;$('install-app').classList.remove('hidden')});
      $('install-app').addEventListener('click',async function(){if(!state.installPrompt)return;this.disabled=true;try{await state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;this.classList.add('hidden')}finally{this.disabled=false}});
      window.addEventListener('appinstalled',function(){state.installPrompt=null;$('install-app').classList.add('hidden');showToast(tr('網頁 App 已安裝'))});
      setLanguage(state.language,false);
      if('serviceWorker' in navigator)navigator.serviceWorker.register('/service-worker.js').catch(function(){});
      load().catch(function(error){$('login-error').textContent=error.message});
    })();
  </script>
</body>
</html>`;
