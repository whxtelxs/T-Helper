import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Calculator } from "../calculator/Calculator";
import { EASE_OUT } from "../lib/motion";
import { Menu } from "../menu/Menu";
import { useNav } from "../navigation/NavProvider";
import { routeKey, type Route } from "../navigation/routes";
import { Notepad } from "../notepad/Notepad";
import { PhraseDetail } from "../phrases/PhraseDetail";
import { PhrasesList } from "../phrases/PhrasesList";
import { SituationDetail } from "../situations/SituationDetail";
import { SituationsList } from "../situations/SituationsList";
import { SoftDetail } from "../softs/SoftDetail";
import { SoftsList } from "../softs/SoftsList";
import { Header } from "./Header";
import "./Shell.css";

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 20 }),
  center: { opacity: 1, x: 0, pointerEvents: "auto" as const },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -16,
    pointerEvents: "none" as const,
  }),
};

const FADE_VARIANTS = {
  enter: { opacity: 0, x: 0 },
  center: { opacity: 1, x: 0, pointerEvents: "auto" as const },
  exit: { opacity: 0, x: 0, pointerEvents: "none" as const },
};

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "situations":
      return <SituationsList />;
    case "situation":
      return <SituationDetail id={route.id} />;
    case "softs":
      return <SoftsList />;
    case "soft":
      return <SoftDetail id={route.id} />;
    case "phrases":
      return <PhrasesList />;
    case "phrase":
      return <PhraseDetail id={route.id} />;
    case "notepad":
      return <Notepad />;
    case "calculator":
      return <Calculator />;
    case "menu":
      return <Menu />;
  }
}

export function Shell() {
  const { route, direction } = useNav();
  const reduceMotion = useReducedMotion();

  return (
    <div class="shell">
      <div class="shell-stage">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={routeKey(route)}
            class="shell-screen"
            custom={direction}
            variants={reduceMotion ? FADE_VARIANTS : SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduceMotion ? { duration: 0.1 } : { duration: 0.2, ease: EASE_OUT }
            }
          >
            <Header route={route} />
            <Screen route={route} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
