---
title: "Built-ins"
date: 2026-07-03T00:00:00Z
draft: false
weight: 8
source_repo: "aoiflux/mutant"
source_path: "builtin/builtin.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Mutant includes built-ins for core language support, diagnostics, capabilities,
filesystem access, networking, scripting, and graph operations.

{{< specgrid >}}

{{< specgroup title="Core Built-ins" >}}

- `len`
- `putf`
- `putln`
- `gets`
- `push`
- `pop`
- `first`
- `last`
- `rest`

{{< /specgroup >}}

{{< specgroup title="Security Diagnostics" >}}

- `debug_status`
- `sandbox_status`
- `security_diagnostics`

{{< /specgroup >}}

{{< specgroup title="Command Execution" >}}

- `exec_string`
- `cmd_builder`
- `cmd_add`
- `cmd_run`

{{< /specgroup >}}

{{< specgroup title="Filesystem" >}}

- `fs_read`
- `fs_write`
- `fs_append`
- `fs_delete`
- `fs_exists`
- `fs_stat`
- `fs_list`
- `fs_mkdir`
- `fs_copy`
- `fs_move`

{{< /specgroup >}}

{{< specgroup title="Network" >}}

- `net_resolve`
- `net_dial`
- `http_get`
- `http_post`
- `http_request`

{{< /specgroup >}}

{{< specgroup title="Scripting" >}}

- `lua_run_string`
- `lua_run_file`
- `lua_run_http`

{{< /specgroup >}}

{{< specgroup title="Graph Database" >}}

- `db_open`
- `db_open_disk`
- `db_close`
- `db_add_node`
- `db_add_edge`
- `db_index_prop`
- `db_query_nodes`
- `db_bfs`
- `db_shortest_path`
- `db_stats`

{{< /specgroup >}}

{{< /specgrid >}}

## Capability Notes

Some built-ins are gated by security capabilities such as command execution,
filesystem, and network access. Those constraints are documented in the security
section.

## Example

```mut
putf("Hi");
```

## Canonical Source

This page is adapted from upstream
[builtin/builtin.go](https://github.com/aoiflux/mutant/blob/main/builtin/builtin.go)
and
[evaluator/eval_builtin.go](https://github.com/aoiflux/mutant/blob/main/evaluator/eval_builtin.go).
