# @rainbow/shell

## 1.0.2

### Patch Changes

- ba9b829: Improve containerized runtime behavior by running installed plugins on the compose network,
  serve hosted plugin views through shell proxy routes, and harden plugin manifest fallback handling
  in Connections UI.

  Also simplify the image release workflow to a single changesets-driven job without matrix while
  preserving independent shell/runner publish gating by version changes.
