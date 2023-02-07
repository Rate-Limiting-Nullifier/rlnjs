
import typescript from 'rollup-plugin-typescript2';
import cleaner from 'rollup-plugin-cleaner';
import { visualizer } from "rollup-plugin-visualizer";

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/rln.js'
  },
  plugins: [
    cleaner({
      targets: [
        './dist/'
      ]
    }),
    typescript({tsconfig: 'tsconfig.build.json'}),
    visualizer({
      emitFile: true,
      filename: "stats.html",
      template: "sunburst"
    }),
  ]
};
