#!/usr/bin/env bash

function test_exists () {
	cmd=$1
	type $cmd 2>&1 || { echo >&2 "$cmd not installed?  Aborting."; exit 1; }
}

test_exists node
test_exists npm
test_exists grunt
test_exists phantomjs

npm install && grunt