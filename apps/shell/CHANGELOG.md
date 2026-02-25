# @rainbow/shell

## 1.0.3

### Patch Changes

- 1259bec: Improve hosted plugin UX and refresh behavior in shell.

  - Apply theme updates immediately in embedded plugin views without manual page reload.
  - Make plugin hosted view full-bleed (remove shell title/header frame around iframe).
  - Fix plugin and connections refresh flows after install and manual refresh actions.

## 1.0.2

### Patch Changes

- ba9b829: Improve containerized runtime behavior by running installed plugins on the compose network,
  serve hosted plugin views through shell proxy routes, and harden plugin manifest fallback handling
  in Connections UI.

  Also simplify the image release workflow to a single changesets-driven job without matrix while
  preserving independent shell/runner publish gating by version changes.
