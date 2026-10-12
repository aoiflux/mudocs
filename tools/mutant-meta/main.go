// Command mudocsmeta writes the builtin metadata of one Mutant source tree as
// JSON. It is not built in this repository: scripts/mutant-meta.mjs copies it
// into a `git archive` of the pinned Mutant commit, as cmd/mudocsmeta, and
// runs it there with Mutant's own go.mod (Mutant's module path is `mutant`, so
// its packages cannot be imported from outside the module).
//
// Everything is read from builtin.Builtins and the metadata accessors that
// cmd/gendocs uses, so the count matches CAPABILITY_REFERENCE.md at that commit.
//
// Usage (inside the Mutant tree): go run ./cmd/mudocsmeta -out <path>
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"

	"mutant/builtin"
)

type entry struct {
	Name         string   `json:"name"`
	Category     string   `json:"category"`
	Stability    string   `json:"stability"`
	ReplacedBy   string   `json:"replacedBy,omitempty"`
	Platforms    []string `json:"platforms"` // empty: every platform (builtin.PlatformSupport)
	PlatformNote string   `json:"platformNote,omitempty"`
	Documented   bool     `json:"documented"`
}

type output struct {
	Count    int     `json:"count"`
	Builtins []entry `json:"builtins"`
}

func main() {
	out := flag.String("out", "", "file to write the JSON to")
	flag.Parse()
	if *out == "" {
		fmt.Fprintln(os.Stderr, "mudocsmeta: -out is required")
		os.Exit(2)
	}

	entries := make([]entry, 0, len(builtin.Builtins))
	for _, def := range builtin.Builtins {
		stability, _ := builtin.StabilityOf(def.Name)
		replacement, _ := builtin.DeprecatedBy(def.Name)
		platforms, note := builtin.PlatformSupport(def.Name)
		if platforms == nil {
			platforms = []string{}
		}
		entries = append(entries, entry{
			Name:         def.Name,
			Category:     builtin.CapabilityCategory(def.Name),
			Stability:    string(stability),
			ReplacedBy:   replacement,
			Platforms:    platforms,
			PlatformNote: note,
			Documented:   builtin.HasTeachingCoverage(def.Name),
		})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name < entries[j].Name })

	data, err := json.MarshalIndent(output{
		Count:    len(entries),
		Builtins: entries,
	}, "", "\t")
	if err != nil {
		fmt.Fprintln(os.Stderr, "mudocsmeta:", err)
		os.Exit(1)
	}
	if err := os.WriteFile(*out, append(data, '\n'), 0o644); err != nil {
		fmt.Fprintln(os.Stderr, "mudocsmeta:", err)
		os.Exit(1)
	}
}
