#!/bin/dash
# POSIX shell script to run all Firebase emulators and then run Firebase tests

cd firebase || exit 1
firebase emulators:exec "npm run test:firebase"