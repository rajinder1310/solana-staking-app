#!/bin/bash

# Default cluster to localnet if not provided
CLUSTER=${1:-localnet}

echo "Starting deployment process on $CLUSTER..."

# Ensure PATH includes the global solana binary (Already in .bashrc)
# export PATH="/home/user/Antigravity/Solana Blockchain/TokenContract/agave-release/bin/:$PATH"

# Build the project
echo "Building project..."
anchor build

if [ $? -eq 0 ]; then
    echo "Build successful."

    # Handle ENV wallet
    PROVIDER_ARGS=""
    if [ ! -z "$DEPLOYER_KEY" ]; then
        echo "Found DEPLOYER_KEY in env..."

        # Check if key is array (starts with [) or base58 string
        if [[ "$DEPLOYER_KEY" == \[* ]]; then
            echo "Format: JSON Array"
            echo $DEPLOYER_KEY > /tmp/deployer-env.json
        else
            echo "Format: Base58 String (converting...)"
            # Use node to decode base58 to json array
            node -e "
                const bs58 = require('bs58');
                const decoded = bs58.decode('$DEPLOYER_KEY');
                console.log(JSON.stringify(Array.from(decoded)));
            " > /tmp/deployer-env.json
        fi

        PROVIDER_ARGS="--provider.wallet /tmp/deployer-env.json"
    fi

    # Deploy
    echo "Deploying to $CLUSTER..."
    anchor deploy --provider.cluster $CLUSTER $PROVIDER_ARGS

    if [ $? -eq 0 ]; then
        echo "Deployment successful!"
    else
        echo "Deployment failed."
        exit 1
    fi
else
    echo "Build failed."
    exit 1
fi
