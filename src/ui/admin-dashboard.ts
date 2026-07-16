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
  <meta name="description" content="美國經濟事件、官方數值與 Discord 提醒控制台">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <title>Macro Pulse｜美國經濟事件</title>
  <script>(function(){try{var value=localStorage.getItem('macro-pulse-theme');if(['light','dark','system'].indexOf(value)>=0)document.documentElement.setAttribute('data-theme',value)}catch(error){}})();</script>
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
    .header-inner{width:min(1440px,calc(100% - 64px));margin:auto;min-height:76px;display:flex;align-items:center;gap:22px}
    .brand{display:flex;align-items:center;gap:12px;min-width:260px}
    .brand-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--ink);box-shadow:0 8px 20px rgba(0,0,0,.12)}
    .brand-icon svg{width:24px;height:24px}
    .brand-copy strong{display:block;font:700 13px/1 var(--serif);letter-spacing:.16em}
    .brand-copy small{display:block;margin-top:7px;color:var(--muted);font:600 9px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase}
    .nav{display:flex;align-items:center;gap:4px;margin-right:auto;flex-wrap:wrap}
    .nav button{border:0;background:transparent;color:var(--muted);padding:9px 10px;font-size:12px;letter-spacing:.05em;position:relative}
    .nav button:after{content:"";position:absolute;left:10px;right:10px;bottom:4px;height:1px;background:var(--accent);transform:scaleX(0);transition:transform .2s}
    .nav button:hover,.nav button.active{color:var(--ink)}
    .nav button.active:after{transform:scaleX(1)}
    .header-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .online{display:flex;align-items:center;gap:7px;color:var(--muted);font:600 10px/1 var(--mono);letter-spacing:.06em;white-space:nowrap}
    .dot{width:7px;height:7px;border-radius:50%;background:var(--positive);box-shadow:0 0 0 4px var(--positive-soft)}
    .theme-switcher{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:3px;border:1px solid var(--line);border-radius:999px;background:var(--paper-3)}
    .theme-switcher button{width:30px;height:28px;border:0;border-radius:999px;background:transparent;color:var(--muted);display:grid;place-items:center}
    .theme-switcher button[aria-pressed="true"]{background:var(--paper-2);color:var(--accent);box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .theme-switcher svg{width:14px;height:14px}
    .time-chip{border:1px solid var(--line);background:var(--paper-2);color:var(--ink);border-radius:10px;padding:10px 12px;font-size:12px;white-space:nowrap}
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
    @keyframes reveal{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @media(max-width:760px){
      .site-header{position:sticky}
      .header-inner{width:min(100%,calc(100% - 28px));min-height:auto;padding:14px 0 10px;display:grid;grid-template-columns:1fr;gap:10px}
      .brand{min-width:0}
      .nav{display:none}
      .header-tools{width:100%;justify-content:space-between}
      .page{width:min(100%,calc(100% - 28px));padding:26px 0 110px}
      .hero{grid-template-columns:1fr;gap:26px;padding-bottom:34px}
      .hero h1{font-size:clamp(38px,12vw,58px)}
      .ledger{overflow-x:auto;display:flex;scroll-snap-type:x mandatory}
      .stat{min-width:160px;scroll-snap-align:start;border-bottom:0}
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
      .login-theme{top:14px;right:14px}
    }
  </style>
</head>
<body>
  <div id="login" class="login-backdrop">
    <form id="login-form" class="login-card">
      <div class="login-theme theme-switcher" data-theme-switcher aria-label="顯示模式">
        <button type="button" data-theme-choice="light" aria-label="白天模式" title="白天模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/></svg></button>
        <button type="button" data-theme-choice="dark" aria-label="黑夜模式" title="黑夜模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 15.2A8.3 8.3 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/></svg></button>
        <button type="button" data-theme-choice="system" aria-label="跟隨裝置" title="跟隨裝置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8m-4-4v4"/></svg></button>
      </div>
      <div class="brand"><div class="brand-icon">${APP_ICON_SVG}</div><div class="brand-copy"><strong>MACRO PULSE</strong><small>Economic Intelligence</small></div></div>
      <div class="section-kicker">Secure Console / 00</div>
      <h2>進入經濟事件控制台</h2>
      <p>輸入 Worker 的 ADMIN_TOKEN。憑證只會保留在目前分頁，關閉分頁後即自動清除。</p>
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
        <nav class="nav" aria-label="主要導覽"><button class="active" data-scroll="overview">總覽</button><button data-scroll="events-section">事件日曆</button><button data-scroll="operations-section">控制中心</button><button data-scroll="settings-section">通知設定</button><button data-scroll="providers-section">資料來源</button></nav>
        <div class="header-tools"><div class="online"><span class="dot"></span>WORKER ONLINE</div><div class="theme-switcher" data-theme-switcher aria-label="顯示模式"><button type="button" data-theme-choice="light" aria-label="白天模式" title="白天模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/></svg></button><button type="button" data-theme-choice="dark" aria-label="黑夜模式" title="黑夜模式"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 15.2A8.3 8.3 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/></svg></button><button type="button" data-theme-choice="system" aria-label="跟隨裝置" title="跟隨裝置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8m-4-4v4"/></svg></button></div><div class="time-chip" id="clock">—</div></div>
      </div>
    </header>
    <main class="page" id="overview">
      <section class="hero">
        <div>
          <div class="section-kicker">Daily Macro Brief / 01</div>
          <h1>美國經濟事件<span>Economic Intelligence Desk</span></h1>
          <p class="hero-intro">追蹤七個官方來源的經濟數據與央行事件；EIA、BLS 與 University of Michigan 的官方值可在發布後回填。清單與月曆可切換，並可手動更新官方數值。</p>
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
            </div>
          </div>
          <div id="events" class="events"><div class="empty">正在載入事件資料…</div></div>
        </section>
        <div class="side-column">
          <section class="editorial-panel" id="operations-section">
            <div class="panel-head"><div><h2 class="panel-title">控制中心</h2><p class="panel-sub">手動同步事件排程、更新官方值或重新載入頁面資料。</p></div><span class="panel-code">§ 03</span></div>
            <div class="hero-actions"><button class="btn primary" data-action="sync"><span class="button-icon">↻</span>立即同步事件</button><button class="btn" data-action="refresh-values"><span class="button-icon">⟲</span>更新官方數值</button><button class="btn" data-action="refresh"><span class="button-icon">↺</span>重新整理</button></div>
          </section>
          <section class="editorial-panel" id="settings-section">
            <div class="panel-head"><div><h2 class="panel-title">通知設定</h2><p class="panel-sub">儲存後下一次排程立即套用。</p></div><span class="panel-code">§ 04</span></div>
            <div class="setting-list">
              <div class="setting-row"><div><div class="setting-title">Discord 通知</div><div class="setting-help">控制提醒與來源健康警告。</div></div><button class="toggle" id="notificationsEnabled" data-toggle="notificationsEnabled" aria-label="切換 Discord 通知"></button></div>
              <div class="setting-row"><div><div class="setting-title">最低通知影響程度</div><div class="setting-help">High 只通知高影響事件。</div></div><select class="control" id="eventImpactFilter"><option value="high">High</option><option value="medium">Medium+</option><option value="low">全部</option></select></div>
              <div class="setting-row"><div><div class="setting-title">提醒時間</div><div class="setting-help">事件發布前多久提醒。</div></div><div class="reminders" id="reminders"><label class="reminder-choice"><input type="checkbox" value="60"><span>60m</span></label><label class="reminder-choice"><input type="checkbox" value="30"><span>30m</span></label><label class="reminder-choice"><input type="checkbox" value="15"><span>15m</span></label><label class="reminder-choice"><input type="checkbox" value="5"><span>5m</span></label></div></div>
              <div class="setting-row"><div><div class="setting-title">同步未來天數</div><div class="setting-help">官方來源同步的預覽範圍。</div></div><input class="control number-control" id="syncDaysAhead" type="number" min="1" max="365"></div>
              <div class="setting-row"><div><div class="setting-title">儲存中影響事件</div><div class="setting-help">是否保留 Medium 事件。</div></div><button class="toggle" id="storeMediumEvents" data-toggle="storeMediumEvents" aria-label="切換中影響事件"></button></div>
            </div>
            <div class="save-row"><button class="btn" id="test-discord">測試 Discord</button><button class="btn primary" id="save-settings">保存設定</button></div>
          </section>
          <section class="editorial-panel" id="providers-section">
            <div class="panel-head"><div><h2 class="panel-title">官方資料來源</h2><p class="panel-sub">個別控制七個經濟事件來源。</p></div><span class="panel-code">§ 05</span></div>
            <div id="providers" class="provider-list"></div>
            <div class="notice">EIA、BLS 與 University of Michigan 的官方值可在發布後更新；Forecast 屬市場共識，官方通常不提供。演說、聽證等非量化事件顯示為不適用。</div>
          </section>
        </div>
      </div>
      <footer class="footer"><span>© 2026 MACRO PULSE · U.S. ECONOMIC EVENTS</span><span id="last-refresh">尚未載入</span><button class="logout" id="logout">LOG OUT ↗</button></footer>
    </main>
    <nav class="mobile-dock" aria-label="行動版功能列"><button data-scroll="events-section">日曆</button><button data-scroll="operations-section">控制</button><button data-scroll="settings-section">通知</button><button data-scroll="providers-section">來源</button></nav>
  </div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script>
    (function(){
      var tokenKey='macro-pulse-admin-token',themeKey='macro-pulse-theme',state={data:null,impact:'all',category:'all',provider:'all',view:'list',calendarCursor:new Date(Date.UTC(new Date().getFullYear(),new Date().getMonth(),1)),selectedEventId:null,refreshTimer:null};
      var $=function(id){return document.getElementById(id)};
      var esc=function(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]})};
      var systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
      var updateThemeColor=function(){var mode=document.documentElement.getAttribute('data-theme')||'system',dark=mode==='dark'||(mode==='system'&&systemTheme.matches);document.querySelector('meta[name="theme-color"]').setAttribute('content',dark?'#151310':'#e7e5df')};
      var setTheme=function(mode,persist){document.documentElement.setAttribute('data-theme',mode);document.querySelectorAll('[data-theme-choice]').forEach(function(button){button.setAttribute('aria-pressed',String(button.getAttribute('data-theme-choice')===mode))});if(persist)try{localStorage.setItem(themeKey,mode)}catch(error){}updateThemeColor()};
      document.querySelectorAll('[data-theme-choice]').forEach(function(button){button.addEventListener('click',function(){setTheme(button.getAttribute('data-theme-choice')||'system',true)})});
      if(systemTheme.addEventListener)systemTheme.addEventListener('change',updateThemeColor);setTheme(document.documentElement.getAttribute('data-theme')||'system',false);
      var api=async function(path,options){options=options||{};var headers=Object.assign({'authorization':'Bearer '+(sessionStorage.getItem(tokenKey)||'')},options.headers||{});if(options.body&&!headers['content-type'])headers['content-type']='application/json';var response=await fetch(path,Object.assign({},options,{headers:headers}));if(response.status===401){sessionStorage.removeItem(tokenKey);$('app').classList.add('hidden');$('login').classList.remove('hidden');throw new Error('Token 無效或已過期')}var body=await response.json().catch(function(){return{}});if(!response.ok)throw new Error(body.message||body.error||'請求失敗');return body};
      var showToast=function(message,error){var node=$('toast');node.textContent=message;node.className='toast show'+(error?' error':'');clearTimeout(showToast.timer);showToast.timer=setTimeout(function(){node.className='toast'},3800)};
      var setBusyAction=function(action,busy){document.querySelectorAll('[data-action="'+action+'"]').forEach(function(button){button.disabled=busy})};
      var locale=function(){return 'zh-TW'};
      var formatDate=function(iso,tz){try{return new Intl.DateTimeFormat(locale(),{timeZone:tz||'Asia/Taipei',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso))}catch(error){return iso}};
      var formatShort=function(iso,tz){try{return new Intl.DateTimeFormat(locale(),{timeZone:tz||'Asia/Taipei',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso))}catch(error){return iso}};
      var dateParts=function(iso,tz){try{var values={},parts=new Intl.DateTimeFormat(locale(),{timeZone:tz||'Asia/Taipei',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));parts.forEach(function(item){values[item.type]=item.value});return{date:values.month+'.'+values.day,time:values.hour+':'+values.minute,weekday:values.weekday}}catch(error){return{date:'—',time:'—',weekday:''}}};
      var localDateKey=function(iso,tz){try{var values={};new Intl.DateTimeFormat('en',{timeZone:tz||'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso)).forEach(function(item){values[item.type]=item.value});return values.year+'-'+values.month+'-'+values.day}catch(error){return String(iso).slice(0,10)}};
      var metric=function(value,unit){return value==null||value===''?'—':String(value)+(unit?' '+unit:'')};
      var qualitative=function(event){return /\b(speech|testimony|discussion|press conference|minutes|beige book)\b/i.test(event.name||'')};
      var eventMetric=function(event,value){return qualitative(event)?'不適用':metric(value,event.valueUnit)};
      var infoHtml=function(event){var info=event.eventExplanation||{chineseName:'經濟事件',definition:'官方排程事件。',marketImpact:'目前沒有足夠資料判斷市場方向。'},name=info.chineseName||event.name,label='查看 '+name+' 說明';return'<button type="button" class="event-info" aria-label="'+esc(label)+'"><span aria-hidden="true">!</span><span class="event-tooltip" role="tooltip"><strong>'+esc(name)+'</strong><span>'+esc(info.definition||'')+'</span><em>'+esc(info.marketImpact||'')+'</em></span></button>'};
      var providerLabel={bls:'BLS',bea:'BEA',federal_reserve:'Federal Reserve',eia:'EIA',census:'U.S. Census',ism:'ISM PMI',umich:'University of Michigan'};
      var categoryLabel={inflation:'通膨',employment:'就業',growth:'成長',monetary_policy:'貨幣政策',housing:'房市',consumer:'消費',manufacturing:'製造',services:'服務',energy:'能源',trade:'貿易',other:'其他'};
      var setToggle=function(id,on){$(id).classList.toggle('on',Boolean(on));$(id).setAttribute('aria-pressed',String(Boolean(on)))};
      var renderSettings=function(settings){$('eventImpactFilter').value=settings.eventImpactFilter||'high';$('syncDaysAhead').value=settings.syncDaysAhead||45;setToggle('notificationsEnabled',settings.notificationsEnabled);setToggle('storeMediumEvents',settings.storeMediumEvents);document.querySelectorAll('#reminders input').forEach(function(input){input.checked=(settings.reminderMinutes||[]).indexOf(Number(input.value))>=0})};
      var currentSettings=function(){return{notificationsEnabled:$('notificationsEnabled').classList.contains('on'),storeMediumEvents:$('storeMediumEvents').classList.contains('on'),eventImpactFilter:$('eventImpactFilter').value,syncDaysAhead:Number($('syncDaysAhead').value),reminderMinutes:Array.from(document.querySelectorAll('#reminders input:checked')).map(function(input){return Number(input.value)}),enabledProviders:(state.data&&state.data.settings&&state.data.settings.enabledProviders)||[]}};
      var renderProviderFilter=function(events){var current=$('filter-provider').value,names=[];events.forEach(function(event){if(names.indexOf(event.provider)<0)names.push(event.provider)});$('filter-provider').innerHTML='<option value="all">所有來源</option>'+names.sort().map(function(name){return'<option value="'+esc(name)+'">'+esc(providerLabel[name]||name)+'</option>'}).join('');$('filter-provider').value=names.indexOf(current)>=0?current:'all'};
      var renderProviders=function(data){var settings=data.settings||{},health={};(data.providers||[]).forEach(function(item){health[item.provider]=item});$('providers').innerHTML=Object.keys(providerLabel).map(function(name){var row=health[name]||{},fail=Number(row.consecutiveFailures||0),enabled=(settings.enabledProviders||[]).indexOf(name)>=0,stateText=fail?'連續失敗 '+fail+' 次':'最近同步正常',countText=row.lastEventCount!=null?' · '+esc(row.lastEventCount)+' 筆':'',stateClass=fail>=3?'fail':fail?'warn':'',toggleLabel='切換 '+providerLabel[name];return'<div class="provider"><div class="provider-icon">'+esc(name==='federal_reserve'?'FED':name.toUpperCase().slice(0,3))+'</div><div><div class="provider-name">'+esc(providerLabel[name])+'</div><div class="provider-state">'+esc(stateText)+countText+'</div></div><span class="provider-health '+stateClass+'">'+esc(enabled?'啟用':'停用')+'</span><button class="toggle '+(enabled?'on':'')+'" data-provider="'+name+'" aria-label="'+esc(toggleLabel)+'" aria-pressed="'+String(enabled)+'"></button></div>'}).join('')};
      var filteredEvents=function(data){return(data.events||[]).filter(function(event){return(state.impact==='all'||event.impact===state.impact)&&(state.category==='all'||event.category===state.category)&&(state.provider==='all'||event.provider===state.provider)})};
      var eventMetricsHtml=function(event){return'<div class="metrics"><div class="metric actual"><small>Actual</small><b>'+esc(eventMetric(event,event.actualValue))+'</b></div><div class="metric"><small>Forecast</small><b>'+esc(eventMetric(event,event.forecastValue))+'</b></div><div class="metric"><small>Prior</small><b>'+esc(eventMetric(event,event.previousValue))+'</b></div></div>'};
      var renderListEvents=function(events,tz){$('events').className='events';$('events').innerHTML=events.length?events.map(function(event){var markets='',parts=dateParts(event.eventTimeUtc,tz);try{markets=JSON.parse(event.affectedMarketsJson||'[]').join(' · ')}catch(error){}return'<article class="event"><div class="event-date '+esc(event.impact)+'"><small>'+esc(parts.weekday)+'</small><strong>'+esc(parts.date)+'</strong><span>'+esc(parts.time)+' · '+esc(event.localDisplayTimezone||tz)+'</span></div><div class="event-main"><div class="event-top"><div><div class="event-name-row"><div class="event-name">'+esc(event.name)+'</div>'+infoHtml(event)+'</div><div class="event-meta"><span>'+esc(providerLabel[event.provider]||event.provider||'')+'</span><span>'+esc(categoryLabel[event.category]||event.category||'')+'</span>'+(markets?'<span>'+esc(markets)+'</span>':'')+'</div></div><span class="impact-badge '+esc(event.impact)+'">'+esc(event.impact)+'</span></div>'+eventMetricsHtml(event)+(event.description?'<p class="calendar-detail-description" style="margin-top:12px">'+esc(event.description)+'</p>':'')+'</div></article>'}).join(''):'<div class="empty">目前沒有符合條件的事件</div>'};
      var calendarDetailHtml=function(event,tz){if(!event)return'<article class="calendar-detail"><p class="calendar-detail-description">請點選某個事件查看細節。</p></article>';var markets='';try{markets=JSON.parse(event.affectedMarketsJson||'[]').join(' · ')}catch(error){}return'<article class="calendar-detail"><div class="event-top"><div><div class="event-name-row"><h3>'+esc(event.name)+'</h3>'+infoHtml(event)+'</div><p class="calendar-detail-time">'+esc(formatDate(event.eventTimeUtc,tz))+' · '+esc(event.localDisplayTimezone||tz)+'</p></div><span class="impact-badge '+esc(event.impact)+'">'+esc(event.impact)+'</span></div><div class="event-meta"><span>'+esc(providerLabel[event.provider]||event.provider||'')+'</span><span>'+esc(categoryLabel[event.category]||event.category||'')+'</span>'+(markets?'<span>'+esc(markets)+'</span>':'')+'</div>'+(event.description?'<p class="calendar-detail-description">'+esc(event.description)+'</p>':'')+eventMetricsHtml(event)+'<p class="calendar-detail-description"><a href="'+esc(event.sourceUrl)+'" target="_blank" rel="noopener noreferrer">開啟官方資料來源 ↗</a></p></article>'};
      var renderCalendarEvents=function(events,tz){var year=state.calendarCursor.getUTCFullYear(),month=state.calendarCursor.getUTCMonth(),firstWeekday=new Date(Date.UTC(year,month,1)).getUTCDay(),cells=[],byDate={},weekdays=['日','一','二','三','四','五','六'],monthTitle=new Intl.DateTimeFormat(locale(),{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));events.forEach(function(event){var key=localDateKey(event.eventTimeUtc,tz);(byDate[key]||(byDate[key]=[])).push(event)});for(var index=0;index<42;index+=1){var day=index-firstWeekday+1,date=new Date(Date.UTC(year,month,day)),key=date.toISOString().slice(0,10),outside=date.getUTCMonth()!==month,dayEvents=byDate[key]||[],today=key===localDateKey(new Date().toISOString(),tz),selected=dayEvents.some(function(event){return event.id===state.selectedEventId});cells.push('<div class="calendar-day'+(outside?' outside':'')+(today?' today':'')+(selected?' selected':'')+'"><span class="calendar-date-number">'+date.getUTCDate()+'</span>'+dayEvents.map(function(event){return'<button type="button" class="calendar-event-name '+esc(event.impact)+'" data-calendar-event="'+esc(event.id)+'" title="'+esc(event.name)+'">'+esc(event.name)+'</button>'}).join('')+'</div>')}var selectedEvent=events.find(function(event){return event.id===state.selectedEventId})||null;$('events').className='calendar-shell';$('events').innerHTML='<div class="calendar-head"><strong>'+esc(monthTitle)+'</strong><div class="calendar-nav"><button type="button" data-calendar-nav="prev" aria-label="上個月">←</button><button type="button" data-calendar-nav="next" aria-label="下個月">→</button></div></div><div class="calendar-weekdays">'+weekdays.map(function(day){return'<span>'+day+'</span>'}).join('')+'</div><div class="calendar-grid">'+cells.join('')+'</div>'+calendarDetailHtml(selectedEvent,tz)};
      var renderEvents=function(data){var all=data.events||[];renderProviderFilter(all);var events=filteredEvents(data),tz=(data.settings||{}).appTimezone||'Asia/Taipei';if(state.view==='calendar')renderCalendarEvents(events,tz);else renderListEvents(events,tz);document.querySelectorAll('[data-view]').forEach(function(button){button.classList.toggle('active',button.getAttribute('data-view')===state.view)})};
      var renderNextEvent=function(events,tz){var now=Date.now(),next=events.filter(function(item){return new Date(item.eventTimeUtc).getTime()>=now}).sort(function(a,b){return new Date(a.eventTimeUtc).getTime()-new Date(b.eventTimeUtc).getTime()})[0];state.nextEvent=next||null;$('next-event').textContent=next?next.name:'未來 30 天無事件';$('next-countdown').textContent=next?formatShort(next.eventTimeUtc,tz):'—'};
      var updateCountdown=function(){if(!state.nextEvent){$('next-countdown').textContent='—';return}var diff=new Date(state.nextEvent.eventTimeUtc).getTime()-Date.now();if(diff<=0){$('next-countdown').textContent='即將公布';return}var days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),minutes=Math.floor(diff%3600000/60000);$('next-countdown').textContent=(days?days+'D ':'')+String(hours).padStart(2,'0')+'H '+String(minutes).padStart(2,'0')+'M'};
      var scheduleRefresh=function(){clearTimeout(state.refreshTimer);if(!sessionStorage.getItem(tokenKey))return;var now=Date.now(),near=((state.data&&state.data.events)||[]).some(function(event){var release=new Date(event.eventTimeUtc).getTime();return !event.actualValue&&Math.abs(release-now)<=15*60*1000});state.refreshTimer=setTimeout(function(){load().catch(function(){state.refreshTimer=setTimeout(scheduleRefresh,15000)})},near?5000:60000)};
      var render=function(data){state.data=data;var events=data.events||[],now=Date.now(),upcoming=events.filter(function(item){return new Date(item.eventTimeUtc).getTime()>=now}),high=upcoming.filter(function(item){return item.impact==='high'}).length,enabled=(data.settings.enabledProviders||[]).length,summary=data.deliverySummary||{},tz=data.settings.appTimezone||'Asia/Taipei';$('stat-events').textContent=upcoming.length;$('stat-high').textContent=high;$('stat-providers').textContent=enabled+' / 7';$('stat-pending').textContent=summary.pending||0;$('sync-status').textContent=data.lastSuccessfulSync?'上次同步 '+formatShort(data.lastSuccessfulSync.completedAt,tz):'尚未完成同步';$('clock-mini').textContent=new Date().toLocaleString(locale(),{timeZone:tz,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});$('last-refresh').textContent='LAST REFRESH · '+new Date().toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'});renderNextEvent(events,tz);renderSettings(data.settings);renderProviders(data);renderEvents(data);scheduleRefresh();updateCountdown()};
      var load=async function(){var data=await api('/admin/overview');$('login').classList.add('hidden');$('app').classList.remove('hidden');render(data);return data};
      var onSync=async function(){setBusyAction('sync',true);try{var result=await api('/admin/sync',{method:'POST',body:JSON.stringify({})}),failed=(result.summaries||[]).filter(function(item){return item.status==='failed'}).length,updated=(result.valueRefresh&&result.valueRefresh.updatedEvents)||0;showToast(failed?'同步完成，但有來源失敗':'七個來源同步完成'+(updated?'，並回填 '+updated+' 筆官方值':''),failed>0);await load()}catch(error){showToast(error.message,true)}finally{setBusyAction('sync',false)}};
      var onRefreshValues=async function(){setBusyAction('refresh-values',true);try{var result=await api('/admin/refresh-values',{method:'POST'}),summary=result.result||{},count=summary.updatedEvents||0,error=summary.errors&&summary.errors[0];showToast(error?'官方數值回填失敗：'+error.message:(count?'已更新 '+count+' 筆官方數值':'官方尚未發布新的數值'),Boolean(error));await load()}catch(error){showToast(error.message,true)}finally{setBusyAction('refresh-values',false)}};
      $('login-form').addEventListener('submit',function(event){event.preventDefault();var value=$('token').value.trim();if(!value){$('login-error').textContent='請輸入 ADMIN_TOKEN';return}sessionStorage.setItem(tokenKey,value);$('login-error').textContent='驗證中…';$('login-submit').disabled=true;load().catch(function(error){sessionStorage.removeItem(tokenKey);$('login-error').textContent=error.message}).finally(function(){ $('login-submit').disabled=false;})});
      $('logout').addEventListener('click',function(){sessionStorage.removeItem(tokenKey);location.reload()});
      document.querySelectorAll('[data-action="refresh"]').forEach(function(button){button.addEventListener('click',function(){setBusyAction('refresh',true);load().catch(function(error){showToast(error.message,true)}).finally(function(){setBusyAction('refresh',false)})})});
      document.querySelectorAll('[data-action="sync"]').forEach(function(button){button.addEventListener('click',onSync)});
      document.querySelectorAll('[data-action="refresh-values"]').forEach(function(button){button.addEventListener('click',onRefreshValues)});
      $('test-discord').addEventListener('click',async function(){setBusyAction('test-discord',true);try{await api('/admin/test-discord',{method:'POST'});showToast('Discord 測試訊息已發送')}catch(error){showToast(error.message,true)}finally{setBusyAction('test-discord',false)}});
      $('save-settings').addEventListener('click',async function(){var settings=currentSettings();if(!settings.reminderMinutes.length){showToast('至少選擇一個提醒時間',true);return}setBusyAction('save-settings',true);try{var result=await api('/admin/settings',{method:'PUT',body:JSON.stringify(settings)});state.data.settings=result.settings;renderSettings(result.settings);showToast('設定已保存')}catch(error){showToast(error.message,true)}finally{setBusyAction('save-settings',false)}});
      ['notificationsEnabled','storeMediumEvents'].forEach(function(id){$(id).addEventListener('click',function(){setToggle(id,!$(id).classList.contains('on'))})});
      $('providers').addEventListener('click',function(event){var button=event.target.closest('button[data-provider]');if(!button||!state.data)return;var name=button.getAttribute('data-provider'),enabled=(state.data.settings.enabledProviders||[]).slice(),index=enabled.indexOf(name);if(index>=0)enabled.splice(index,1);else enabled.push(name);state.data.settings.enabledProviders=enabled;renderProviders(state.data)});
      document.querySelectorAll('[data-filter-impact]').forEach(function(button){button.addEventListener('click',function(){state.impact=button.getAttribute('data-filter-impact');document.querySelectorAll('[data-filter-impact]').forEach(function(item){item.classList.toggle('active',item===button)});if(state.data)renderEvents(state.data)})});
      document.querySelectorAll('[data-view]').forEach(function(button){button.addEventListener('click',function(){state.view=button.getAttribute('data-view')||'list';if(state.data)renderEvents(state.data)})});
      $('events').addEventListener('click',function(event){var target=event.target.closest('[data-calendar-event],[data-calendar-nav]');if(!target||!state.data)return;if(target.hasAttribute('data-calendar-event'))state.selectedEventId=target.getAttribute('data-calendar-event');else{var amount=target.getAttribute('data-calendar-nav')==='next'?1:-1;state.calendarCursor=new Date(Date.UTC(state.calendarCursor.getUTCFullYear(),state.calendarCursor.getUTCMonth()+amount,1));state.selectedEventId=null}renderEvents(state.data)});
      document.addEventListener('click',function(event){var button=event.target.closest('.event-info'),open=document.querySelectorAll('.event-info.open');open.forEach(function(item){if(item!==button)item.classList.remove('open')});if(button){event.preventDefault();button.classList.toggle('open')}});
      $('filter-category').addEventListener('change',function(){state.category=this.value;if(state.data)renderEvents(state.data)});$('filter-provider').addEventListener('change',function(){state.provider=this.value;if(state.data)renderEvents(state.data)});
      document.querySelectorAll('[data-scroll]').forEach(function(button){button.addEventListener('click',function(){document.getElementById(button.getAttribute('data-scroll')).scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('[data-scroll]').forEach(function(item){item.classList.toggle('active',item===button)})})});
      setInterval(function(){var tz=(state.data&&state.data.settings&&state.data.settings.appTimezone)||'Asia/Taipei';$('clock').textContent=new Date().toLocaleString(locale(),{timeZone:tz,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});updateCountdown()},1000);
      if(sessionStorage.getItem(tokenKey))load().catch(function(error){sessionStorage.removeItem(tokenKey);$('login-error').textContent=error.message});
    })();
  </script>
</body>
</html>`;
