# mudocs

[Official website for mutant](https://mudocs.netlify.app)

## Docs Overhaul Status

This repository is currently migrating from a legacy docs layout to a new IA:

- Guide
- Reference
- Security
- Runtime
- Examples
- Releases

Canonical-source policy and manual update workflow are documented in `docs/`.

The site now uses a local Hugo docs shell instead of depending on the empty Dot
theme submodule.

### How to run development server

```bash
hugo server -D
```

### Theme used

This website uses a custom local Hugo docs shell with manual update workflow and
canonical source links.

![Home Page](./pics/home.png)
