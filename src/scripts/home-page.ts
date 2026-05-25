const votedKey = 'up_uniform_voted';
const tokenKey = 'up_uniform_vote_token';
const votedInstitutionKey = 'up_uniform_voted_institution';
const collegesVersion = '2026-05-23-uni-list';
const defaultTurnstileSiteKey = '1x00000000000000000000AA';
const defaultTurnstileAction = 'vote';

const tallyEl = document.getElementById('tally');
const updatedEl = document.getElementById('updated');
const leaderboardEl = document.getElementById('leaderboard');

const voteForm = document.getElementById('vote-form');
const voteShell = document.getElementById('vote-shell');
const voteSuccessEl = document.getElementById('vote-success');
const voteMessageEl = document.getElementById('vote-message');
const submitBtn = document.getElementById('submit-btn');
const websiteEl = document.getElementById('website');

const institutionSearchEl = document.getElementById('institution-search');
const institutionHintEl = document.getElementById('institution-hint');
const collegeIdEl = document.getElementById('college-id');
const institutionResultsEl = document.getElementById('institution-results');

const shareSectionEl = document.getElementById('share-section');
const cardPreviewEl = document.getElementById('card-preview');
const cardNameEl = document.getElementById('card-name');
const cardTitleEl = document.getElementById('card-title');
const cardSubtitleEl = document.getElementById('card-subtitle');
const cardCollegeEl = document.getElementById('card-college');
const cardLinkEl = document.getElementById('card-link');
const downloadCardEl = document.getElementById('download-card');
const shareInstagramEl = document.getElementById('share-instagram');
const shareXEl = document.getElementById('share-x');
const footerInstagramEl = document.getElementById('footer-ig-link');
const contactRevealBtn = document.getElementById('contact-reveal-btn');
const contactEmailEl = document.getElementById('contact-email');
const xTemplateEl = document.getElementById('x-template');
const igTemplateEl = document.getElementById('ig-template');
const leaderboardSearchEl = document.getElementById('leaderboard-search');
const leaderboardNoResultEl = document.getElementById('leaderboard-no-result');

let turnstileToken = '';
let turnstileSiteKey = defaultTurnstileSiteKey;
let turnstileAction = defaultTurnstileAction;
let colleges = [];
let visibleMatches = [];
let activeMatchIndex = -1;
let selectedCollege = null;
let currentCounter = 0;
let previousCounterDisplay = '[ 0 ]';
let leaderboardData = [];

if (!localStorage.getItem(tokenKey)) {
  localStorage.setItem(tokenKey, crypto.randomUUID() + crypto.randomUUID());
}

function alreadyVoted() {
  return localStorage.getItem(votedKey) === 'true';
}

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function formatCounter(value) {
  return '[ ' + Number(value || 0).toLocaleString('en-IN') + ' ]';
}

function renderCounter(displayValue) {
  tallyEl.innerHTML = '';

  Array.from(displayValue).forEach((char) => {
    if (char >= '0' && char <= '9') {
      const digit = parseInt(char);
      const roll = document.createElement('span');
      roll.className = 'counter-roll';

      const track = document.createElement('span');
      track.className = 'counter-roll-track';
      for (let i = 0; i <= 9; i++) {
        const d = document.createElement('span');
        d.textContent = i;
        track.append(d);
      }
      track.style.transform = 'translateY(-' + (digit * 1.02) + 'em)';

      roll.append(track);
      tallyEl.append(roll);
    } else {
      const span = document.createElement('span');
      span.className = 'counter-char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      tallyEl.append(span);
    }
  });

  previousCounterDisplay = displayValue;
}

function bumpCounter(value) {
  const next = Number(value || 0);
  const displayValue = formatCounter(next);
  if (next !== currentCounter) {
    tallyEl.classList.remove('bump');
    void tallyEl.offsetWidth;
    tallyEl.classList.add('bump');
  }
  currentCounter = next;
  renderCounter(displayValue);
}

function closeResultList() {
  institutionResultsEl.classList.add('hidden');
  institutionSearchEl.setAttribute('aria-expanded', 'false');
}

function openResultList() {
  institutionResultsEl.classList.remove('hidden');
  institutionSearchEl.setAttribute('aria-expanded', 'true');
}

function setActiveResult(index) {
  activeMatchIndex = index;
  const options = institutionResultsEl.querySelectorAll('button[role="option"]');
  options.forEach((option, optionIndex) => {
    option.setAttribute('aria-selected', optionIndex === activeMatchIndex ? 'true' : 'false');
  });
}

const otherCollege = { id: 999, label: 'Other / General Public', normalized: 'other general public' };

function renderResultList(matches) {
  institutionResultsEl.innerHTML = '';

  if (matches.length) {
    matches.forEach((college, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', index === activeMatchIndex ? 'true' : 'false');
      button.textContent = college.label;
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectCollege(college);
      });
      button.addEventListener('click', () => {
        selectCollege(college);
      });
      li.append(button);
      institutionResultsEl.append(li);
    });
  } else {
    const empty = document.createElement('li');
    empty.className = 'result-empty';
    empty.textContent = 'Campus not found? Pick the university it is affiliated to, or select Other below.';
    institutionResultsEl.append(empty);
  }

  const sep = document.createElement('li');
  sep.className = 'result-separator';
  institutionResultsEl.append(sep);

  const otherLi = document.createElement('li');
  const otherBtn = document.createElement('button');
  otherBtn.type = 'button';
  otherBtn.setAttribute('role', 'option');
  otherBtn.className = 'result-other';
  otherBtn.textContent = otherCollege.label;
  otherBtn.addEventListener('mousedown', (event) => {
    event.preventDefault();
    selectCollege(otherCollege);
  });
  otherBtn.addEventListener('click', () => {
    selectCollege(otherCollege);
  });
  otherLi.append(otherBtn);
  institutionResultsEl.append(otherLi);

  openResultList();
}

function selectCollege(college) {
  selectedCollege = college;
  collegeIdEl.value = String(college.id);
  institutionSearchEl.value = college.label;
  institutionHintEl.textContent = 'Selected: ' + college.label;
  visibleMatches = [];
  activeMatchIndex = -1;
  closeResultList();
  syncSubmitState();
}

function clearSelectedCollege() {
  selectedCollege = null;
  collegeIdEl.value = '';
  institutionHintEl.textContent = 'Start typing to filter colleges, or choose Other if not listed.';
}

function syncSubmitState() {
  submitBtn.disabled = alreadyVoted();
  submitBtn.classList.toggle('is-ready', Boolean(selectedCollege && turnstileToken));
}

function buildXText(link) {
  return [
    'University is NOT school. Mandatory uniforms for adult scholars invite public mockery and impose daily laundry penalties on hostel students.',
    '',
    'We are scholars, not schoolchildren.',
    'https://nouniformcampusup.me/',
    '#NoToUPCollegeUniform #MyCampusMyChoice #AdultsNotKids',
  ].join('\n');
}

function buildInstagramCaption(_link) {
  return 'Cast your vote. nouniformcampusup.me #NoToUPCollegeUniform';
}

function updateSharePayload(institutionLabel) {
  const link = location.href;
  const displayLink = location.host || link;
  const xText = buildXText(link);
  const igCaption = buildInstagramCaption(link);
  const displayLabel = institutionLabel === 'Other / General Public' ? 'Sovereign Citizen' : institutionLabel;

  cardSubtitleEl.textContent = cardNameEl.value.trim() || 'Your Name';
  cardCollegeEl.textContent = displayLabel;
  if (cardLinkEl) {
    cardLinkEl.textContent = displayLink;
  }
  xTemplateEl.textContent = xText;
  igTemplateEl.textContent = igCaption;
  shareXEl.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(xText);
}

function revealSuccess(institutionLabel) {
  voteShell.classList.add('is-submitted');
  voteForm.addEventListener(
    'animationend',
    () => {
      voteForm.classList.add('hidden');
    },
    { once: true },
  );
  voteSuccessEl.classList.remove('hidden');
  shareSectionEl.classList.remove('hidden');
  localStorage.setItem(votedInstitutionKey, institutionLabel);
  updateSharePayload(institutionLabel);
}

function initializeVotedExperience() {
  voteForm.classList.add('hidden');
  voteSuccessEl.classList.remove('hidden');
  shareSectionEl.classList.remove('hidden');
  const savedInstitution = localStorage.getItem(votedInstitutionKey) || 'Your institution';
  updateSharePayload(savedInstitution);
}

async function loadColleges() {
  const response = await fetch('/api/colleges?v=' + collegesVersion);
  const data = await response.json();
  colleges = (data.rows || []).map((row) => {
    const label = row.college_name + (row.district ? ', ' + row.district : '');
    return {
      id: Number(row.id),
      label,
      normalized: normalizeText(label),
    };
  });
}

async function loadTally() {
  try {
    const response = await fetch('/api/tally');
    const data = await response.json();
    bumpCounter(data.global_total || 0);
    const updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
    updatedEl.textContent =
      'Last verified update at ' +
      updatedAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Kolkata',
      }) + ' IST';
  } catch {
    updatedEl.textContent = 'Live update temporarily unavailable';
  }
}

function renderLeaderboardRows(rows, maxVotes, query) {
  leaderboardEl.innerHTML = '';
  leaderboardNoResultEl.classList.add('hidden');

  const countEl = document.getElementById('lb-search-count');
  if (countEl) {
    countEl.textContent = rows.length ? rows.length + ' institution' + (rows.length > 1 ? 's' : '') + ' found' : '';
  }

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'lb-row';
    empty.innerHTML = '<div class="lb-cell" style="text-align:center;color:var(--muted)">—</div><div class="lb-cell" style="color:var(--muted)">No votes yet. Your campus could be first.</div><div class="lb-cell" style="text-align:center;color:var(--muted)">0</div>';
    leaderboardEl.append(empty);
    return;
  }

  const topVotes = maxVotes || Number(rows[0].vote_count || 0);

  rows.forEach((row, index) => {
    const votes = Number(row.vote_count || 0);
    const pct = topVotes > 0 ? Math.max((votes / topVotes) * 100, 2) : 0;
    const label = row.college_name + (row.district ? ', ' + row.district : '');
    const rank = row._rank !== undefined ? row._rank : index + 1;

    const el = document.createElement('div');
    var topClass = '';
    if (rank === 1) topClass = ' top-1';
    else if (rank === 2) topClass = ' top-2';
    else if (rank === 3) topClass = ' top-3';
    el.className = 'lb-row' + topClass;

    var displayLabel = label;
    if (query) {
      var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      displayLabel = label.replace(re, '<mark>$1</mark>');
    }

    el.innerHTML =
      '<div class="lb-cell lb-rank">#' + rank + '</div>' +
      '<div class="lb-cell lb-info-cell">' +
        '<div class="lb-name">' + displayLabel + '</div>' +
        '<div class="lb-bar-track"><div class="lb-bar-fill" style="width: ' + pct + '%"></div></div>' +
      '</div>' +
      '<div class="lb-cell lb-votes">' + votes.toLocaleString('en-IN') + '</div>';
    leaderboardEl.append(el);
  });
}

async function loadLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard?limit=5');
    const data = await response.json();
    leaderboardData = (data.rows || []).map((row, index) => ({
      ...row,
      _rank: index + 1,
      _label: (row.college_name + (row.district ? ', ' + row.district : '')).toLowerCase(),
    }));
    const query = (leaderboardSearchEl.value || '').trim().toLowerCase();
    if (query) {
      filterLeaderboard(query);
    } else {
      renderLeaderboardRows(leaderboardData);
    }
  } catch {
    leaderboardEl.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'lb-row';
    empty.innerHTML = '<div class="lb-cell" style="text-align:center;color:var(--muted)">—</div><div class="lb-cell" style="color:var(--muted)">Leaderboard unavailable right now.</div><div class="lb-cell" style="text-align:center;color:var(--muted)">—</div>';
    leaderboardEl.append(empty);
  }
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (typeof data.turnstile_site_key === 'string' && data.turnstile_site_key.trim()) {
      turnstileSiteKey = data.turnstile_site_key.trim();
    }

    if (typeof data.turnstile_action === 'string' && data.turnstile_action.trim()) {
      turnstileAction = data.turnstile_action.trim();
    }
  } catch {
    turnstileSiteKey = defaultTurnstileSiteKey;
    turnstileAction = defaultTurnstileAction;
  }
}

function filterLeaderboard(query) {
  if (!query) {
    renderLeaderboardRows(leaderboardData);
    leaderboardNoResultEl.classList.add('hidden');
    return;
  }

  const maxVotes = leaderboardData.length ? Number(leaderboardData[0].vote_count || 0) : 0;
  const filtered = leaderboardData.filter(row => row._label.includes(query));

  if (filtered.length) {
    renderLeaderboardRows(filtered, maxVotes, query);
    leaderboardNoResultEl.classList.add('hidden');
    autoScrollToRow(filtered, query);
  } else {
    leaderboardEl.innerHTML = '';
    leaderboardNoResultEl.classList.remove('hidden');
    leaderboardNoResultEl.innerHTML = 'Your college does not appear on the board yet. <a href="#vote-zone">Be the first from your campus to sign.</a>';
  }
}

function autoScrollToRow(rows, query) {
  var match = rows.find(function(r) { return r._label === query; });
  if (!match) return;
  var el = leaderboardEl.querySelector('.lb-name mark');
  if (el) {
    el.closest('.lb-row').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

var searchDebounce = null;
leaderboardSearchEl.addEventListener('input', function() {
  var query = (leaderboardSearchEl.value || '').trim().toLowerCase();
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(function() {
    filterLeaderboard(query);
  }, 150);
});

function renderTurnstile() {
  if (window.turnstile) {
    window.turnstile.render('#turnstile-widget', {
      sitekey: turnstileSiteKey,
      action: turnstileAction,
      callback: function (token) {
        turnstileToken = token;
        voteMessageEl.textContent = '';
        syncSubmitState();
      },
      'expired-callback': function () {
        turnstileToken = '';
        voteMessageEl.textContent = 'Human verification expired. Please verify again.';
        syncSubmitState();
      },
      'error-callback': function () {
        turnstileToken = '';
        voteMessageEl.textContent = 'Human verification failed. Please retry.';
        syncSubmitState();
      },
    });
  } else {
    setTimeout(renderTurnstile, 300);
  }
}

institutionSearchEl.addEventListener('input', () => {
  const query = institutionSearchEl.value.trim();

  if (!query) {
    clearSelectedCollege();
    visibleMatches = [];
    activeMatchIndex = -1;
    closeResultList();
    syncSubmitState();
    return;
  }

  if (selectedCollege && normalizeText(selectedCollege.label) === normalizeText(query)) {
    return;
  }

  clearSelectedCollege();
  const normalizedQuery = normalizeText(query);
  visibleMatches = colleges
    .filter((college) => college.normalized.includes(normalizedQuery) && college.id !== 999)
    .slice(0, 10);

  activeMatchIndex = visibleMatches.length ? 0 : -1;
  renderResultList(visibleMatches);
  syncSubmitState();
});

institutionSearchEl.addEventListener('focus', () => {
  const query = institutionSearchEl.value.trim();
  if (!query) return;

  const normalizedQuery = normalizeText(query);
  visibleMatches = colleges
    .filter((college) => college.normalized.includes(normalizedQuery) && college.id !== 999)
    .slice(0, 10);

  activeMatchIndex = visibleMatches.length ? 0 : -1;
  renderResultList(visibleMatches);
});

institutionSearchEl.addEventListener('blur', () => {
  setTimeout(() => closeResultList(), 120);
});

institutionSearchEl.addEventListener('keydown', (event) => {
  if (institutionResultsEl.classList.contains('hidden') || !visibleMatches.length) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const next = Math.min(activeMatchIndex + 1, visibleMatches.length - 1);
    setActiveResult(next);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    const next = Math.max(activeMatchIndex - 1, 0);
    setActiveResult(next);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    if (activeMatchIndex >= 0 && visibleMatches[activeMatchIndex]) {
      selectCollege(visibleMatches[activeMatchIndex]);
    }
    return;
  }

  if (event.key === 'Escape') {
    closeResultList();
  }
});

voteForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedCollege) {
    const typedValue = institutionSearchEl.value.trim();
    const normalizedTyped = normalizeText(typedValue);

    if (normalizedTyped) {
      const exactMatch = colleges.find((college) => college.normalized === normalizedTyped);
      const partialMatch = colleges.find((college) => college.normalized.includes(normalizedTyped));
      const fallbackMatch = visibleMatches[0];
      const resolved = exactMatch || partialMatch || fallbackMatch || null;
      if (resolved) {
        selectCollege(resolved);
      }
    }
  }

  if (!selectedCollege) {
    voteMessageEl.textContent = 'Select an institution first.';
    return;
  }

  if (!turnstileToken) {
    voteMessageEl.textContent = 'Complete human verification first.';
    return;
  }

  submitBtn.disabled = true;
  voteMessageEl.textContent = 'Registering your vote...';

  const payload = {
    college_id: Number(collegeIdEl.value),
    submission_id: crypto.randomUUID(),
    voter_token: localStorage.getItem(tokenKey),
    cf_turnstile_response: turnstileToken,
    website: websiteEl.value,
  };

  let data;
  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    data = await response.json();
  } catch {
    voteMessageEl.textContent = 'Network error. Please retry.';
    turnstileToken = '';
    if (window.turnstile) window.turnstile.reset();
    syncSubmitState();
    return;
  }

  if (data.ok) {
    localStorage.setItem(votedKey, 'true');
    voteMessageEl.textContent = '';
    revealSuccess(selectedCollege.label);
    await Promise.all([loadTally(), loadLeaderboard()]);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    shareSectionEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    return;
  }

  voteMessageEl.textContent = (data.error && data.error.message) || 'Vote failed. Please retry.';
  turnstileToken = '';
  if (window.turnstile) window.turnstile.reset();
  syncSubmitState();
});

cardNameEl.addEventListener('input', () => {
  const safe = (cardNameEl.value || '').trim().slice(0, 32);
  cardSubtitleEl.textContent = safe || 'Your Name';
});

let htmlToImageModulePromise;

function getHtmlToImageModule() {
  if (!htmlToImageModulePromise) {
    htmlToImageModulePromise = import('html-to-image');
  }
  return htmlToImageModulePromise;
}

async function renderCardPreviewToPng() {
  if (!cardPreviewEl) {
    throw new Error('Card preview element is unavailable.');
  }

  const { toPng } = await getHtmlToImageModule();
  const bounds = cardPreviewEl.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));

  return toPng(cardPreviewEl, {
    cacheBust: true,
    backgroundColor: '#09090b',
    width,
    height,
    canvasWidth: 1080,
    canvasHeight: 1080,
    pixelRatio: 2,
  });
}

async function renderCardPreviewFile() {
  const dataUrl = await renderCardPreviewToPng();
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], 'up-protest-card.png', { type: blob.type || 'image/png' });
  return { dataUrl, file };
}

downloadCardEl.addEventListener('click', async () => {
  const previousLabel = downloadCardEl.textContent;
  downloadCardEl.disabled = true;
  downloadCardEl.textContent = 'Rendering...';

  try {
    const dataUrl = await renderCardPreviewToPng();
    const link = document.createElement('a');
    link.download = 'up-protest-card.png';
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Card export failed', error);
  } finally {
    downloadCardEl.disabled = false;
    downloadCardEl.textContent = previousLabel;
  }
});

shareInstagramEl.addEventListener('click', async (event) => {
  event.preventDefault();
  if (shareInstagramEl.dataset.busy === 'true') return;

  const previousLabel = shareInstagramEl.textContent;
  shareInstagramEl.dataset.busy = 'true';
  shareInstagramEl.textContent = 'Preparing...';

  const caption = igTemplateEl.textContent || '';
  let dataUrl;
  let file;

  try {
    const result = await renderCardPreviewFile();
    dataUrl = result.dataUrl;
    file = result.file;
  } catch (error) {
    console.error('Instagram share render failed', error);
  }

  try {
    if (file && navigator.share) {
      const shareData = {
        files: [file],
        text: caption,
        title: 'No Uniforms in Colleges',
      };
      const canShareFiles = typeof navigator.canShare !== 'function' || navigator.canShare(shareData);
      if (canShareFiles) {
        await navigator.share(shareData);
        shareInstagramEl.textContent = 'Share opened';
        setTimeout(() => {
          shareInstagramEl.textContent = previousLabel;
          shareInstagramEl.dataset.busy = 'false';
        }, 2000);
        return;
      }
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      shareInstagramEl.textContent = previousLabel;
      shareInstagramEl.dataset.busy = 'false';
      return;
    }
    console.warn('Instagram share sheet failed', error);
  }

  try {
    if (!dataUrl) {
      dataUrl = await renderCardPreviewToPng();
    }
    const link = document.createElement('a');
    link.download = 'up-protest-card.png';
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Card export failed', error);
  }

  if (caption) {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      const temp = document.createElement('textarea');
      temp.value = caption;
      document.body.append(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
  }

  shareInstagramEl.textContent = 'Downloaded + Copied';
  setTimeout(() => {
    shareInstagramEl.textContent = previousLabel;
    shareInstagramEl.dataset.busy = 'false';
  }, 2200);
});

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const targetId = button.getAttribute('data-copy-target');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    const value = target.textContent || '';
    try {
      await navigator.clipboard.writeText(value);
      const previous = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = previous;
      }, 1800);
    } catch {
      const temp = document.createElement('textarea');
      temp.value = value;
      document.body.append(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
  });
});

const initialInstitution = localStorage.getItem(votedInstitutionKey) || 'Your institution';
updateSharePayload(initialInstitution);

loadRuntimeConfig().finally(() => {
  renderTurnstile();
});
Promise.all([loadColleges(), loadTally(), loadLeaderboard()]);
setInterval(() => {
  loadTally();
  loadLeaderboard();
}, 15000);

if (alreadyVoted()) {
  initializeVotedExperience();
} else {
  syncSubmitState();
}

const heroCtaEl = document.getElementById('hero-cta');
if (heroCtaEl) {
  heroCtaEl.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('vote-zone');
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });
}

const footerXLink = document.getElementById('footer-x-link');
if (footerXLink) {
  footerXLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (shareXEl && shareXEl.href && shareXEl.href !== '#') {
      window.open(shareXEl.href, '_blank', 'noopener,noreferrer');
    }
  });
}

if (footerInstagramEl) {
  footerInstagramEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (shareInstagramEl) {
      shareInstagramEl.click();
    }
  });
}

if (contactRevealBtn) {
  let contactTimer = null;
  let contactRevealed = false;

  contactRevealBtn.addEventListener('click', () => {
    if (contactRevealed) return;

    contactRevealBtn.disabled = true;
    let count = 20;
    contactRevealBtn.textContent = count;

    contactTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        contactRevealBtn.textContent = count;
      } else {
        clearInterval(contactTimer);
        contactRevealBtn.textContent = 'contact';
        contactRevealBtn.disabled = false;
        contactEmailEl.classList.remove('hidden');
        contactRevealed = true;
      }
    }, 1000);
  });
}

const sourceRevealBtn = document.getElementById('source-reveal-btn');
const sourceLinkEl = document.getElementById('source-link');

if (sourceRevealBtn) {
  let sourceTimer = null;
  let sourceRevealed = false;

  sourceRevealBtn.addEventListener('click', () => {
    if (sourceRevealed) return;

    sourceRevealBtn.disabled = true;
    let count = 30;
    sourceRevealBtn.textContent = count;

    sourceTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        sourceRevealBtn.textContent = count;
      } else {
        clearInterval(sourceTimer);
        sourceRevealBtn.textContent = 'source code';
        sourceRevealBtn.disabled = false;
        sourceLinkEl.classList.remove('hidden');
        sourceRevealed = true;
      }
    }, 1000);
  });
}
