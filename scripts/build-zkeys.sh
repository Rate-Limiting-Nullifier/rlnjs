#!/bin/bash
#
# Clone rln-circuits and build params
#

install_circom_script='./scripts/install-circom.sh'

rln_circuits_version=5577cba
rln_circuits_repo_url='https://github.com/Rate-Limiting-Nullifier/rln-circuits-v2.git'
rln_circuits_repo='rln-circuits-v2'

rln_circuits_relative_path='./circuits/rln.circom'
rln_circuits_build_script='./scripts/build-circuits.sh'
built_params_relative_path="$rln_circuits_repo/build/zkeyFiles"
target_zkeyfiles_dir="./zkeyFiles/rln"
target_rln_wasm_path="$target_zkeyfiles_dir/rln.wasm"
target_rln_zkey_path="$target_zkeyfiles_dir/rln_final.zkey"
target_rln_verifiation_key_path="$target_zkeyfiles_dir/verification_key.json"

# Build params if any of them does not exist
if [[ -f $target_rln_wasm_path ]] && [[ -f $target_rln_zkey_path ]] && [[ -f $target_rln_verifiation_key_path ]]; then
    echo "All params exist. Don't build them"
    exit 0;
fi

# Go to project root
cd `dirname $0`/..

# Make sure circom is installed
bash $install_circom_script
which circom && circom --version

git clone $rln_circuits_repo_url $rln_circuits_repo
# Go to circuits repo and the right version
cd $rln_circuits_repo
git checkout $rln_circuits_version
# Install the deps and the project
npm install
# Replace "snarkjs" with "npx snarkjs" to use the locally installed snarkjs
sed -i.bak "s/^snarkjs /npx snarkjs /" "$rln_circuits_build_script"
# Build circuits
bash "${rln_circuits_build_script}" rln

# Go back to rlnjs project root
cd ..
# Copy the built params to the zkeyFiles folder in rlnjs
mkdir -p $target_zkeyfiles_dir
cp $built_params_relative_path/* $target_zkeyfiles_dir
ls -al $target_zkeyfiles_dir
# Remove the circuits repo
rm -rf $rln_circuits_repo
