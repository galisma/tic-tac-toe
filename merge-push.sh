#!/bin/bash
cd /home/ismael/Proyectos/tic-tac-toe/main

function sync_readme() {
    local branch=$1
    echo "Sincronizando README en rama: $branch"
    git checkout "$branch"
    git checkout main -- README.md
    git add README.md
    git diff-index --quiet HEAD || git commit -m "Update README from main"
    git push origin "$branch"
    git checkout main
}

function merge() {
    git merge -s subtree server -m "Merge server"
    git merge -s subtree client-web -m "Merge client-web"
    git merge -s subtree client-tui -m "Merge client-tui"
}

function push() {
    sync_readme server
    sync_readme client-web
    sync_readme client-tui

    git checkout main
    git push origin main

    echo "Sync complete. READMEs unified."
}

function all() {
    merge
    push
}

case "$1" in
    merge) merge ;;
    push)  push ;;
    all)   all ;;
    *)     echo "Usage: ./merge-push.sh [merge|push|all]" ;;
esac