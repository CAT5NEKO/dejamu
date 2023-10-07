import { ComponentType } from "npm:preact";
import { resolve } from "../../deps/path.ts";
import { nanoid } from "../../deps/nanoid.ts";
import * as fs from "../../deps/fs.ts";
import * as path from "../../deps/path.ts";
import { dymport } from "../../utils/dymport.ts";

export interface Island {
  id: string;
  modulePath: string;
  exportName: string;
  component: ComponentType;
}

export interface IslandsState {
  islands: Island[];
}

let current: IslandsState;

export const getIslandsState = () => current;

export const initIslandsState = () => {
  current = {
    islands: [],
  };
};

initIslandsState();

export const filterIslandsFiles = (paths: string[]) => {
  return paths.filter((x) => /\.islands\.[jt]sx$/.test(x));
};

export async function registerIslands(root: string) {
  for await (const item of fs.expandGlob("**/*.islands.{jsx,tsx}", { root })) {
    const modulePath = path.toFileUrl(item.path).toString();
    const module = await dymport(modulePath);

    for (const [k, v] of Object.entries(module)) {
      if (typeof v != "function") continue;

      current.islands.push({
        id: nanoid(),
        modulePath: modulePath,
        exportName: k,
        component: v as any,
      });
    }
  }
}
