export const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UP Student Protest Portal</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      :root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color-scheme: light; }
      body { margin: 0; background: #f8fafc; color: #0f172a; }
      main { max-width: 760px; margin: 0 auto; padding: 1.25rem; }
      .card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 4px 16px rgba(15,23,42,.08); margin-bottom: 1rem; }
      .row { display: grid; gap: .5rem; margin-bottom: .75rem; }
      label { font-weight: 600; }
      input, select, button { font: inherit; padding: .6rem .75rem; border-radius: 8px; border: 1px solid #cbd5e1; }
      button { cursor: pointer; border: none; background: #1d4ed8; color: white; font-weight: 600; }
      button:disabled { opacity: .6; cursor: not-allowed; }
      .muted { color: #475569; font-size: .9rem; }
      .hidden { display: none; }
      #card-preview { border: 1px dashed #94a3b8; border-radius: 12px; padding: 1rem; background: linear-gradient(120deg,#dbeafe,#ecfeff); }
      ul { padding-left: 1rem; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>Anonymous Student Protest Portal</h1>
        <p id="tally" aria-live="polite">Loading tally…</p>
        <p id="updated" class="muted">Last updated: —</p>
      </section>

      <section class="card" id="vote-section">
        <h2>Cast your anonymous vote</h2>
        <form id="vote-form">
          <div class="row">
            <label for="college">College</label>
            <select id="college" required>
              <option value="">Select your college</option>
            </select>
          </div>

          <div class="row">
            <label>Human verification</label>
            <div
              class="cf-turnstile"
              data-sitekey="1x00000000000000000000AA"
              data-action="vote"
              data-callback="onTurnstileSuccess"
              data-expired-callback="onTurnstileExpired"
              data-error-callback="onTurnstileError"
            ></div>
            <p class="muted">Complete verification before submitting your vote.</p>
          </div>

          <input id="website" class="hidden" tabindex="-1" autocomplete="off" />

          <button id="submit-btn" type="submit" disabled>Cast My Anonymous Vote</button>
          <p id="vote-message" class="muted" aria-live="polite"></p>
        </form>
      </section>

      <section class="card hidden" id="share-section">
        <h2>Thanks for raising your voice</h2>
        <p>Customize your share card locally (never sent to backend).</p>
        <div class="row">
          <label for="card-name">Name for card preview</label>
          <input id="card-name" maxlength="32" placeholder="Your name (local only)" />
        </div>
        <div id="card-preview">
          <h3 id="card-title">I stand with UP students</h3>
          <p id="card-subtitle">College: —</p>
          <p>Uniform rule rollback now ✊</p>
        </div>
        <button id="download-card" type="button">Download Card (PNG)</button>
        <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
          <a id="share-whatsapp" href="#" target="_blank" rel="noreferrer">Share on WhatsApp</a>
          <a id="share-x" href="#" target="_blank" rel="noreferrer">Share on X</a>
        </div>
      </section>

      <section class="card">
        <h2>Top colleges</h2>
        <ul id="leaderboard"></ul>
      </section>
    </main>

    <script>
      const votedKey = 'voted';
      const tokenKey = 'vote_token';
      const voteForm = document.getElementById('vote-form');
      const voteSection = document.getElementById('vote-section');
      const shareSection = document.getElementById('share-section');
      const tallyEl = document.getElementById('tally');
      const updatedEl = document.getElementById('updated');
      const collegeEl = document.getElementById('college');
      const websiteEl = document.getElementById('website');
      const submitBtn = document.getElementById('submit-btn');
      const voteMessageEl = document.getElementById('vote-message');
      const leaderboardEl = document.getElementById('leaderboard');
      const cardNameEl = document.getElementById('card-name');
      const cardTitleEl = document.getElementById('card-title');
      const cardSubtitleEl = document.getElementById('card-subtitle');
      const downloadCardEl = document.getElementById('download-card');
      const shareWhatsAppEl = document.getElementById('share-whatsapp');
      const shareXEl = document.getElementById('share-x');

      let turnstileToken = '';

      if (!localStorage.getItem(tokenKey)) {
        localStorage.setItem(tokenKey, crypto.randomUUID() + crypto.randomUUID());
      }

      function alreadyVoted() {
        return localStorage.getItem(votedKey) === 'true';
      }

      function setVotedState() {
        voteSection.classList.add('hidden');
        shareSection.classList.remove('hidden');
      }

      function syncSubmitState() {
        submitBtn.disabled = alreadyVoted() || !collegeEl.value || !turnstileToken;
      }

      window.onTurnstileSuccess = function (token) {
        turnstileToken = token;
        voteMessageEl.textContent = '';
        syncSubmitState();
      };

      window.onTurnstileExpired = function () {
        turnstileToken = '';
        voteMessageEl.textContent = 'Human verification expired. Please retry.';
        syncSubmitState();
      };

      window.onTurnstileError = function () {
        turnstileToken = '';
        voteMessageEl.textContent = 'Human verification failed. Please retry.';
        syncSubmitState();
      };

      async function loadColleges() {
        const res = await fetch('/api/colleges');
        const data = await res.json();
        for (const college of data.rows || []) {
          const option = document.createElement('option');
          option.value = String(college.id);
          option.textContent = college.college_name + ' (' + college.district + ')';
          collegeEl.append(option);
        }
      }

      async function loadTally() {
        const res = await fetch('/api/tally');
        const data = await res.json();
        tallyEl.textContent = 'Total protest votes: ' + (data.global_total || 0);
        updatedEl.textContent = 'Last updated: ' + new Date(data.updated_at).toLocaleTimeString();
      }

      async function loadLeaderboard() {
        const res = await fetch('/api/leaderboard?limit=10');
        const data = await res.json();
        leaderboardEl.innerHTML = '';
        for (const row of data.rows || []) {
          const li = document.createElement('li');
          li.textContent = row.college_name + ' — ' + row.vote_count;
          leaderboardEl.append(li);
        }
      }

      function updateShareLinks(collegeText) {
        const text = 'I just cast my anonymous protest vote from ' + collegeText + '. Join the movement: ' + location.origin;
        shareWhatsAppEl.href = 'https://wa.me/?text=' + encodeURIComponent(text);
        shareXEl.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
      }

      collegeEl.addEventListener('change', syncSubmitState);

      voteForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (!collegeEl.value || !turnstileToken) {
          voteMessageEl.textContent = 'Please select a college and complete human verification.';
          return;
        }

        submitBtn.disabled = true;
        voteMessageEl.textContent = 'Submitting...';

        const payload = {
          college_id: Number(collegeEl.value),
          submission_id: crypto.randomUUID(),
          voter_token: localStorage.getItem(tokenKey),
          cf_turnstile_response: turnstileToken,
          website: websiteEl.value,
        };

        let data;
        try {
          const res = await fetch('/api/vote', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          data = await res.json();
        } catch {
          voteMessageEl.textContent = 'Network error. Please retry.';
          if (window.turnstile) window.turnstile.reset();
          turnstileToken = '';
          syncSubmitState();
          return;
        }

        if (data.ok) {
          localStorage.setItem(votedKey, 'true');
          voteMessageEl.textContent = data.message;
          cardSubtitleEl.textContent = 'College: ' + collegeEl.options[collegeEl.selectedIndex].textContent;
          updateShareLinks(collegeEl.options[collegeEl.selectedIndex].textContent);
          setVotedState();
          await Promise.all([loadTally(), loadLeaderboard()]);
          return;
        }

        voteMessageEl.textContent = (data && data.error && data.error.message) || 'Vote failed. Please retry.';
        turnstileToken = '';
        if (window.turnstile) window.turnstile.reset();
        syncSubmitState();
      });

      cardNameEl.addEventListener('input', function () {
        const safe = (cardNameEl.value || '').trim().slice(0, 32);
        cardTitleEl.textContent = safe ? safe + ' stands with UP students' : 'I stand with UP students';
      });

      downloadCardEl.addEventListener('click', function () {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 64px sans-serif';
        ctx.fillText(cardTitleEl.textContent.slice(0, 44), 80, 200);
        ctx.font = '42px sans-serif';
        ctx.fillText(cardSubtitleEl.textContent.slice(0, 60), 80, 300);
        ctx.fillText('Uniform rule rollback now ✊', 80, 380);
        const link = document.createElement('a');
        link.download = 'up-protest-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });

      updateShareLinks('my college');
      Promise.all([loadColleges(), loadTally(), loadLeaderboard()]);
      setInterval(function () {
        loadTally();
        loadLeaderboard();
      }, 15000);

      if (alreadyVoted()) {
        setVotedState();
      } else {
        syncSubmitState();
      }
    </script>
  </body>
</html>
`;
