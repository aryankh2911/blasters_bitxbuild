"use client";

import { createContext, useContext } from "react";

export type EngineTheme = "light" | "dark";
export const EngineThemeContext = createContext<EngineTheme>("light");
export const useEngineTheme = () => useContext(EngineThemeContext);
