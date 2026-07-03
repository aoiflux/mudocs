$ErrorActionPreference = "Stop"

$requiredFields = @(
    "source_repo:",
    "source_path:",
    "source_ref:",
    "last_reviewed:",
    "review_owner:",
    "freshness_tier:"
)

$roots = @(
    "content/docs/guide",
    "content/docs/reference",
    "content/docs/security",
    "content/docs/runtime",
    "content/docs/releases"
)

$failures = @()

foreach ($root in $roots) {
    if (-not (Test-Path $root)) {
        continue
    }

    $files = Get-ChildItem -Path $root -Recurse -Filter *.md | Where-Object { $_.Name -ne "_index.md" }
    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw

        if (-not $content.StartsWith("---")) {
            $failures += "Missing frontmatter start: $($file.FullName)"
            continue
        }

        $parts = $content -split "---", 3
        if ($parts.Length -lt 3) {
            $failures += "Invalid frontmatter block: $($file.FullName)"
            continue
        }

        $frontmatter = $parts[1]
        foreach ($field in $requiredFields) {
            if ($frontmatter -notmatch [Regex]::Escape($field)) {
                $failures += "Missing '$field' in $($file.FullName)"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "Documentation validation failed:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "Documentation frontmatter validation passed." -ForegroundColor Green
