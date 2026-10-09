import { useEffect, useMemo, useState } from "react";
import { sections, REGISTRY_INDEX, REPO } from "./content.js";

const BASE = import.meta.env.BASE_URL;

export default function App() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(query), [query]);

  return (
    <>
      <header className="topbar">
        <a className="brand" href={BASE}>
          <img src={`${BASE}logo.svg`} alt="" width="32" height="32" />
          <span>tamperextscripts</span>
        </a>
        <nav className="topnav">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title}</a>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <input
          className="search"
          type="search"
          placeholder="Search the docs"
          aria-label="Search the docs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <main className="content">
        {query.trim() ? (
          <Results query={query} results={results} />
        ) : (
          <>
            <Hero />
            {sections.map((s) => (
              <Section key={s.id} section={s} />
            ))}
          </>
        )}
      </main>

      <footer className="footer">
        <span>tamperextscripts is open source under GPL-3.0.</span>
        <a href={REPO} target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <p className="eyebrow">Chrome extension · Manifest V3 · local only</p>
      <h1>Export your chats. Run your own scripts.</h1>
      <p className="lede">
        Save ChatGPT and Claude conversations as Markdown, JSON, HTML, or plain text, and run
        userscripts from a registry, without sending anything to a third party.
      </p>
      <div className="cta">
        <a className="button primary" href={`#download`}>Download</a>
        <a className="button" href="#install">Install guide</a>
      </div>
    </section>
  );
}

function Section({ section }) {
  return (
    <section id={section.id} className="section">
      <h2>{section.title}</h2>
      {section.body?.map((p) => <p key={p}>{p}</p>)}

      {section.action && (
        <p>
          <a className="button primary" href={`${BASE}${section.action.href}`}>{section.action.label}</a>
        </p>
      )}

      {section.steps && (
        <ol className="steps">
          {section.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      )}

      {section.faq && (
        <dl className="faq">
          {section.faq.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      )}

      {section.registry && <Registry />}
      {section.note && <p className="note">{section.note}</p>}
    </section>
  );
}

function Registry() {
  const [state, setState] = useState({ status: "loading", scripts: [] });

  useEffect(() => {
    let active = true;
    fetch(REGISTRY_INDEX, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((index) => {
        if (active) setState({ status: "ready", scripts: index.scripts ?? [] });
      })
      .catch((error) => {
        if (active) setState({ status: "error", message: error.message, scripts: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") return <p className="muted">Loading the registry...</p>;
  if (state.status === "error") {
    return <p className="note">Could not load the registry ({state.message}). Try again later.</p>;
  }
  if (state.scripts.length === 0) return <p className="muted">The registry has no scripts yet.</p>;

  return (
    <div className="cards">
      {state.scripts.map((s) => (
        <article key={s.id} className="card">
          <h3>{s.name} <span className="muted">{s.version}</span></h3>
          <p>{s.description}</p>
          <p className="muted">License: {s.license}</p>
          <a className="button" href={s.url} target="_blank" rel="noreferrer">View source</a>
        </article>
      ))}
    </div>
  );
}

function Results({ query, results }) {
  if (results.length === 0) {
    return <p className="muted">No results for "{query}".</p>;
  }
  return (
    <section className="results">
      <h2>{results.length} result(s)</h2>
      {results.map((r) => (
        <a key={r.id} className="result" href={`#${r.id}`}>
          <strong>{r.title}</strong>
          <span>{r.snippet}</span>
        </a>
      ))}
    </section>
  );
}

// Plain text matching over every section's text, including FAQ entries and steps.
function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return sections.flatMap((s) => {
    const text = [s.title, ...(s.body ?? []), ...(s.steps ?? []), s.note ?? "",
      ...(s.faq ?? []).flat()].join(" ");
    const at = text.toLowerCase().indexOf(q);
    if (at === -1) return [];
    const start = Math.max(0, at - 60);
    return [{ id: s.id, title: s.title, snippet: text.slice(start, at + q.length + 80) }];
  });
}
