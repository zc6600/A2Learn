# A2Learn


## Overview

Input: resources (file or directory)

Agent Pipeline (OpenRouter + LangGraph):
- understand resource
- generate A2UI v0.9 messages in one pass
- render website by A2UI framework (@a2ui/lit + @a2ui/web_core)
- return local preview url
/agentic building(explore filesystem when building)

Output: Interative Learning website: url



## Start

```bash 
bash setup.sh
```

## Run

```bash
# 推荐放到 .env（会自动加载）
# OPENROUTER_API_KEY=your_key
# OPENROUTER_MODEL=deepseek/deepseek-v4-flash

# run with a resource path (A2UI renderer)
bash start.sh ./docs 8010
```

This will:

- generate `outputs/<task_id>/site_messages.json`
- copy messages to `apps/viewer/public/generated/site_messages.json`
- launch A2UI viewer at `http://127.0.0.1:8010`

## Docs

- `docs/discussion-summary.md`
- `docs/a2ui-integration-notes.md`
- `docs/fast-mode-design.md`



## Resources

### Review in Notion 

<https://www.notion.so/A2UI-34e2580dd0b68088822fd0e650266c97>

### A2UI

``` bash 
git clone https://github.com/google/A2UI
```
