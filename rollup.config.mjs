
import typescript from 'rollup-plugin-typescript2';
import cleaner from 'rollup-plugin-cleaner';
import { visualizer } from "rollup-plugin-visualizer";
import * as fs from "fs"

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"))
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
    { file: pkg.exports.require, format: "cjs", banner, exports: "auto" },
    { file: pkg.exports.import, format: "es", banner }
  ],
  external: Object.keys(pkg.dependencies),
  plugins: [
    cleaner({
      targets: [
        './dist/'
      ]
    }),
    typescript({
      tsconfig: 'tsconfig.build.json',
      useTsconfigDeclarationDir: true
    }),
    visualizer({
      emitFile: true,
      filename: "stats.html",
      template: "sunburst"
    }),
  ]
};
