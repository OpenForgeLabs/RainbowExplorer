# Plugin Images Guide

This guide explains where plugin container images come from and how to install them in RainbowExplorer.

## Official image sources

### 1) GitHub Container Registry (recommended)
Use plugin images published to GHCR.

Example (Redis plugin):

```bash
docker pull ghcr.io/openforgelabs/rainbow-redis:latest
```

Versioned tags are created from releases, for example:

```bash
docker pull ghcr.io/openforgelabs/rainbow-redis:v0.1.1
```

### 2) Your own organization registry
You can also use Docker Hub, ECR, ACR, GCR, or private GHCR images.

## Installing a plugin image in the shell

Open `Shell -> Plugin Runner` and fill:
- `Plugin ID`: stable id (e.g. `redis`)
- `Name`: display name
- `Image`: full image reference (e.g. `ghcr.io/openforgelabs/rainbow-redis:latest`)

Then click **Install from image**.

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
      "image": "ghcr.io/openforgelabs/rainbow-redis:latest",
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

### Private image pulls fail
- Authenticate Docker on the runner host:

```bash
docker login ghcr.io
```

- Ensure the runtime can access the registry and image.
