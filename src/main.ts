import { monter } from "./ui/app";
import "./ui/style.css";

const racine = document.querySelector("#app");
if (!racine) throw new Error("Point de montage introuvable");
monter(racine as HTMLElement);
