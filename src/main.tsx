import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowRight, Sparkles, MapPin, Music2, Clapperboard, Utensils, RotateCw, ChevronDown, Check, Download, X, Terminal, Disc3, Sun, LoaderCircle, Info } from 'lucide-react';
import { runRules } from './agent';
import { MockTasteProvider } from './fixtures';
import { validateBrief, type Brief, type Category, type Plan, type TraceEvent } from './types';
import './style.css';

const examples = [
  { label: 'The slow Sunday person', prompt: 'I love Khruangbin, Wes Anderson and Haruki Murakami. Plan a warm, unhurried evening with a few unexpected discoveries.' },
  { label: 'A little electric', prompt: 'I love Radiohead, Daft Punk and Christopher Nolan. Give me an evening with unusual textures and big ideas.' },
  { label: 'Soul after sunset', prompt: 'I love Nina Simone, Kendrick Lamar and Laufey. I want a soulful evening that leaves room for conversation.' },
];
const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const staticDemo = import.meta.env.VITE_STATIC_DEMO === '1';
const icons = { artist: Music2, place: Utensils, movie: Clapperboard };
const labels = { artist: 'Set the mood', place: 'Find your table', movie: 'Stay for the story' };
const times = { artist: '18:00', place: '19:00', movie: '21:00' };

function exportPlan(plan: Plan, brief: Brief) {
  const text = `# Afterglow — ${plan.title}\n\n${brief.city} · ${brief.people} people · $${brief.budget} USD total envelope\n\n${(['artist', 'place', 'movie'] as Category[]).map(t => `## ${times[t]} · ${labels[t]}\n${plan.picks[t].name}\n${plan.reasons[t]}`).join('\n\n')}\n\nSuggested allocations, not quoted prices: dining $${plan.budget.dining}; film $${plan.budget.film}; reserve $${plan.budget.reserve}.\n\nProvider: ${plan.provider === 'fixture' ? 'curated demo fixtures (not Qloo results)' : 'Qloo API'}. Planner: ${plan.planner}.\nCheck venue opening hours, dietary needs, menu prices and film availability directly. Times are suggestions. Nothing is booked.\n\n${plan.warnings.join('\n')}`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const link = document.createElement('a'); link.href = url; link.download = 'my-afterglow-evening.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Art() {
  return <div className="hero-art" aria-hidden="true">
    <div className="art-orbit"/><div className="art-note"><span className="tiny-label">THE RECIPE FOR A GOOD NIGHT</span><span>A familiar feeling.<br/>An unfamiliar favorite.</span><svg width="60" height="42" viewBox="0 0 60 42"><path d="M3 5Q12 38 49 25M37 18l15 7-10 12" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></div>
    <div className="sleeve"><div className="sleeve-top">AFTERGLOW SELECTS <span>VOL. 01</span></div><div className="sleeve-sun"/><div className="sleeve-lines"/><div className="sleeve-name">a little<br/><i>offbeat.</i></div><span className="sleeve-foot">SIDE A · SOMETHING YOU'LL LOVE</span></div>
    <div className="vinyl"><div className="vinyl-label"><Sun size={28}/><span>AFTERGLOW</span></div></div>
    <div className="dinner-note"><Utensils size={19}/><span>One good table.<small>No endless scrolling.</small></span><span className="note-star">✳</span></div>
    <div className="movie-ticket"><div>ADMIT YOUR CURIOSITY</div><strong>Make a night of it.</strong><span>DINNER + MUSIC + A LITTLE MOVIE MAGIC</span><div className="barcode"/></div>
    <div className="art-caption">YOUR TASTE HAS PLACES TO GO. <ArrowUpRight size={16}/></div>
  </div>;
}
function App() {
  const [prompt, setPrompt] = useState(examples[0].prompt);
  const [city, setCity] = useState('New York');
  const [budget, setBudget] = useState(100);
  const [people, setPeople] = useState(2);
  const [adventurous, setAdventurous] = useState(false);
  const [plan, setPlan] = useState<Plan>();
  const [lastBrief, setLastBrief] = useState<Brief>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<{ provider: string; planner: string }>();
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [about, setAbout] = useState(false);
  const [useDemo, setUseDemo] = useState(staticDemo);
  const [swapping, setSwapping] = useState<Category>();
  const resultsRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (staticDemo) { setMode({ provider: 'fixture', planner: 'rules' }); return; }
    fetch(`${apiOrigin}/api/health`, { signal: AbortSignal.timeout(4000) })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { if (!['qloo', 'fixture'].includes(data.provider) || !['rules', 'mistral'].includes(data.planner)) throw new Error(); setMode(data); })
      .catch(() => { setUseDemo(true); setMode({ provider: 'fixture', planner: 'rules' }); });
  }, []);
  useEffect(() => { if (about) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [about]);
  const effective = useDemo ? { provider: 'fixture', planner: 'rules' } : mode;
  async function makePlan(swap?: Category) {
    if (busy) return;
    setError(''); setBusy(true); setSwapping(swap); setTrace([]);
    try {
      // Revisions use the original brief: editing controls starts a fresh evening.
      const brief = validateBrief(swap && lastBrief && plan ? { ...lastBrief, exclude: [...lastBrief.exclude, plan.picks[swap].id] } : { prompt, city, budget, people, adventurous, exclude: [] });
      let next: Plan;
      if (useDemo) next = await runRules(brief, new MockTasteProvider(), e => setTrace(prev => [...prev, e]));
      else {
        const response = await fetch(`${apiOrigin}/api/plan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(brief), signal: AbortSignal.timeout(80000) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not plan this evening.');
        next = body;
      }
      // Keep the other two picks stable when swapping one part of an evening.
      if (swap && plan) {
        const retained = (['artist', 'place', 'movie'] as Category[]).filter(type => type !== swap);
        for (const type of retained) { next.picks[type] = plan.picks[type]; next.reasons[type] = plan.reasons[type]; }
        next.trace.push({ tool: 'ui_preserve_choices', input: { replace: swap }, output: Object.fromEntries(retained.map(type => [type, { id: plan.picks[type].id, name: plan.picks[type].name }])), status: 'ok', durationMs: 0 });
      }
      setPlan(next); setLastBrief(brief); setTrace(next.trace);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }), 80);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Try again.'); }
    finally { setBusy(false); setSwapping(undefined); }
  }
  const currentBrief = lastBrief;
  return <>
    <a className="skip" href="#planner">Skip to planner</a>
    <header className="site-header"><a className="brand" href="#"><span className="brand-mark"><Sun size={24}/></span>afterglow</a><nav aria-label="Main"><button onClick={() => setAbout(true)}>The idea <ArrowUpRight size={13}/></button><a href="https://github.com/Schultzenator/afterglow-qloo" target="_blank" rel="noreferrer">Behind the build <ArrowUpRight size={13}/></a></nav><span className="header-signoff">GOOD TASTE. GOOD EVENINGS.</span></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="little-spark">✳</span> LESS SEARCHING. MORE FEELING.</div><h1>Go where your<br/><em>taste takes you.</em></h1><p>You already know what you love. Let it lead you to a new soundtrack, a good table, and a film worth staying up for.</p><div className="hero-bottom"><span className="small-symbol">↳</span><span>One evening. Three discoveries.<br/><b>A thread that ties it all together.</b></span></div></div><Art/></section>
      <section id="planner" className="planner" aria-labelledby="planner-title"><div className="planner-heading"><div><span className="tiny-label">LET'S MAKE A NIGHT OF IT</span><h2 id="planner-title">What's your kind of good?</h2></div><button className={`mode-badge ${effective?.provider === 'qloo' ? 'live' : ''}`} onClick={() => setAbout(true)}><span/>{!effective ? 'Connecting…' : effective.provider === 'qloo' ? 'Live Qloo' : 'Curated demo'}<Info size={13}/></button></div>
        <form onSubmit={e => { e.preventDefault(); void makePlan(); }}><div className="brief-grid"><div className="prompt-col"><label htmlFor="prompt">A few things you love</label><textarea id="prompt" value={prompt} maxLength={1600} onChange={e => setPrompt(e.target.value)} placeholder={'I love "Khruangbin" and "Amélie". Make an evening of it.'} required minLength={3}/><div className="examples"><span>Borrow a mood</span>{examples.map((ex, i) => <button type="button" key={ex.label} onClick={() => { setPrompt(ex.prompt); setError(''); }} className={prompt === ex.prompt ? 'selected' : ''}>{['↗', 'ϟ', '☾'][i]} {ex.label}</button>)}</div></div>
        <div className="controls-col"><div className="city-field"><label htmlFor="city">Your corner of the world</label><div className="input-with-icon"><MapPin size={17}/><select id="city" value={city} onChange={e => setCity(e.target.value)}><option>New York</option><option>London</option><option>Warsaw</option></select><ChevronDown size={14}/></div></div><div className="control-pair"><div><label htmlFor="budget">Total budget · USD</label><div className="money-input"><span>$</span><input id="budget" type="number" min="20" max="1000" value={budget} required onChange={e => setBudget(Number(e.target.value))}/></div></div><div><label htmlFor="people">Good company</label><div className="input-with-icon"><select id="people" value={people} onChange={e => setPeople(Number(e.target.value))}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i ? 'people' : 'person'}</option>)}</select><ChevronDown size={14}/></div></div></div></div></div>
        <div className="form-footer"><label className="adventure"><input type="checkbox" checked={adventurous} onChange={e => setAdventurous(e.target.checked)}/><span className="switch"/><span>A little outside my usual<small>Leave room for a happy accident.</small></span></label><button className="primary" type="submit" disabled={busy || !effective}>{busy ? <><LoaderCircle size={18} className="spin"/> {swapping ? 'Finding another favorite…' : 'Following your taste…'}</> : <>Find my evening <ArrowRight size={19}/></>}</button></div></form>
        <div className="demo-disclosure">{effective?.provider === 'qloo' ? 'Recommendations from Qloo. Check hours, menus and availability before heading out.' : 'Explore with curated sample data. Live Qloo connects when the server has an API key.'}<span>No sign-up. Nothing booked.</span></div>
      </section>
      {error && <div className="error" role="alert"><Info size={19}/><div><b>Let's adjust the brief.</b><p>{error}</p>{!useDemo && <button onClick={() => { setUseDemo(true); setError(''); }}>Switch to the key-free demo</button>}</div></div>}
      {busy && <div className="working" role="status"><LoaderCircle size={19} className="spin"/><span>Resolving your favorites, connecting categories, checking the plan…</span></div>}
      {plan && currentBrief ? <section ref={resultsRef} id="evening" className="results" aria-labelledby="results-title"><div className="results-heading"><div><span className="eyebrow"><Check size={15}/> YOUR EVENING, CONNECTED</span><h2 id="results-title">{plan.title}</h2><p>{currentBrief.city} <span>·</span> {currentBrief.people} {currentBrief.people === 1 ? 'person' : 'people'} <span>·</span> ${currentBrief.budget} USD envelope</p></div><button className="outline" disabled={busy} onClick={() => exportPlan(plan, currentBrief)}><Download size={16}/> Save evening</button></div>
        <div className="taste-thread"><span>THE THREAD</span>{plan.seeds.map((e, i) => <React.Fragment key={e.id}>{i > 0 && <span className="thread-plus">+</span>}<span className="seed-pill">{e.name}</span></React.Fragment>)}<ArrowRight size={17}/><b>three new discoveries</b></div>
        <div className="pick-grid">{(['artist', 'place', 'movie'] as Category[]).map((type, i) => {
          const pick = plan.picks[type], Icon = icons[type];
          const href = type === 'artist' ? `https://open.spotify.com/search/${encodeURIComponent(pick.name)}` : type === 'place' ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pick.name + ' ' + currentBrief.city)}` : `https://www.justwatch.com/us/search?q=${encodeURIComponent(pick.name)}`;
          return <article className={`pick-card ${type}`} key={type}><div className="pick-top"><span>0{i + 1} / {labels[type]}</span><time>{times[type]}</time></div><div className="pick-art" aria-hidden="true">{type === 'artist' ? <><div className="record-art"><div><Disc3 size={48}/></div></div><span>ON REPEAT</span></> : type === 'place' ? <><div className="plate-art"><Utensils size={32}/></div><span>TAKE YOUR TIME</span></> : <><div className="film-frame"><span>AN EVENING<br/>WELL SPENT.</span><Clapperboard size={28}/></div><span>ONE MORE SCENE</span></>}</div><div className="pick-body"><span className="pick-category"><Icon size={13}/>{type === 'artist' ? 'THE SOUNDTRACK' : type === 'place' ? 'THE DINNER' : 'THE FILM'}<span>{pick.source === 'fixture' ? 'Sample pick' : 'Qloo result'}</span></span><h3>{pick.name}</h3><p className="pick-description">{pick.description || `A ${type} discovered through your taste signals.`}</p><details className="why"><summary><Sparkles size={14}/> Why this fits <ChevronDown size={13}/></summary><p>{plan.reasons[type]}</p>{pick.source === 'qloo' && <p>{pick.explainability ? 'Qloo returned explainability metadata. Inspect it in the tool trace below.' : 'Qloo did not return per-pick explainability. This explanation describes the request, not a measured causal connection.'}</p>}</details><div className="pick-actions"><a href={href} target="_blank" rel="noreferrer">{type === 'artist' ? 'Find the music' : type === 'place' ? 'Look up the venue' : 'Find the film'} <ArrowUpRight size={15}/></a><button title={`Swap ${type}`} aria-label={`Swap ${type}`} disabled={busy} onClick={() => void makePlan(type)}><RotateCw size={15} className={busy && swapping === type ? 'spin' : ''}/></button></div></div></article>;
        })}</div>
        <div className="budget-strip"><div><span className="tiny-label">A LITTLE ROOM TO BREATHE</span><h3>Your ${currentBrief.budget} envelope</h3></div><div><span>Dinner</span><strong>${plan.budget.dining}</strong></div><div><span>Film</span><strong>${plan.budget.film}</strong></div><div><span>Keep in reserve</span><strong>${plan.budget.reserve}</strong></div><p>Suggested group allocations,<br/>not quoted prices. Music assumes free access.</p></div>
        <p className="results-disclaimer">Times are suggestions. Check opening hours, dietary needs, menu prices and regional streaming availability directly. No tickets or tables are reserved.{plan.provider === 'fixture' && ' All matches and rankings are hand-authored demo fixtures, not Qloo API results.'}</p>
        {plan.warnings.length > 0 && <div className="warnings" role="status">{plan.warnings.map(w => <p key={w}>{w}</p>)}</div>}
        <details className="trace"><summary><Terminal size={16}/><span>Follow the agent's trail<small>{plan.planner === 'mistral' ? 'Mistral tool calling' : 'Rule-based tool workflow'} · {plan.provider === 'fixture' ? 'sample data' : 'live Qloo'} · {trace.length} workflow steps</small></span><ChevronDown size={17}/></summary><div className="trace-intro">Every recommendation must come from a discovery result. Swaps add rejected picks to the next request's exclusions. The UI then retains your other two choices; that merge is recorded as ui_preserve_choices.</div>{trace.map((event, i) => <details className="trace-event" key={i}><summary><span className={event.status}>{event.status === 'ok' ? <Check size={13}/> : <X size={13}/>}</span><code>{event.tool}</code><span>{event.durationMs} ms</span><ChevronDown size={13}/></summary><pre>{JSON.stringify({ input: event.input, output: event.output }, null, 2)}</pre></details>)}</details>
      </section> : <section className="how" id="how"><div className="section-kicker"><span>THREE STOPS. ONE THREAD.</span><span>A BETTER WAY TO PLAN YOUR DOWNTIME</span></div><div className="how-grid"><article><span>01</span><Music2 size={23}/><h3>Start with a feeling.</h3><p>Your favorite artist, filmmaker or book is more than a preference. It's a place to begin.</p></article><article><span>02</span><Sparkles size={23}/><h3>Follow the connection.</h3><p>Cross from what you know into music, dining and film you might never have found.</p></article><article><span>03</span><Sun size={23}/><h3>Make it your evening.</h3><p>Keep what clicks. Swap what doesn't. Save a small plan and go enjoy the real world.</p></article></div></section>}
      <section className="closing"><span>✳</span><p>Less time deciding.<br/><em>More nights worth remembering.</em></p></section>
    </main><footer><a className="brand footer-brand" href="#">afterglow</a><span>A CULTURALLY CURIOUS LITTLE AGENT.</span><button onClick={() => setAbout(true)}>Built for the Qloo Agentic Hackathon <ArrowUpRight size={13}/></button></footer>
    <dialog ref={dialogRef} aria-labelledby="about-title" onCancel={() => setAbout(false)} onClick={e => { if (e.target === dialogRef.current) setAbout(false); }}><div className="dialog-content"><button className="dialog-close" aria-label="Close" onClick={() => setAbout(false)}><X size={20}/></button><span className="eyebrow">A LITTLE CONTEXT</span><h2 id="about-title">Taste travels.</h2><p>Afterglow turns the things you love into one connected evening: a soundtrack, a dinner spot and a film.</p><p><b>This session: {effective?.provider === 'qloo' ? 'live Qloo API' : 'curated demo fixtures'} + {effective?.planner === 'mistral' ? 'Mistral tool calling' : 'rule-based planner'}.</b></p><p>The demo illustrates cross-category discovery with a small, hand-authored catalog. Names, tags and rankings are sample data. It can recognize the example favorites and quoted names in that catalog.</p><p>With a Qloo key on the server, the same tools search real entities and request cross-category insights. An optional Mistral key lets a language model choose the tool calls. Keys never go into the browser.</p><p>We don't verify bookings, opening hours, prices, streaming rights or dietary suitability. The budget is an allocation you control.</p><a className="outline" href="https://github.com/Schultzenator/afterglow-qloo" target="_blank" rel="noreferrer">See the open-source build <ArrowUpRight size={15}/></a></div></dialog>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
