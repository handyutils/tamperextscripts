import { useEffect, useMemo, useState } from "react";
import { sections, siteGuides, REGISTRY_INDEX, REPO } from "./content.js";

const BASE = import.meta.env.BASE_URL;

export default function App() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(query), [query]);
  const hash = useHash();
  const scriptId = /^#script\/(.+)$/.exec(hash)?.[1];

  if (scriptId) {
    return <ScriptPage id={decodeURIComponent(scriptId)} />;
  }

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

      {section.siteGuides && <SiteGuides />}
      {section.registry && <Registry />}
      {section.note && <p className="note">{section.note}</p>}
    </section>
  );
}

function SiteGuides() {
  return (
    <div className="cards">
      {siteGuides.map((site) => (
        <article key={site.name} className="card">
          <h3>{site.name}</h3>
          <p className="muted">{site.where}</p>
          <p>{site.how}</p>
          <a
            className="button"
            href={`https://raw.githubusercontent.com/handyutils/tamperextscripts/master/community-scripts-registry/${site.folder}/${encodeURIComponent(site.file)}`}
            target="_blank"
            rel="noreferrer"
          >
            Install userscript
          </a>
        </article>
      ))}
    </div>
  );
}

function Registry() {
  const [state, setState] = useState({ status: "loading", scripts: [] });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

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

  const categories = ["All", ...new Set(state.scripts.map((s) => s.category ?? "Other"))];
  const q = query.trim().toLowerCase();
  const visible = state.scripts.filter((s) => {
    if (category !== "All" && (s.category ?? "Other") !== category) return false;
    if (!q) return true;
    return [s.name, s.description, s.category, s.id].join(" ").toLowerCase().includes(q);
  });

  return (
    <>
      <div className="registry-tools">
        <input
          className="search"
          type="search"
          placeholder="Search community scripts"
          aria-label="Search community scripts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="group" aria-label="Category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${c === category ? " active" : ""}`}
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="muted">No scripts match. Try another search or category.</p>
      ) : (
        <div className="cards">
          {visible.map((s) => (
            <article key={s.id} className="card">
              <h3><a href={`#script/${encodeURIComponent(s.id)}`}>{s.name}</a> <span className="muted">{s.version}</span></h3>
              <p>{s.description}</p>
              <p className="muted">{s.category ?? "Other"} · License: {s.license}</p>
              <div className="card-actions">
                <a className="button primary" href={s.url} target="_blank" rel="noreferrer">Install</a>
                <a className="button" href={s.url.replace("raw.githubusercontent.com", "github.com").replace("/master/", "/blob/master/")} target="_blank" rel="noreferrer">View source</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
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

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

// Detail page for one community script: full description, install and download
// links, the site guide, and the SHA-256 that the registry checks.
function ScriptPage({ id }) {
  const [state, setState] = useState({ status: "loading", script: null });

  useEffect(() => {
    let active = true;
    fetch(REGISTRY_INDEX, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((index) => {
        const script = (index.scripts ?? []).find((x) => x.id === id) ?? null;
        if (active) setState({ status: "ready", script });
      })
      .catch((error) => {
        if (active) setState({ status: "error", message: error.message, script: null });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const back = <p><a href="#registry">← Back to community scripts</a></p>;

  if (state.status === "loading") return <main className="content">{back}<p className="muted">Loading...</p></main>;
  if (state.status === "error") {
    return <main className="content">{back}<p className="note">Could not load this script ({state.message}).</p></main>;
  }
  const s = state.script;
  if (!s) return <main className="content">{back}<p className="muted">No script with id "{id}" in the registry.</p></main>;

  const folder = /community-scripts-registry\/([^/]+)\//.exec(s.url)?.[1];
  const guide = siteGuides.find((g) => g.folder === folder);
  const sourceUrl = s.url.replace("raw.githubusercontent.com", "github.com").replace("/master/", "/blob/master/");

  return (
    <main className="content script-page">
      {back}
      <p className="eyebrow">{s.category ?? "Other"}</p>
      <h1>{s.name} <span className="muted">{s.version}</span></h1>
      <p className="lede">{s.description}</p>

      <div className="card-actions">
        <a className="button primary" href={s.url} target="_blank" rel="noreferrer">Download .user.js</a>
        <a className="button" href={sourceUrl} target="_blank" rel="noreferrer">View source</a>
      </div>
      <p className="note">
        Open the download link in Chrome with Tampermonkey installed, and Tampermonkey offers to install it.
        Or download the file and paste it into the extension's options page.
      </p>

      <section className="section">
        <h2>Where it works</h2>
        <p>{guide ? guide.where : "See the script's header for the sites it runs on."}</p>
      </section>

      <section className="section">
        <h2>How to install</h2>
        <p><strong>With Tampermonkey</strong> (Chrome, Edge, or Firefox):</p>
        <ol className="steps">
          <li>Install Tampermonkey from its store page, then click <strong>Download .user.js</strong> above.</li>
          <li>Tampermonkey opens an install screen. Click <strong>Install</strong>.</li>
          <li>Open the site listed under "Where it works" and reload the page.</li>
        </ol>
        <p><strong>With the tamperextscripts extension:</strong></p>
        <ol className="steps">
          <li>Load the extension (see the Install section above) and turn on Allow User Scripts.</li>
          <li>Open the extension's options page, choose the downloaded file, and press <strong>Install</strong>.</li>
          <li>Reload the site.</li>
        </ol>
      </section>

      {guide && (
        <section className="section">
          <h2>How to use</h2>
          <p>{guide.how}</p>
          <ol className="steps">
            <li>Install the script (button above).</li>
            <li>Open a chat on {guide.where.split(",")[0]}.</li>
            <li>Click <strong>Export</strong> in the bottom-right corner, then pick a format.</li>
          </ol>
        </section>
      )}

      <section className="section">
        <h2>Details</h2>
        <dl className="faq">
          <div><dt>License</dt><dd>{s.license}</dd></div>
          <div><dt>Version</dt><dd>{s.version}</dd></div>
          <div><dt>SHA-256</dt><dd><code>{s.sha256}</code></dd></div>
        </dl>
      </section>
    </main>
  );
}
