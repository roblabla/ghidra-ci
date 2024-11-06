const { symlinkSync } = require("fs");
const NodeGit = require("nodegit");
const path = require("path");
const { stderr } = require("process");

async function main() {
    const repoName = process.argv[2];
    const commitFrom = process.argv[3];
    const commitTo = process.argv[4];

    console.error(`Generating commit for range ${commitFrom}..${commitTo}`);

    const pathToRepo = path.resolve("../");
    const repo = await NodeGit.Repository.open(pathToRepo);

    const revwalk = NodeGit.Revwalk.create(repo);
    revwalk.reset();
    const res = revwalk.pushRange(`${commitFrom}..${commitTo}`);
    if (res !== 0) {
        throw "Failed to push range: " + res;
    }

    const graph = [];
    const childMap = new Map();

    while (true) {
        let commitId;

        try {
            commitId = await revwalk.next();
        } catch (err) {
            console.error(err);
            break;
        }

        const commit = await NodeGit.Commit.lookup(repo, commitId);
        const isMerge = commit.parentcount() != 1;
        if (isMerge) {
            const otherParent = await commit.parent(1);
            childMap.set(otherParent.sha(), graph.length);
            graph.push({
                type: "merge",
                message: commit.message(),
                sha: commit.sha(),
                children: []
            });
        } else if (childMap.has(commit.sha())) {
            const rootMergeIdx = childMap.get(commit.sha());
            graph[rootMergeIdx].children.push({
                message: commit.message(),
                sha: commit.sha(),
            });

            for (let parentId of commit.parents()) {
                let parent = await NodeGit.Commit.lookup(repo, parentId);
                childMap.set(parent.sha(), rootMergeIdx);
            }
        } else {
            graph.push({
                type: "simple",
                message: commit.message(),
                sha: commit.sha(),
            });
        }
    }

    var generatedMarkdown = "# Changelog\n\n";

    generatedMarkdown += `Commit range: [${commitFrom}..${commitTo}](https://github.com/${repoName}/compare/${commitFrom}...${commitTo})\n\n`;

    for (let change of graph) {
        if (change.type == "merge") {
            if (change.children.length === 1) {
                generatedMarkdown += formatCommit(change.children[0], false);
            } else {
                generatedMarkdown += formatCommit(change, false)
                generatedMarkdown += "\n  <details><summary>Commit details</summary>\n\n"
                for (let innerChange of change.children) {
                    generatedMarkdown += "    " + formatCommit(innerChange, true);
                }
                generatedMarkdown += "  </details>\n";
            }
        } else {
            generatedMarkdown += formatCommit(change, false);
        }
    }

    console.log(generatedMarkdown);
}

function formatCommit(change, isChild) {
    let replaceWithSpaces = isChild ? "\n      " : "\n  ";
    const linkSha = `[${change.sha.slice(0, 8)}](https://github.com/${repoName}/commit/${change.sha})`
    return "- " + linkSha + " " + change.message.trim().split("\n").join(replaceWithSpaces) + "\n";
}

main().catch(function(err) {
    console.error(err)
});
