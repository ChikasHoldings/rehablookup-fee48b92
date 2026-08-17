# Claude Code skills

Skills checked into this repo are loaded automatically by Claude Code for any
session opened on it (local CLI, IDE extension, or Claude Code on the web).

## Installed skills

| Skill | Source |
| --- | --- |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design), commit `f379e5ad66e2febc1616cf8d6284666fecbe514e` |

## Installing a skill globally on your own machine

A repo-local skill only applies to this project. To make one available in every
project on a machine, copy it into the user-level skills directory:

```sh
mkdir -p ~/.claude/skills
cp -r .claude/skills/frontend-design ~/.claude/skills/
```

Restart Claude Code (or start a new session) afterwards so the skill is picked up.

## Updating a skill

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/anthropics/skills.git /tmp/anthropic-skills
git -C /tmp/anthropic-skills sparse-checkout set skills/frontend-design
cp /tmp/anthropic-skills/skills/frontend-design/* .claude/skills/frontend-design/
```
