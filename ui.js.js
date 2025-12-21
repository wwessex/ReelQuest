// ui.js — small UI helpers for CineSafari (ES module)

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Build the About modal HTML content.
 */
export function buildAboutHtml(buildLineText) {
  const build = buildLineText
    ? `<div style="margin-top:6px;opacity:.95">${escapeHtml(buildLineText)}</div>`
    : "";

  return (
    `<p>CineSafari is a simple tracker for films & TV: keep watchlists, log what you’ve watched, add notes, and export your data whenever you like.</p>` +
    `<ul>` +
      `<li><b>Privacy-first:</b> your data stays yours — export/backup anytime.</li>` +
      `<li><b>Import tools:</b> supports IMDb CSV imports and CineSafari backups.</li>` +
      `<li><b>Sync (optional):</b> sign in to sync across devices.</li>` +
    `</ul>` +
    `<hr style='margin:12px 0;border:0;border-top:1px solid rgba(255,255,255,0.10)'>` +
    `<p style='margin:0 0 6px 0'><b>Attributions</b></p>` +
    `<p style='margin:0 0 8px 0'>This product uses the TMDB API but is not endorsed or certified by TMDB. ` +
      `<a href='https://www.themoviedb.org' target='_blank' rel='noopener'>themoviedb.org</a></p>` +
    `<p style='margin:0 0 8px 0'>Metadata provided by TheTVDB. Please consider adding missing information or subscribing. ` +
      `<a href='https://www.thetvdb.com' target='_blank' rel='noopener'>thetvdb.com</a></p>` +
    build +
    `<p style='margin-top:10px;opacity:.9'>Tip: If something looks stuck after an update, refresh once (or reopen the site) to clear cached files.</p>`
  );
}
