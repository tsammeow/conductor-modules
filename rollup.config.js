import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default [{
    plugins: [nodePolyfills(), commonjs(), nodeResolve(), typescript()],
    input: "src/temp-modules/sound/runnerPlugin/index.ts",
    output: {
        file: "dist/index.js",
        format: "es",
    }
},{
    plugins: [nodePolyfills(), commonjs(), nodeResolve(), typescript()],
    input: "src/temp-modules/sound/hostPlugins/web/index.ts",
    output: {
        file: "dist/index2.js",
        format: "es",
    }
}];
