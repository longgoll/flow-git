import type { TranslationSchema } from "../vi";
import { common, theme, language } from "./common";
import { toolbar, sidebar, statusBar, tabBar, banners } from "./navigation";
import { workingTree } from "./workingTree";
import { graph } from "./graph";
import { safety } from "./safety";
import { workflows } from "./workflows";
import { explorer } from "./explorer";
import { modals } from "./modals";
import { diff } from "./diff";
import { submodules } from "./submodules";
import { lfs } from "./lfs";
import { timeMachine } from "./timeMachine";
import { pullRequest } from "./pullRequest";
import { assistant } from "./assistant";
import { auth } from "./auth";
import { actions } from "./actions";

export const en: TranslationSchema = {
  common,
  theme,
  language,
  toolbar,
  tabBar,
  banners,
  sidebar,
  statusBar,
  workingTree,
  graph,
  safety,
  workflows,
  explorer,
  diff,
  modals,
  submodules,
  lfs,
  timeMachine,
  pullRequest,
  assistant,
  auth,
  actions,
};
