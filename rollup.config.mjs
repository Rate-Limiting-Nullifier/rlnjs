
import typescript from 'rollup-plugin-typescript2'
import cleaner from 'rollup-plugin-cleaner'
import { visualizer } from 'rollup-plugin-visualizer'
import * as fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const banner = `/**
 * @module ${pkg.name}
 * @version ${pkg.version}
 * @file ${pkg.description}
 * @copyright Ethereum Foundation 2022
 * @license ${pkg.license}
 * @see [Github]{@link ${pkg.homepage}}
*/`


export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.exports.require,
      name: pkg.exports.require,
      format: 'umd',
      banner,
      exports: 'auto',
      globals: {
        '@ethersproject/bytes': 'bytes',
        '@ethersproject/solidity': 'solidity',
        '@ethersproject/strings': 'strings',
        'snarkjs': 'snarkjs',
        'ffjavascript': 'ffjavascript',
        'poseidon-lite': 'poseidon',
        '@semaphore-protocol/identity': 'identity',
        '@zk-kit/incremental-merkle-tree': 'incrementalMerkleTree',
        '@ethersproject/bytes': 'bytes',
        '@ethersproject/solidity': 'solidity',
        '@ethersproject/strings': 'strings',
        'snarkjs': 'snarkjs',
        'ffjavascript': 'ffjavascript',
        'poseidon-lite': 'poseidon',
        '@semaphore-protocol/identity': 'identity',
        '@zk-kit/incremental-merkle-tree': 'incrementalMerkleTree',
      },
    },
    {
      file: pkg.exports.import,
      name: pkg.exports.import,
      format: 'umd',
      banner,
      globals: {
        '@ethersproject/bytes': 'bytes',
        '@ethersproject/solidity': 'solidity',
        '@ethersproject/strings': 'strings',
        'snarkjs': 'snarkjs',
        'ffjavascript': 'ffjavascript',
        'poseidon-lite': 'poseidon',
        '@semaphore-protocol/identity': 'identity',
        '@zk-kit/incremental-merkle-tree': 'incrementalMerkleTree',
        '@ethersproject/bytes': 'bytes',
        '@ethersproject/solidity': 'solidity',
        '@ethersproject/strings': 'strings',
        'snarkjs': 'snarkjs',
        'ffjavascript': 'ffjavascript',
        'poseidon-lite': 'poseidon',
        '@semaphore-protocol/identity': 'identity',
        '@zk-kit/incremental-merkle-tree': 'incrementalMerkleTree',
      },
    },
  ],
  external: Object.keys(pkg.dependencies),
  plugins: [
    cleaner({
      targets: [
        './dist/',
      ],
    }),
    typescript({
      tsconfig: 'tsconfig.build.json',
      useTsconfigDeclarationDir: true,
    }),
    visualizer({
      emitFile: true,
      filename: 'stats.html',
      template: 'sunburst',
    }),
  ],
}
