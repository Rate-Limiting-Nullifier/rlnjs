#!/bin/bash
#
# Clone rln-circuits and build params
#
# Usage:
#   ./scripts/build-zkeys.sh <circuit_name>
# Example:
#   Build rln-same circuit
#   $ ./scripts/build-zkeys.sh rln-same
#   Build rln-diff circuit
#   $ ./scripts/build-zkeys.sh rln-diff
#   Build withdraw circuit
#   $ ./scripts/build-zkeys.sh withdraw
#   Build all circuits defined in `supported_circuit_names
#   $ ./scripts/build-zkeys.sh

#
# Configs
#
supported_circuit_names=("rln-same" "rln-diff" "withdraw")

rln_circuits_version=10437bc
rln_circuits_repo='circom-rln'
rln_circuits_repo_url="https://github.com/Rate-Limiting-Nullifier/$rln_circuits_repo.git"

#
# Determine which circuits to build
#

declare -a circuit_names_to_build

circuit_name_arg=$1;

# Check if the circuit name is supported
for name in "${supported_circuit_names[@]}"
do
    if [ "$circuit_name_arg" == "$name" ]; then
        circuit_names_to_build=($circuit_name_arg)
        break
    fi
done
# If circuit name
if [ -z "$circuit_names_to_build" ] && [ -z "$circuit_name_arg" ]; then
    circuit_names_to_build=("${supported_circuit_names[@]}")
fi

install_circom_script='./scripts/install-circom.sh'
rln_circuits_build_script='./scripts/build-circuits.sh'

# Go to project root of rlnjs
cd `dirname $0`/..

# Make sure circom is installed
bash $install_circom_script
which circom && circom --version

# Clone rln_circuits_repo, checkout the right version, and install the deps
git clone $rln_circuits_repo_url $rln_circuits_repo
# Go to circuits repo and the right version
cd $rln_circuits_repo
git checkout $rln_circuits_version
# Install the deps and the project
npm install
# Replace "snarkjs" with "npx snarkjs" to use the locally installed snarkjs
sed -i.bak "s/^snarkjs /npx snarkjs /" "$rln_circuits_build_script"

build_and_copy_params() {
    # We should already be in the rln-circuits-v2 project root
    circuit_name=$1

    # Return if the params already exist
    # rlnjs
    # |_rln-circuits-v2
    # |_zkeyFiles
    target_zkeyfiles_dir="../zkeyFiles/$circuit_name"
    target_rln_wasm_path="$target_zkeyfiles_dir/circuit.wasm"
    target_rln_zkey_path="$target_zkeyfiles_dir/final.zkey"
    target_rln_verifiation_key_path="$target_zkeyfiles_dir/verification_key.json"
    if [[ -f $target_rln_wasm_path ]] && [[ -f $target_rln_zkey_path ]] && [[ -f $target_rln_verifiation_key_path ]]; then
        echo "All params exist. Don't build them"
        return
    fi

    # Build the params
    rln_circuits_build_script_args="";
    if [[ $circuit_name == "rln-same" ]]; then
        rln_circuits_build_script_args="same"
    elif [[ $circuit_name == "rln-diff" ]]; then
        rln_circuits_build_script_args="diff"
    else
        rln_circuits_build_script_args="withdraw"
    fi
    echo "Building circuit: $circuit_name"
    bash "$rln_circuits_build_script" $rln_circuits_build_script_args

    mkdir -p $target_zkeyfiles_dir
    # Copy params from rln-circuits-v2/zkeyFiles/v2/<circuit_name> to rlnjs/zkeyFiles/<circuit_name>
    built_params_relative_path="./zkeyFiles/v2/$circuit_name"

    cp $built_params_relative_path/rln.wasm $target_rln_wasm_path
    cp $built_params_relative_path/rln_final.zkey $target_rln_zkey_path
    cp $built_params_relative_path/verification_key.json $target_rln_verifiation_key_path
    ls -al $target_zkeyfiles_dir
}

for circuit_name in "${circuit_names_to_build[@]}"
do
    build_and_copy_params $circuit_name
done

# Remove the circuits repo
cd ..
rm -rf $rln_circuits_repo
