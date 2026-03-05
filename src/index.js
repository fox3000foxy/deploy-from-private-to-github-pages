// src/index.js
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