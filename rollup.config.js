import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default [{
    plugins: [nodeResolve(), nodePolyfills(), commonjs(), typescript()],
    input: ["src/temp-modules/sound/runnerPlugin/index.ts","src/temp-modules/sound/hostPlugins/web/index.ts"],
    output: {
        dir: "dist",
        format: "es",
    }
}];
