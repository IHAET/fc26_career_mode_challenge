/*
 * Draws a challenge as a tall PNG card for posting on Reddit, Discord,
 * Instagram and so on, and a save's results as a story-sized season card. Browser only (uses <canvas>), no dependencies.
 *
 * Layout is done in one pass that records drawing steps and measures the
 * height, then the canvas is sized and the steps are replayed.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const W = 1080;
  const PAD = 72;
  const INNER = W - PAD * 2;
  const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Color Emoji", sans-serif';
  const C = {
    bg: '#0b0f14', panel: '#151d28', panel2: '#1b2533', line: '#263243',
    text: '#e9eef5', muted: '#8d9bb0', accent: '#19e68c', ink: '#062314', warn: '#ffc94d', hot: '#ff8a4c',
    diff: ['#4dd6ff', '#19e68c', '#ffb547', '#ff5c6c'],
  };

  const font = (weight, size, style) => `${style || ''} ${weight} ${size}px ${FONT}`.trim();

  function wrap(ctx, text, maxWidth) {
    const lines = [];
    String(text).split('\n').forEach((para) => {
      let line = '';
      para.split(/\s+/).filter(Boolean).forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(test).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      lines.push(line);
    });
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function layout(ch, siteLabel) {
    const measure = document.createElement('canvas').getContext('2d');
    const ops = [];
    const diff = C.diff[(ch.difficulty || 2) - 1];
    let y = PAD;

    // Text block: wraps, records the draw, returns its height.
    const text = (str, { weight = 400, size = 30, style, color = C.text, x = PAD, width = INNER, lineHeight = 1.35, maxLines } = {}) => {
      measure.font = font(weight, size, style);
      let lines = wrap(measure, str, width);
      if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
      }
      const top = y;
      const lh = Math.round(size * lineHeight);
      ops.push((ctx) => {
        ctx.font = font(weight, size, style);
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => ctx.fillText(line, x, top + i * lh));
      });
      return lines.length * lh;
    };

    const heading = (label) => {
      y += 36;
      const top = y;
      ops.push((ctx) => {
        ctx.font = font(800, 24);
        ctx.fillStyle = C.muted;
        ctx.textBaseline = 'top';
        ctx.fillText(label.toUpperCase().split('').join(' '), PAD, top);
        ctx.fillStyle = C.line;
        ctx.fillRect(PAD, top + 40, INNER, 2);
      });
      y += 60;
    };

    // Top bar and brand row.
    ops.push((ctx) => {
      ctx.fillStyle = diff;
      ctx.fillRect(0, 0, W, 14);
    });
    const brandTop = y;
    const kind = ch.daily ? `DAILY CHALLENGE #${ch.daily.number}` : ch.mode === 'player' ? 'PLAYER CAREER CHALLENGE' : 'CAREER MODE CHALLENGE';
    ops.push((ctx) => {
      ctx.fillStyle = C.accent;
      roundRect(ctx, PAD, brandTop, 124, 56, 12);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.font = font(900, 32, 'italic');
      ctx.textBaseline = 'middle';
      ctx.fillText('FC26', PAD + 18, brandTop + 29);
      ctx.fillStyle = C.muted;
      ctx.font = font(700, 24);
      ctx.fillText(kind, PAD + 148, brandTop + 29);
      ctx.font = font(800, 26);
      const label = ch.difficultyName.toUpperCase();
      const w = ctx.measureText(label).width + 40;
      ctx.fillStyle = diff;
      roundRect(ctx, W - PAD - w, brandTop + 4, w, 48, 24);
      ctx.fill();
      ctx.fillStyle = C.bg;
      ctx.fillText(label, W - PAD - w + 20, brandTop + 29);
    });
    y += 56 + 48;

    // Title block.
    const typeLabel = ch.archetype.history && ch.archetype.typeName && ch.archetype.typeName !== ch.archetype.name ? `${ch.archetype.typeName} · ` : '';
    y += text(`${ch.archetype.icon}  ${typeLabel}${ch.archetype.name}`.toUpperCase(), { weight: 800, size: 28, color: diff });
    y += 8;
    y += text(ch.mode === 'player' && ch.position ? `${ch.position.name} at ${ch.club.name}` : ch.club.name, { weight: 800, size: 76, lineHeight: 1.1 });
    y += 12;
    if (ch.archetype.tagline) y += text(ch.archetype.tagline, { size: 32, style: 'italic', color: C.muted });
    y += 10;
    const meta = [`${ch.seasons} season${ch.seasons === 1 ? '' : 's'}`];
    if (ch.startAge) meta.push(`starting age ${ch.startAge}`);
    if (ch.club.league) meta.push(ch.club.league);
    y += text(meta.join('  ·  '), { weight: 600, size: 28, color: C.muted });

    if (ch.archetype.history) {
      y += 32;
      measure.font = font(400, 27);
      const lines = Math.min(7, wrap(measure, ch.archetype.history, INNER - 56).length);
      const boxTop = y;
      const boxH = lines * Math.round(27 * 1.4) + 48;
      ops.push((ctx) => {
        ctx.fillStyle = C.panel;
        roundRect(ctx, PAD, boxTop, INNER, boxH, 16);
        ctx.fill();
        ctx.fillStyle = C.warn;
        ctx.fillRect(PAD, boxTop, 5, boxH);
      });
      y += 24;
      text(ch.archetype.history, { size: 27, color: C.text, x: PAD + 32, width: INNER - 56, lineHeight: 1.4, maxLines: 7 });
      y = boxTop + boxH;
    }

    // Rules.
    heading('Rules');
    ch.coreRules.concat(ch.rules).forEach((rule, i) => {
      const top = y;
      const core = i < ch.coreRules.length;
      ops.push((ctx) => {
        ctx.fillStyle = core ? diff : C.muted;
        ctx.beginPath();
        ctx.arc(PAD + 9, top + 20, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      y += text(rule.text, { size: 30, x: PAD + 36, width: INNER - 36 });
      y += 14;
    });

    // Roadmap (seasons left blank in a hand-written challenge are skipped).
    const seasons = ch.roadmap.filter((season) => season.objectives.length || season.events.length);
    if (seasons.length) heading(ch.mode === 'player' ? 'Career roadmap' : 'Season roadmap');
    seasons.forEach((season) => {
      const top = y;
      ops.push((ctx) => {
        ctx.strokeStyle = diff;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(PAD + 30, top + 26, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.text;
        ctx.font = font(800, 24);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`S${season.season}`, PAD + 30, top + 27);
        ctx.textAlign = 'left';
        if (season.age) {
          ctx.fillStyle = C.muted;
          ctx.font = font(600, 19);
          ctx.fillText(`age ${season.age}`, PAD + 2, top + 72);
        }
      });
      const x = PAD + 84;
      const width = INNER - 84;
      y += 10;
      season.objectives.forEach((o) => {
        y += o.type === 'main'
          ? text(o.text, { weight: 700, size: 30, x, width })
          : text(`+ ${o.text}`, { size: 27, color: C.muted, x, width });
        y += 6;
      });
      season.events.forEach((e) => {
        const ev = FC26.generator.splitEvent(e);
        y += text(`${ev.icon} ${e}`, { size: 26, color: ev.when ? C.hot : C.warn, x, width });
        y += 6;
      });
      y = Math.max(y, top + (season.age ? 96 : 64)) + 18;
    });

    // Final goal.
    y += 28;
    measure.font = font(800, 34);
    const goalLines = wrap(measure, ch.finalGoal, INNER - 64).length;
    const goalTop = y;
    const goalH = goalLines * Math.round(34 * 1.3) + 108;
    ops.push((ctx) => {
      const g = ctx.createLinearGradient(PAD, goalTop, W - PAD, goalTop + goalH);
      g.addColorStop(0, 'rgba(255, 201, 77, 0.18)');
      g.addColorStop(1, 'rgba(25, 230, 140, 0.10)');
      ctx.fillStyle = g;
      roundRect(ctx, PAD, goalTop, INNER, goalH, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 201, 77, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    y += 30;
    y += text('🏆  FINAL GOAL', { weight: 800, size: 24, color: C.warn, x: PAD + 32 });
    y += 12;
    text(ch.finalGoal, { weight: 800, size: 34, x: PAD + 32, width: INNER - 64, lineHeight: 1.3 });
    y = goalTop + goalH;

    // Footer.
    y += 40;
    const footer = [siteLabel, ch.custom ? 'custom challenge' : `seed ${ch.seed}`].filter(Boolean).join('  ·  ');
    y += text(footer, { weight: 600, size: 24, color: C.muted });
    y += PAD - 20;

    return { height: Math.ceil(y), ops };
  }

  function render(ch, siteLabel) {
    const { height, ops } = layout(ch, siteLabel);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, height);
    const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 900);
    glow.addColorStop(0, 'rgba(25, 230, 140, 0.12)');
    glow.addColorStop(1, 'rgba(25, 230, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, height);
    ops.forEach((op) => {
      ctx.save();
      op(ctx);
      ctx.restore();
    });
    return canvas;
  }

  const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 60) || 'challenge';

  /**
   * Render the challenge and hand it to the user: the share sheet on phones
   * that support sharing files, otherwise a download.
   */
  function exportImage(ch, siteLabel) {
    return deliver(render(ch, siteLabel), `fc26-${slug(ch.title)}.png`, ch.title);
  }

  // ---------- Season card: your results, story-sized for TikTok / Instagram ----------

  /** One line of text cut to fit, with an ellipsis. */
  function fit(ctx, str, maxWidth) {
    let t = String(str || '');
    if (ctx.measureText(t).width <= maxWidth) return t;
    while (t && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
  }

  /**
   * Draw a save's results on a 1080×1920 card.
   * d: { title, club, league, icon, difficulty, difficultyName, seasonLabel, handle, site,
   *      stats: { done, total, score, proven, trophies, transfers },
   *      seasons: [{ season, finish, trophies, done, total }], objectives: [{ text, done }], rules: [text] }
   */
  function renderSeason(d) {
    const H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const diff = C.diff[(Number(d.difficulty) || 2) - 1] || C.accent;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0e1a14');
    bg.addColorStop(0.45, C.bg);
    bg.addColorStop(1, '#0a0d12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.8, 120, 0, W * 0.8, 120, 900);
    glow.addColorStop(0, 'rgba(25, 230, 140, 0.22)');
    glow.addColorStop(1, 'rgba(25, 230, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // Brand
    let y = 120;
    roundRect(ctx, PAD, y - 62, 150, 80, 22);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = font(900, 46, 'italic');
    ctx.fillText('FC26', PAD + 18, y - 6);
    ctx.fillStyle = C.muted;
    ctx.font = font(700, 30);
    ctx.fillText('CAREER CHALLENGE', PAD + 180, y - 30);
    ctx.fillStyle = C.text;
    ctx.font = font(600, 30);
    ctx.fillText(fit(ctx, d.handle ? `@${d.handle}` : 'My save', INNER - 180), PAD + 180, y + 8);

    // Club and challenge
    y += 150;
    ctx.fillStyle = diff;
    ctx.font = font(800, 30);
    ctx.fillText(`${d.icon || '⚽'}  ${String(d.difficultyName || '').toUpperCase()}`, PAD, y);
    y += 100;
    ctx.fillStyle = C.text;
    let size = 96;
    ctx.font = font(900, size);
    while (size > 54 && ctx.measureText(d.club).width > INNER) { size -= 4; ctx.font = font(900, size); }
    ctx.fillText(fit(ctx, String(d.club || '').toUpperCase(), INNER), PAD, y);
    y += 62;
    ctx.fillStyle = C.muted;
    ctx.font = font(600, 36);
    ctx.fillText(fit(ctx, d.title, INNER), PAD, y);
    y += 50;
    ctx.font = font(500, 30);
    ctx.fillText(fit(ctx, [d.league, d.seasonLabel].filter(Boolean).join('  ·  '), INNER), PAD, y);

    // Big numbers
    y += 60;
    const s = d.stats || {};
    const tiles = [
      ['✅', `${s.done || 0}/${s.total || 0}`, 'objectives'],
      ['🏆', s.trophies || 0, 'trophies'],
      ['⭐', s.score || 0, 'score'],
      ['📸', s.proven || 0, 'proven pts'],
      ['🔁', s.transfers || 0, 'transfers'],
      ['📅', (d.seasons || []).filter((x) => x.finish).length, 'seasons logged'],
    ];
    const tw = (INNER - 2 * 24) / 3;
    const th = 200;
    tiles.forEach(([icon, value, label], i) => {
      const x = PAD + (i % 3) * (tw + 24);
      const ty = y + Math.floor(i / 3) * (th + 24);
      roundRect(ctx, x, ty, tw, th, 28);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = font(400, 40);
      ctx.fillText(icon, x + 28, ty + 62);
      ctx.fillStyle = C.text;
      ctx.font = font(900, 64);
      ctx.fillText(fit(ctx, String(value), tw - 56), x + 28, ty + 140);
      ctx.fillStyle = C.muted;
      ctx.font = font(600, 26);
      ctx.fillText(label, x + 28, ty + 178);
    });
    y += th * 2 + 24 + 70;

    // Season by season
    const rows = (d.seasons || []).slice(0, 6);
    if (rows.length) {
      ctx.fillStyle = C.accent;
      ctx.font = font(800, 30);
      ctx.fillText('SEASON BY SEASON', PAD, y);
      y += 24;
      rows.forEach((r) => {
        roundRect(ctx, PAD, y, INNER, 74, 18);
        ctx.fillStyle = C.panel2;
        ctx.fill();
        ctx.fillStyle = C.muted;
        ctx.font = font(700, 28);
        ctx.fillText(`S${r.season}`, PAD + 26, y + 48);
        ctx.fillStyle = C.text;
        ctx.font = font(700, 32);
        ctx.fillText(fit(ctx, r.finish || '–', 420), PAD + 110, y + 49);
        ctx.font = font(600, 30);
        const right = `${r.trophies ? `${'🏆'.repeat(Math.min(r.trophies, 4))}${r.trophies > 4 ? `×${r.trophies}` : ''}  ` : ''}${r.done}/${r.total} ✅`;
        ctx.fillText(right, PAD + INNER - 26 - ctx.measureText(right).width, y + 49);
        y += 88;
      });
      y += 30;
    }

    // This season's objectives
    const objs = (d.objectives || []).slice(0, 5);
    if (objs.length && y < H - 420) {
      ctx.fillStyle = C.accent;
      ctx.font = font(800, 30);
      ctx.fillText('OBJECTIVES', PAD, y);
      y += 52;
      objs.forEach((o) => {
        if (y > H - 330) return;
        ctx.font = font(500, 32);
        ctx.fillStyle = o.done ? C.accent : C.muted;
        ctx.fillText(o.done ? '✓' : '○', PAD, y);
        ctx.fillStyle = o.done ? C.text : C.muted;
        ctx.fillText(fit(ctx, o.text, INNER - 56), PAD + 56, y);
        y += 52;
      });
    }

    // The rules, in whatever room is left
    const rules = d.rules || [];
    if (rules.length && y < H - 480) {
      y += 30;
      ctx.fillStyle = C.accent;
      ctx.font = font(800, 30);
      ctx.fillText('HOUSE RULES', PAD, y);
      y += 52;
      rules.forEach((r) => {
        if (y > H - 330) return;
        ctx.font = font(500, 30);
        ctx.fillStyle = C.warn;
        ctx.fillText('•', PAD + 4, y);
        ctx.fillStyle = C.text;
        ctx.fillText(fit(ctx, r, INNER - 56), PAD + 56, y);
        y += 50;
      });
    }

    // Call to action: the site
    const by = H - 230;
    roundRect(ctx, PAD, by, INNER, 150, 34);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = font(900, 40);
    ctx.fillText('Get your own challenge 👇', PAD + 40, by + 62);
    ctx.font = font(700, 32);
    ctx.fillText(fit(ctx, d.site || '', INNER - 80), PAD + 40, by + 112);
    return canvas;
  }

  /** Hand a canvas to the user: share sheet on phones that can share files, else a download. */
  async function deliver(canvas, name, title) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create the image');
    const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
    const coarse = root.matchMedia && root.matchMedia('(pointer: coarse)').matches;
    if (file && coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'downloaded';
  }

  /** The season card, shared or downloaded. */
  function exportSeason(d) {
    return deliver(renderSeason(d), `fc26-season-${slug(d.club)}.png`, `${d.club}: ${d.title}`);
  }

  FC26.shareImage = { render, exportImage, renderSeason, exportSeason };
})(typeof window !== 'undefined' ? window : globalThis);
