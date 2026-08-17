# Setting up anthony@anthonyellis.dev

The site and the résumé both advertise **anthony@anthonyellis.dev**. Until you finish
step 2 below, mail sent to that address bounces — so do this before you hand the résumé
to anyone.

Plan: **Cloudflare Email Routing** forwards anything sent to your domain into your
existing Gmail inbox, free, forever. Receiving is the part that matters on day one.
Sending *from* the address is a separate step (step 3) and can wait a day.

---

## Step 0 — find out where your DNS lives

Cloudflare Email Routing requires your domain's **nameservers** to point at Cloudflare.
That's free, but it means moving DNS from wherever it is now (Namecheap, Porkbun,
Squarespace/Google Domains, Cloudflare already, etc.).

Look up whoever you bought `anthonyellis.dev` from and log in.

- **Already on Cloudflare?** Skip to step 2.
- **Somewhere else, and they offer free email forwarding?** (Porkbun and Namecheap do.)
  That is the lower-risk path — turn on their forwarding, point `anthony@` at your Gmail,
  and skip steps 1–2 entirely.
- **Otherwise:** do step 1.

---

## Step 1 — move DNS to Cloudflare (only if you need to)

⚠️ **This is the step that can take your site down if rushed.** Moving nameservers means
Cloudflare's DNS records replace your registrar's, and if the GitHub Pages records aren't
there, `anthonyellis.dev` stops resolving.

1. Before you touch anything, **screenshot your current DNS records** at your registrar.
2. Create a free Cloudflare account, "Add a site", enter `anthonyellis.dev`. Cloudflare
   scans and imports your existing records — check the imported list against your
   screenshot.
3. Make sure these exist (this is what GitHub Pages needs for an apex domain):

   | Type  | Name              | Value                  |
   |-------|-------------------|------------------------|
   | A     | anthonyellis.dev  | 185.199.108.153        |
   | A     | anthonyellis.dev  | 185.199.109.153        |
   | A     | anthonyellis.dev  | 185.199.110.153        |
   | A     | anthonyellis.dev  | 185.199.111.153        |
   | AAAA  | anthonyellis.dev  | 2606:50c0:8000::153    |
   | AAAA  | anthonyellis.dev  | 2606:50c0:8001::153    |
   | AAAA  | anthonyellis.dev  | 2606:50c0:8002::153    |
   | AAAA  | anthonyellis.dev  | 2606:50c0:8003::153    |
   | CNAME | www               | anthonyellisdev.github.io   |

4. Set the proxy status on those records to **DNS only** (grey cloud, not orange). GitHub
   Pages handles its own HTTPS; proxying adds a certificate failure mode you don't need.
5. Change the nameservers at your registrar to the two Cloudflare gives you. Propagation
   is usually minutes, occasionally a few hours.
6. **Verify the site still loads** at https://anthonyellis.dev before moving on.

---

## Step 2 — turn on Email Routing (receiving)

In the Cloudflare dashboard for the domain: **Email → Email Routing → Get started**.

1. Cloudflare offers to add its MX and TXT (SPF) records automatically. Let it.
2. Create a custom address: `anthony@anthonyellis.dev` → destination
   `ellisanthony1995@gmail.com`.
3. Cloudflare emails that Gmail address a verification link. Click it.
4. Optional but recommended: add a **catch-all** rule so anything `@anthonyellis.dev`
   also lands in your inbox. Typos in a recruiter's address then don't silently vanish.
5. Send yourself a test from another account. It should appear in Gmail within seconds.

At this point receiving works. If you stop here, you can still reply — it just goes out
from your Gmail address, which most people won't notice.

---

## Step 3 — sending *as* anthony@anthonyellis.dev (optional)

Cloudflare only receives; it has no outbound SMTP. Gmail's "Send mail as" needs an SMTP
server, so you need a free relay in between.

1. Sign up for a free SMTP relay — **Brevo** (300 emails/day) or **SMTP2GO**
   (1,000/month) are the usual picks. Create an SMTP key/password in their dashboard.
2. Gmail → **Settings → Accounts and Import → Send mail as → Add another email address**.
   - Name: `Anthony Ellis`
   - Email: `anthony@anthonyellis.dev`
   - Untick "Treat as an alias" only if you want replies handled separately; leaving it
     ticked is fine.
3. On the next screen enter the relay's SMTP host, port **587**, TLS, and the username /
   password from step 1.
4. Gmail sends a confirmation code to `anthony@anthonyellis.dev` — which Cloudflare
   forwards straight back into your inbox. Paste it in.
5. Set it as the default "From" if you want every new mail to go out as the domain
   address.

### The one caveat

Free relays sign mail with *their* domain, so some recipients see a small
"via smtp2go.com" next to your name. It's cosmetic, and Gmail shows it in a place most
people never look. If it ever bothers you, adding DKIM records for the relay in
Cloudflare DNS removes it — the relay's docs will give you the exact records.

---

## If you'd rather pay and skip all of this

**Google Workspace Business Starter** (roughly $6–8/user/month) gives you a real Gmail
account on the domain: sending, receiving, mobile apps and calendar all work with no
relay and no "via". If the free path starts eating an evening, that's the escape hatch.
