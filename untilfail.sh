#!/bin/bash

count=0; while npm test; do (( count++ )); echo "$count"; done && say Tests have finished
