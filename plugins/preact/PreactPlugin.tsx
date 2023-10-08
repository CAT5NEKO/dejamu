import { FunctionComponent } from "npm:preact/";
import { renderToString } from "npm:preact-render-to-string/";
import * as path from "../../deps/path.ts";
import { initializeConstantsForBuildTime } from "../constants.ts";

import "../islands/hooks.tsx";
import { getIslands } from "../islands/hooks.tsx";
import * as PluginSystem from "../../pluginSystem/PluginSystem.ts";
import { DejamuPlugin } from "../../pluginSystem/Plugin.ts";
import { copyAssets, initAssets } from "../asset.ts";
import { getHeadChildren } from "../Head.tsx";

export const PreactPlugin = (): DejamuPlugin => {
  return {
    type: "esbuild",
    plugin: {
      name: "PreactPlugin",
      async setup(build) {
        await initAssets(build.initialOptions.outdir!);

        build.onResolve({ filter: /\.[jt]sx$/ }, async (args) => {
          if (
            args.kind != "entry-point" ||
            args.namespace == "PreactPlugin-stdin" ||
            args.path == "PreactPlugin-stdin"
          ) return;

          let jsFilePath = path.join(
            build.initialOptions.outdir ?? "./",
            path.relative(Deno.cwd(), path.dirname(args.path)),
            path.basename(args.path, path.extname(args.path)),
          ) +
            ".js";

          const htmlFilePath = path.join(
            build.initialOptions.outdir ?? "./",
            path.relative(Deno.cwd(), path.dirname(args.path)).split(path.SEP)
              .slice(1).join(path.SEP),
            path.basename(args.path, path.extname(args.path)) + ".html",
          );

          const pageDirectory = path.join(
            path.relative(Deno.cwd(), path.dirname(args.path)).split(path.SEP)
              .slice(1).join(path.SEP),
          );

          jsFilePath = path.relative(path.dirname(htmlFilePath), jsFilePath);

          initializeConstantsForBuildTime(pageDirectory);

          const { default: Page }: { default: FunctionComponent } =
            await import(
              path.toFileUrl(path.resolve(args.path)).toString()
            );

          const body = renderToString(<Page />);

          const islands = [...getIslands()];

          const res = await PluginSystem.build(
            islands,
            body,
            htmlFilePath,
            jsFilePath,
            getHeadChildren(),
          );

          await copyAssets();

          return {
            namespace: "PreactPlugin",
            path: args.path,
            pluginData: res,
          };
        });

        build.onLoad(
          { filter: /.*/, namespace: "PreactPlugin" },
          (args) => {
            return args.pluginData;
          },
        );
      },
    },
  };
};
