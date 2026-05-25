# No Uniform in UP Colleges — Protest Portal

A protest card preview and anonymous voting platform against mandatory college uniforms in Uttar Pradesh. Students can cast a verified anonymous vote, download a shareable protest card, and spread the word on Instagram and X.

## How it works

Visitors select their college from a searchable directory, pass Cloudflare Turnstile (privacy-first CAPTCHA), and submit one anonymous vote per device. A protest card with their name and institution is generated on the fly for sharing.

### Security & Anti-Abuse

- **Cloudflare Turnstile** — replaces traditional CAPTCHA with a frictionless, privacy-preserving bot check. No tracking, no data collection, no image puzzles.
- **Device fingerprint** — a salted SHA-256 hash of browser fingerprint + IP is stored per vote. Duplicate submissions from the same device within a 24-hour window are rejected.
- **Secrets at the edge** — Turnstile secret key and vote token pepper are stored as Cloudflare Workers Secrets, never committed or exposed client-side.

### Scalability & Reliability

- **Cloudflare Workers** — the entire API runs on Cloudflare's global edge network (300+ locations). Near-zero cold starts, automatic scaling from 1 to millions of requests.
- **D1 (SQLite at the edge)** — each vote is a single row insert into D1, Cloudflare's serverless SQLite database. Reads are served from the nearest edge location via global replication; writes are coordinated through a single primary.
- **Queue-based projection** — vote events are pushed to a Cloudflare Queue and consumed asynchronously to update the tally and leaderboard, keeping the write path fast and the read path eventually consistent.

### Data Layer

Two D1 tables underpin the platform:

| Table | Purpose |
|---|---|
| `colleges_list` | Canonical list of all UP colleges + a catch-all "Other / General Public" row (id=999). Populated from seed data. |
| `votes` | Each row represents one verified vote: Turnstile token, device hash, selected college_id, and timestamp. |

Vote counts are maintained as a materialised projection (queue consumer) so leaderboard queries are a single fast read of ~100 rows rather than aggregate scans of the entire votes table.

Built with Astro, Hono, and Cloudflare Workers.


To the people who contacted me saying that my databse and kv cahed id are in public , please do some research u cant acces them aka exploit them without the account id , so i am good , ik its best proctice to put them as a env var but i was feeling lazy and it wont hurt now that they're already commited , I do not wanna roll my credentials and go through hassel so I am fine , thanks for ur concerns tho ...