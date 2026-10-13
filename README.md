# margin

A minimal English personal blog: cream paper, monospaced type, red links, and a narrow reading column. Live at https://gourmetgg.github.io/.

The blog starts empty. Add posts to `posts` in `content.mjs`. The CV at `/cv/` contains Ding Chen's education and completed coursework; edit the `cv` object to update it.

## Editing

1. Edit `content.mjs` to add or revise posts.
2. Edit `static/style.css` and `static/app.js` for presentation and interactions.
3. Run `node build.mjs` from the repository root with Node.js 22 or newer. No dependency installation is required.
4. Commit the generated files and push to `master`. GitHub Pages publishes the files from the repository root.

The generator writes the homepage, article pages, topics, about page, CV, RSS feed, and sitemap, and checks every local HTML reference. It clears generated article pages before rebuilding so removed posts are no longer published. `.nojekyll` disables Jekyll processing so the output is served as static files.

Inconsolata is self-hosted under the SIL Open Font License in `assets/OFL.txt`. Favorites are stored in each visitor's browser.

## Previous site

The former Hexo site is retained in Git history at commit `96c683e64cbf193448aa2829d6cd9fd3027d7105`. The replacement commit preserves that parent and can be reverted to restore the old site.
