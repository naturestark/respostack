#!/bin/bash
git init
git add .
git commit -m "Initial commit: Respostack"
git branch -M main
git remote add origin https://github.com/naturestark/respostack.git
git push -u origin main
