# deploy-from-private-to-github-pages

GitHub Action that deploys a build directory to a GitHub Pages repository.

## Inputs

- `repo` *(optional)* – full repository name (`owner/name`).
  Defaults to the inferred Pages repository (e.g. `owner/owner.github.io`).

- `branch` *(optional)* – branch to push on the target repo.
  Defaults to `deploy`.

- `artifact` *(optional)* – **ID** of an artifact produced by an earlier job.
  GitHub assigns a numeric ID when artifacts are uploaded; you can pass that
  number here. The action will download the artifact into a folder matching
  its name (e.g. `dist`), so the deploy step works consistently. Useful when
  build and deploy run in separate jobs.

- `token` *(optional but recommended for cross-repo deploys)* – token used to
  clone and push the target repository. If omitted, the action falls back to
  `GITHUB_TOKEN` from the workflow environment.

  Important: the default `GITHUB_TOKEN` usually cannot push to a different
  repository. For `owner/repo -> owner/owner.github.io` deployments, use a PAT
  or GitHub App token that has `contents: write` on the target repository.

## Example usage

```yaml
- uses: fox3000foxy/deploy-from-private-to-github-pages@v1
  with:
    # repo: another-account/pages-repo  # optional
    # branch: production                # optional
    token: ${{ secrets.DEPLOY_TOKEN }} # define secrets.DEPLOY_TOKEN and put it a PAT in it
```

No build step is included; the action assumes a `dist/` directory already exists in the workspace (e.g. produced by your earlier steps).

## Workflow example

Here is a complete workflow that builds a project with pnpm and then deploys the resulting `dist` directory using this action:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact_id: ${{ steps.upload.outputs.artifact-id }}

    steps:
      - name: Checkout source repository
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 'latest'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint with ESLint
        run: pnpm run lint

      - name: Build project
        run: pnpm run build

      - name: Upload build output
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout source repository
        uses: actions/checkout@v3

      - name: Deploy to GitHub Pages
        uses: fox3000foxy/deploy-from-private-to-github-pages@v1
        with:
          artifact: ${{ needs.build.outputs.artifact_id }}
          token: ${{ secrets.DEPLOY_TOKEN }}
        # the action will auto-detect the target pages repo and use a deploy branch by default

```