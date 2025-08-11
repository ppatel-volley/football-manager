import "./styles/Global.scss"

import { init } from "@noriginmedia/norigin-spatial-navigation"
import React from "react"
import { createRoot } from "react-dom/client"

import { App } from "./components/App"

init()

const rootElement = document.getElementById("root")

if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(<App />)
