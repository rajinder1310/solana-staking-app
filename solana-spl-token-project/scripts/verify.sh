#!/bin/bash

PROGRAM_ID=$1

if [ -z "$PROGRAM_ID" ]; then
    echo "Usage: ./scripts/verify.sh <program_id>"
    exit 1
fi

echo "Verifying program: $PROGRAM_ID"

# Ensure PATH (Already in .bashrc)
# export PATH="/home/user/Antigravity/Solana Blockchain/TokenContract/agave-release/bin/:$PATH"

anchor verify $PROGRAM_ID

if [ $? -eq 0 ]; then
    echo "Verification successful!"
else
    echo "Verification failed."
    exit 1
fi
