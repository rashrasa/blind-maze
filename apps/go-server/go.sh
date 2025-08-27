#!/bin/bash

export GOCACHE="${PWD}/.go/"

if [[ $1 == "--run" ]]; then
    go run . | exit
elif [[ $1 == "--test" ]]; then
    go test | exit
else
    echo "Argument required. Try running with --run or --test"
fi

read -p "Press enter to exit" x