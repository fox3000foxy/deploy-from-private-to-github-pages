// src/index.js
import artifact from '@actions/artifact';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as github from '@actions/github';

async function run() {
  try {
    // compute target repository (input overrides auto-detection)
    let target = core.getInput('repo');
    if (!target) {
      const repo = process.env.GITHUB_REPOSITORY; // owner/name
      const [owner, name] = repo.split('/');
      if (name.endsWith('.github.io')) {
        target = repo;
      } else {
        target = `${owner}/${owner}.github.io`;
      }
    }

    // branch, default provided by action metadata
    const branch = core.getInput('branch') || 'deploy';

    // optionally download an artifact generated earlier in the workflow
    const artifactName = core.getInput('artifact');
    if (artifactName) {
      core.info(`downloading artifact '${artifactName}'`);
      const client = artifact.create();
      // by default the client will create a directory named after the
      // artifact. our build job names the artifact `dist`, so the contents
      // will end up in ./dist which matches the later copy step.
      const downloadResponse = await client.downloadArtifact(artifactName, './');
      core.info(`artifact downloaded to ${downloadResponse.downloadPath || '<unknown>'}`);
    }

    // clone or initialize
    await exec('git', ['clone', `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${target}.git`, 'deploy'], {ignoreReturnCode: true});
    await exec('git', ['-C', 'deploy', 'checkout', '-B', branch]);

    // copy files from workspace (assumes dist/ was downloaded)
    await exec('cp', ['-R', 'dist/*', 'deploy/']);

    await exec('git', ['-C', 'deploy', 'add', '-A']);
    await exec('git', ['-C', 'deploy', 'commit', '-m', `Deploy from ${repo}@${github.context.sha}`], {ignoreReturnCode: true});
    await exec('git', ['-C', 'deploy', 'push', 'origin', branch, '--force']);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();