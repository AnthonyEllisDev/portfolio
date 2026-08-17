# Deploying

Everything in this folder belongs at the **root of the `portfolio` repo**, including the
`CNAME` file — that one is what binds anthonyellis.dev to the repo. See `RECOVERY.md` if
the custom domain is currently broken.

```sh
# 1. go to your local clone (or clone it fresh)
cd ~/path/to/portfolio
#    git clone https://github.com/AnthonyEllisDev/portfolio.git && cd portfolio

# 2. unzip this archive into it
unzip -o ~/Downloads/portfolio-site.zip -d /tmp/psite
cp -R /tmp/psite/portfolio-site/. .

# 3. check it locally BEFORE pushing — file:// looks unstyled, a server won't
python3 -m http.server 8000        # open http://localhost:8000, click every link
#    Ctrl-C when you're happy

# 4. ship it
git add -A
git commit -m "Restore CNAME, update GitHub username, add resume"
git push origin main
```

Pushing to `main` is the deploy. Pages rebuilds in a minute or two; hard-refresh
(Cmd/Ctrl + Shift + R) if you still see the old page.

## Before you send the résumé anywhere

The site and `resume.pdf` both list **anthony@anthonyellis.dev**, which does not exist
until you set up forwarding — `EMAIL-SETUP.md` walks through it (free, ~15 minutes).

To go back to Gmail instead, one command swaps every mention:

```sh
grep -rl 'anthony@anthonyellis.dev' . --include='*.html' \
  | xargs sed -i '' 's/anthony@anthonyellis.dev/ellisanthony1995@gmail.com/g'   # macOS
# on Linux, drop the '' after -i
```

…then re-export `resume.pdf` from `resume-source.html` (open in Chrome → Print → Save as
PDF, Letter, margins **None**, background graphics **on**).

## Checklist after deploying

- [ ] `https://anthonyellis.dev/` shows the landing page (not the old plain one)
- [ ] Settings → Pages shows the custom domain with a green DNS check
- [ ] All three **Launch demo** buttons run
- [ ] All three **Read the write-up** links work
- [ ] `https://anthonyellis.dev/resume.pdf` downloads the one-page résumé
- [ ] `https://anthonyellis.dev/nope` shows the custom 404
- [ ] Every GitHub link goes to `github.com/AnthonyEllisDev`
- [ ] Mail to `anthony@anthonyellis.dev` lands in your Gmail
