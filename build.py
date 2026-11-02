#!/usr/bin/env python3
"""Builds the app page (index.html) from src/planner.html. Run: python3 build.py"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent
src = (root / 'src' / 'planner.html').read_text()

head = '''
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="./icons/icon-192.png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Bangkok">
<meta name="description" content="Our Bangkok trip: itinerary, bookings, albums and shared expenses.">
<script>
(function(){var ready={},wait={};
window.STANDALONE=true;
window.PHOTO_LIMITS={max:1400,bytes:240000,total:850000};
window.__provide=function(n,v){ready[n]=v;(wait[n]||[]).forEach(function(f){f(v)});wait[n]=[]};
window.claude={use:function(n){return new Promise(function(res){if(n in ready)res(ready[n]);else(wait[n]=wait[n]||[]).push(res)})}};
})();
</script>
<style>
#gate{position:fixed;inset:0;z-index:100;background:radial-gradient(120% 70% at 85% 0%,#7A2C5E 0%,rgba(122,44,94,0) 55%),linear-gradient(165deg,#120F35,#2A1B57 60%,#55204F);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:calc(env(safe-area-inset-top) + 28px) 16px calc(env(safe-area-inset-bottom) + 24px)}
#gate[hidden]{display:none}
.gate-card{width:100%;max-width:440px}
.gate-top{color:#FFF7E8;padding:8px 4px 18px}
.gate-top h1{font-size:64px;line-height:.95;margin:10px 0 4px}
.gate-top h1 i{font-style:normal;color:#F6C977}
.gate-top .thai{font-family:var(--serif);color:#F6C977}
.gate-body{background:var(--bg);border-radius:24px;padding:20px 18px}
.gate-or{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.gate-or:before,.gate-or:after{content:"";flex:1;height:1px;background:var(--line)}
.upd{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top) + 10px);z-index:90;background:var(--ink);color:#fff;border-radius:16px;padding:10px 12px 10px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:700;font-size:13.5px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
</style>
'''
out = src.replace('<title>Bangkok Trip</title>', '<title>Bangkok Trip</title>' + head, 1)
out = out.replace('</body>', '<script type="module" src="./standalone.js"></script>\n</body>', 1)
# No Claude wording in the standalone app (those features are switched off there anyway).
for old, new in [(' Open the trip from its claude.ai link to share edits with the group.', ''),
                 ('Address suggested by Claude', 'Suggested address'),
                 (' with Claude</button>', '</button>'),
                 ('// Look up address (asks Claude; can\'t browse, so it\'s a suggestion)', '// Look up address'),
                 ('Claude', 'the assistant')]:
    out = out.replace(old, new)
out = out.replace("window.claude", "window.tripApi").replace("||item.geo==='claude'", "").replace("||o.geo==='claude'", "").replace("if(o.geo==='claude')o.geo='ai';", "")
assert out.count('standalone.js') == 1 and 'window.STANDALONE=true' in out
(root / 'index.html').write_text(out)
print('built index.html', len(out))
