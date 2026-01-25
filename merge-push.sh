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
    echo "Sincronizando subcarpetas en Main..."
    
    # Intentamos mergear. Si falla porque Git 'olvidó' el vínculo, usamos subtree pull
    git subtree pull --prefix=server server --squash -m "Update server"
    git subtree pull --prefix=client-web client-web --squash -m "Update client-web"
    git subtree pull --prefix=client-tui client-tui --squash -m "Update client-tui"
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