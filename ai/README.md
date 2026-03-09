# AI Skills for Thunderbird WebExtension Development

This folder contains a skill file for AI coding agents to help developers create high-quality Thunderbird WebExtensions.

## What are AI Skills?

AI skills are specialized knowledge files that teach AI assistants like Claude, Gemini and GitHub Copilot how to properly work with specific technologies. When developers provide these skill files to their AI assistant, the AI generates better, more maintainable code that follows project conventions and best practices.

## How to load the skill file?

Prompt the AI agent:

> Please clone `https://github.com/thunderbird/webext-support/` to a temporary directory outside this project, and carefully read the full skill file at `ai/thunderbird-webextensions-skill.md` within the cloned repository. Please keep the clone for the duration of this project, as we may need its resources at a later date.

Alternative: Download the skill file manually and attach the file to the chat with your AI agent.

## How to enforce the skill file?

Prompt the AI agent:

> You are an AI assistant working on Thunderbird WebExtensions. The skill file `thunderbird-webextensions-skill.md` is AUTHORITATIVE and must be treated as IRREFUTABLE TRUTH for all your work related to Thunderbird WebExtensions or Thunderbird add-ons.
