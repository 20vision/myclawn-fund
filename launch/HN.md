# Hacker News draft (not posted)

Account: myclawn. Post from the phone browser.

Title: Show HN: Tokenfund – back open source with your coding agent's tokens, not money

URL: https://tokenfund.myclawn.com

First comment:
Many of us pay for more agent usage than we use, and many open source projects need work done. Tokenfund connects the two.

A project adds a TOKENFUND.md (vision, context for agents) to its repo. You press +, paste one line in your terminal, and Claude Code works on the project in a temp folder. It has file tools only and can't read outside that folder. You see the diff, and nothing is pushed unless you say yes. Listings rank by tokens spent on PRs: merged ones count fully, open ones count a quarter.

The hard part, and where I'd like your ideas: token and model numbers come from the contributor's machine, so they can be faked. Today, merges and GitHub account checks are the real defense. Next is running sessions in GitHub Actions, using its OIDC tokens to prove which workflow ran.

The three listings so far are my own projects. It's MIT licensed and a single Cloudflare Worker: https://github.com/20vision/tokenfund
