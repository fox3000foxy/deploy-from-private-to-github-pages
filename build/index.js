"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const artifact_1 = require("@actions/artifact");
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec");
const github = __importStar(require("@actions/github"));
async function run() {
    try {
        // compute target repository (input overrides auto-detection)
        const repo = process.env.GITHUB_REPOSITORY || '';
        const [owner, name] = repo.split('/');
        let target = core.getInput('repo');
        if (!target) {
            if (name.endsWith('.github.io')) {
                target = repo;
            }
            else {
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
            // crée dist puis dézippe l'artefact dedans
            await (0, exec_1.exec)('mkdir', ['-p', 'dist']);
            core.info(`downloading artifact id ${artifactId} into ./dist`);
            const client = new artifact_1.DefaultArtifactClient();
            const downloadResponse = await client.downloadArtifact(artifactId, { path: './dist' });
            core.info(`artifact downloaded to ${downloadResponse.downloadPath || '<unknown>'}`);
        }
        // clone or initialize
        await (0, exec_1.exec)('git', ['clone', `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${target}.git`, 'deploy'], { ignoreReturnCode: true });
        await (0, exec_1.exec)('git', ['-C', 'deploy', 'checkout', '-B', branch]);
        // copy files from workspace
        await (0, exec_1.exec)('cp', ['-R', 'dist/.', 'deploy/']);
        await (0, exec_1.exec)('git', ['-C', 'deploy', 'add', '-A']);
        // identité de commit pour GitHub Actions bot
        await (0, exec_1.exec)('git', ['-C', 'deploy', 'config', 'user.name', 'github-actions[bot]']);
        await (0, exec_1.exec)('git', ['-C', 'deploy', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
        await (0, exec_1.exec)('git', ['-C', 'deploy', 'commit', '-m', `Deploy from ${repo}@${github.context.sha}`], { ignoreReturnCode: true });
        await (0, exec_1.exec)('git', ['-C', 'deploy', 'push', 'origin', branch, '--force']);
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
