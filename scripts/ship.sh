#!/bin/sh
# Ships the current branch: push, open a pull request, wait for tests, merge, wait for the deploy.
# Usage: scripts/ship.sh "Pull request title" "Pull request body"
set -e
branch=$(git branch --show-current)
npm test > /dev/null
git push -q -u origin "$branch"
gh pr create --title "$1" --body "$2" > /dev/null
sleep 20
gh pr checks --watch > /dev/null
gh pr merge --merge > /dev/null
git checkout -q main
git pull -q
sleep 10
run=$(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run" --exit-status > /dev/null
echo "Shipped $branch. Live build: $(curl -s https://tusingw29.github.io/carter-island-prototype/ | grep -o 'name="build" content="[0-9a-f]*"')"
