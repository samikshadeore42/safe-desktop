## Envio Indexer

*Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features*

Visit http://localhost:8080 to see the GraphQL Playground, local password is `testing`.

step1: pnpm i


### Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm run codegen
```

step3 cd generated
docker compose up

### Run

```bash
pnpm dev
```
<!-- TUI_OFF=true pnpm start -->


### Pre-requisites

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/)
