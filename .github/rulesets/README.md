# Branch rulesets

Wersjonowane źródło prawdy dla rulesetów GitHuba (Settings → Rules → Rulesets).
GitHub nie czyta tych plików automatycznie — po zmianie zastosuj przez `gh`:

```bash
# aktualizacja istniejącego rulesetu
gh api repos/klaps-hq/api.klaps.space/rulesets/13251477 --method PUT --input .github/rulesets/main.json
gh api repos/klaps-hq/api.klaps.space/rulesets/13251471 --method PUT --input .github/rulesets/dev.json

# utworzenie od zera (np. po skasowaniu)
gh api repos/klaps-hq/api.klaps.space/rulesets --method POST --input .github/rulesets/main.json
```

| Plik        | Ruleset                   | ID       |
| ----------- | ------------------------- | -------- |
| `main.json` | main - PR required checks | 13251477 |
| `dev.json`  | dev - PR required checks  | 13251471 |
