# Plugin Images Guide

This guide explains where plugin container images come from and how to install them in RainbowExplorer.

## Official image sources

### 1) GitHub Container Registry (recommended)
Use plugin images published to GHCR.

Example (Redis plugin):

```bash
docker pull ghcr.io/openforgelabs/rainbow-plugin-redis:latest
```

Versioned tags are created from releases, for example:

```bash
docker pull ghcr.io/openforgelabs/rainbow-plugin-redis:v0.1.1
```

### 2) Your own organization registry
You can also use Docker Hub, ECR, ACR, GCR, or private GHCR images.

## Installing a plugin image in the shell

Open `Shell -> Plugins` and provide only:
- `Image`: full image reference (e.g. `ghcr.io/openforgelabs/rainbow-plugin-redis:latest`)

Then click **Install from image**.

The runner will:
1. infer plugin id from image name,
2. start container,
3. read plugin manifest from `/plugins/<pluginId>/api/plugin-manifest`,
4. persist plugin metadata in `~/.rainbow/plugin-registry.json`.

## Naming/manifest convention

To work with auto-installation, keep these aligned:
- image repo name -> plugin slug (`rainbow-plugin-redis` -> `redis`)
- Next.js `basePath` -> `/plugins/<pluginId>`
- manifest endpoint -> `/plugins/<pluginId>/api/plugin-manifest`
- `manifest.id` -> `<pluginId>`

## Optional plugin catalog

The runner UI supports a catalog JSON via:

```bash
NEXT_PUBLIC_PLUGIN_CATALOG_URL=https://your-domain/catalog.json
```

Expected shape:

```json
{
  "plugins": [
    {
      "id": "redis",
      "name": "Redis",
      "image": "ghcr.io/openforgelabs/rainbow-plugin-redis:latest",
      "description": "Redis explorer plugin",
      "tags": ["database", "redis"]
    }
  ]
}
```

## Troubleshooting

### "Runner is not reachable"
- Ensure plugin runner is up.
- Verify `NEXT_PUBLIC_PLUGIN_RUNNER_URL`.

### "No image recorded for this plugin"
- Reinstall that plugin from image once.

### "Manifest id does not match inferred id"
- Align image naming, basePath, and `manifest.id` under the same `<pluginId>`.

### Private image pulls fail
- Authenticate Docker on the runner host:

```bash
docker login ghcr.io
```

- Ensure the runtime can access the registry and image.
