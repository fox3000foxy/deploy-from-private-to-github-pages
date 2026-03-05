import { DefaultArtifactClient } from '@actions/artifact';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as github from '@actions/github';

async function run() {
  try {
    const token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
    if (!token) {
      throw new Error(
        "No token provided. Set input 'token' (recommended for cross-repo deploys) or GITHUB_TOKEN.",
      );
    }
    core.setSecret(token);

    // compute target repository (input overrides auto-detection)
    const repo = process.env.GITHUB_REPOSITORY || '';
    const [owner, name] = repo.split('/');
    let target = core.getInput('repo');
    if (!target) {
      if (name.endsWith('.github.io')) {
        target = repo;
      } else {
        target = `${owner}/${owner}.github.io`;
      }
    }

    const branch = core.getInput('branch') || 'deploy';

    const artifactInput = core.getInput('artifact');
    if (artifactInput) {
      const artifactId = parseInt(artifactInput, 10);
      if (isNaN(artifactId)) {
        throw new Error(`artifact input '${artifactInput}' is not a valid numeric ID`);
      }

      // Create dist then unzip/download the artifact into it.
      await exec('mkdir', ['-p', 'dist']);

      core.info(`downloading artifact id ${artifactId} into ./dist`);
      const client = new DefaultArtifactClient();
      const downloadResponse = await client.downloadArtifact(artifactId, { path: './dist' });
      core.info(`artifact downloaded to ${downloadResponse.downloadPath || '<unknown>'}`);
    }

    // Clone target repository.
    const encodedToken = encodeURIComponent(token);
    const cloneExitCode = await exec(
      'git',
      ['clone', `https://x-access-token:${encodedToken}@github.com/${target}.git`, 'deploy'],
      { ignoreReturnCode: true },
    );
    if (cloneExitCode !== 0) {
      throw new Error(
        `Failed to clone '${target}'. Ensure the provided token has 'contents:write' access to that repository.`,
      );
    }
    await exec('git', ['-C', 'deploy', 'checkout', '-B', branch]);

    // copy files from workspace
    await exec('cp', ['-R', 'dist/.', 'deploy/']);

    await exec('git', ['-C', 'deploy', 'add', '-A']);

    // Configure commit identity for GitHub Actions bot.
    await exec('git', ['-C', 'deploy', 'config', 'user.name', 'github-actions[bot]']);
    await exec('git', ['-C', 'deploy', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);

    await exec('git', ['-C', 'deploy', 'commit', '-m', `Deploy from ${repo}@${github.context.sha}`], { ignoreReturnCode: true });
    await exec('git', ['-C', 'deploy', 'push', 'origin', branch, '--force']);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();