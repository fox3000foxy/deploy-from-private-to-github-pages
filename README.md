# deploy-from-private-to-github-pages

GitHub Action that deploys a build directory to a GitHub Pages repository.

## Inputs

- `repo` *(optional)* – full repository name (`owner/name`).
  Defaults to the inferred Pages repository (e.g. `owner/owner.github.io`).

- `branch` *(optional)* – branch to push on the target repo.
  Defaults to `deploy`.

- `artifact` *(optional)* – name of an artifact produced by an earlier job.
  If supplied the action will download the artifact to the workspace before
  copying its contents; useful when build and deploy run in separate jobs.

## Example usage

```yaml
- uses: fox3000foxy/deploy-from-private-to-github-pages@v1
  with:
    # repo: another-account/pages-repo  # optional
    # branch: production                # optional
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
  deploy:
    runs-on: ubuntu-latest

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

      - name: Deploy to GitHub Pages
        uses: fox3000foxy/deploy-from-private-to-github-pages@v1
        # the action assumes a `dist` directory is present
        # it will auto-detect the target pages repo and use a deploy branch by default
```