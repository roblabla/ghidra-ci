# Ghidra CI

Here, you'll find nightly builds of the NSA's [Ghidra], a Software Reverse
Engineering framework. In particular, it creates a single cross-platform ZIP
as close as possible to the official builds.

## How it works.

The CI can be found in the [.github/workflows] folder. There are two main
components:

- `check_new_commits.yml`: Responsible for comparing the latest release of this
  repo with the Upstream's latest commits, to find out if some new commits were
  made since the last run (Ghidra doesn't get new commits every day, so we avoid
  doing unnecessary rebuilds on the silent days).
- `ci.yml`: Actually does the work of building the CI.

There's also `simulate_activity.yml`, which is mostly there to work around
[Github disabling workflows after two months of inactivity]. By simulating
activity on the master branch, we avoid this.

### Check new commits

`check_new_commits.yml` runs every night. It parses the latest release name to
find out which commit it was built from. It then checks whether this matches
the latest commit from NSA's Ghidra master branch. If it doesn't, it triggers
the `ci.yml` workflow through a [`workflow_dispatch`] call.

### CI

The actual CI is split in two jobs:

- `build-natives`: Builds the native binaries for all the supported platforms.
  This job will install the necessary tools to build the native binaries on the
  given platform, and run `gradle buildNatives_<target>`. Note that, for building
  on arm64, we copy over `linux_arm_64.init.gradle` or `mac_arm_64.init.gradle`
  to the `~/.gradle/init.gradle`. This is used to cross-compile the ARM64
  binaries from an X64 host. This is used because GitHub does not provide an
  ARM64 Github Runner, so cross-compilation must be used.
  
- `dist`: Downloads all the artifacts from `build-natives`, downloads the
  FunctionID from the [`ghidra-data`] repository, and runs `gradle buildGhidra`.
  This will create a cross-platform dist, which is then uploaded to the releases.
  Finally, the `generate_changelog.js` script is run to generate the changelog.

## Remaining work

There are several improvements to be made:

1. The Eclipse IDE plugin should be built. This is not really possible today,
   as eclipse IDE plugins can only be built through manual action from the
   Eclipse IDE software.



[.github/workflows]: .github/workflows
[Ghidra]: https://github.com/NationalSecurityAgency/ghidra
[ghidra-data]: https://github.com/NationalSecurityAgency/ghidra-data
[Github disabling workflows after two months of inactivity]: https://docs.github.com/en/actions/managing-workflow-runs/disabling-and-enabling-a-workflow
[`workflow_dispatch`]: https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow
