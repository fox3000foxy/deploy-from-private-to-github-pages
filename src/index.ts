import { DefaultArtifactClient } from '@actions/artifact';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as github from '@actions/github';

async function run() {
  try {
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
      core.info(`downloading artifact id ${artifactId}`);
      const client = new DefaultArtifactClient();
      // the artifact client will create a folder named after the artifact;
      // our build job names it "dist" so the contents land in ./dist
      const downloadResponse = await client.downloadArtifact(artifactId, { path: './' });
      core.info(`artifact downloaded to ${downloadResponse.downloadPath || '<unknown>'}`);
    }

    // clone or initialize
    await exec('git', ['clone', `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${target}.git`, 'deploy'], { ignoreReturnCode: true });
    await exec('git', ['-C', 'deploy', 'checkout', '-B', branch]);

    // copy files from workspace
    await exec('cp', ['-R', 'dist/*', 'deploy/']);

    await exec('git', ['-C', 'deploy', 'add', '-A']);
    await exec('git', ['-C', 'deploy', 'commit', '-m', `Deploy from ${repo}@${github.context.sha}`], { ignoreReturnCode: true });
    await exec('git', ['-C', 'deploy', 'push', 'origin', branch, '--force']);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();