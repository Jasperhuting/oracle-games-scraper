# Oracle Games Scraper – JSON Publishing

This repo is configured to auto-publish the `output/` directory to GitHub Pages on each push to `main`/`master` using GitHub Actions.

## How it works
- Workflow: `.github/workflows/publish-pages.yml`
- On push, it uploads a site artifact containing:
  - `output/` (your JSON files)
  - `.nojekyll` (so files are served as-is)
- Deploys to GitHub Pages.

## One-time setup in GitHub
1. Push this repository to GitHub.
2. In GitHub: Settings → Pages → Build and deployment → Source = "GitHub Actions".
3. Wait for the workflow to finish (Actions tab).

## URL structure
Once deployed, files are accessible over HTTPS:

- Project Pages URL format:
  - `https://<username>.github.io/<repo>/output/...`
  - Example:
    - `https://<username>.github.io/<repo>/output/startlist-vuelta-a-espana-2025.json`
    - `https://<username>.github.io/<repo>/output/2025/tour-de-france/1/results.json`

Tip: For stronger global caching and stable CORS, you can also use jsDelivr (public repos):
- Latest on default branch:
  - `https://cdn.jsdelivr.net/gh/<username>/<repo>/output/...`
- Pin to a commit:
  - `https://cdn.jsdelivr.net/gh/<username>/<repo>@<commit-sha>/output/...`

## CORS and caching
- GitHub Pages generally serves with permissive CORS suitable for fetching JSON from browsers.
- GitHub Pages doesn’t support custom headers. If you need precise cache controls, consider using jsDelivr or a CDN.

## Updating data
- Commit and push any changes to `output/`.
- The workflow runs automatically and repUBLISHes the site.

## Local paths
- Data should live under `output/`:
  - `output/2025/tour-de-france/1/results.json`
  - `output/startlist-tour-de-france-2025.json`

If you have questions or want a private setup (S3 + CloudFront), open an issue.
