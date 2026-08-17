# Fixing the custom domain

**What happened:** the repo was recreated from scratch, so the `CNAME` file went with it.
That one file is what tells GitHub Pages "serve this repo at anthonyellis.dev". Without it,
Pages falls back to the project URL — and because every asset path in this site starts with
`/`, the site does not work correctly at a `/portfolio/` sub-path either. So the domain
looks broken even though every other file is fine.

**Good news:** nothing is lost. Your DNS records live at your registrar, not on GitHub, so
they were never touched. This is a one-file, two-minute fix.

---

## The fix (do it through the GitHub UI — it does more than the file alone)

1. Go to the repo → **Settings → Pages**.
2. Under **Custom domain**, type `anthonyellis.dev` and hit **Save**.
3. GitHub commits a `CNAME` file for you, re-runs its DNS check, and re-issues the HTTPS
   certificate.
4. Wait for the green "DNS check successful". If it complains, give it a few minutes and
   press Save again — the check is impatient, not wrong.
5. Once the certificate is issued, tick **Enforce HTTPS**. That box may stay greyed out for
   up to an hour while the cert is provisioned. This is normal; don't panic and don't
   remove the domain to "reset" it — that is what starts the loop over.

This zip also contains a `CNAME` file, so if you unzip it and push, the domain is restored
that way too. The UI route is still better, because it also re-triggers the DNS check and
the certificate.

## While you wait

`https://anthonyellis.dev` may keep serving a stale cached copy of the old page for a few
minutes. Hard-refresh with Cmd/Ctrl + Shift + R, or check in a private window.

## Do not delete these files again

Anything at the repo root that isn't obviously "your" content is probably load-bearing:

| File | What it does | Safe to delete? |
|---|---|---|
| `CNAME` | binds anthonyellis.dev to the repo | **No** |
| `index.html` | the landing page | No |
| `404.html` | custom not-found page | Yes, but nice to have |
| `robots.txt` / `sitemap.xml` | search engines | Yes, harmless to keep |
| `resume.pdf` | what the Résumé button links to | No |
| `resume.docx` / `resume-source.html` | Word copy + the file `resume.pdf` is generated from | Yes, but you'll want them |
| `*.md` | notes for you, never served as pages | Yes |

## A safer habit for next time

You don't need to delete a repo to replace its contents. From your clone:

```sh
git add -A          # stages adds, edits AND deletions
git commit -m "Update site"
git push origin main
```

If a push is rejected because histories diverged, the fix is `git pull --rebase origin main`
first — not deleting the repo. And if you ever do want a clean slate, force-push instead so
the settings and the domain binding survive:

```sh
git push --force origin main
```
