import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { SettingsWindow } from "./components/settings/SettingsWindow";
import "./styles/global.css";

const label = getCurrentWindow().label;
const Root = label === "settings" ? SettingsWindow : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
