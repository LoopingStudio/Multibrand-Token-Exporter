/**
 * Multibrand Token Exporter - Main entry point for the Figma plugin
 * Handles UI initialization and message routing between UI and core functionality
 */

import { exportTokens } from './core/export';

// Translations for notifications
const translations: Record<string, { initError: string; exportError: string }> = {
  fr: {
    initError: "❌ Erreur d'initialisation : ",
    exportError: "❌ Erreur d'export : "
  },
  en: {
    initError: "❌ Initialization Error: ",
    exportError: "❌ Export Error: "
  }
};

let currentLang = 'en';

// Clear the console for a clean start
console.clear();

// Display the plugin UI with specified dimensions
figma.showUI(__html__, { width: 600, height: 500 });

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  // Handle initialization request from UI
  if (msg.type === "init") {
    if (msg.lang) currentLang = msg.lang;
    await handleInitRequest();
  }

  // Handle export request from UI
  if (msg.type === "export") {
    await handleExportRequest(msg.config);
  }
};

/**
 * Handles the initialization request from the UI.
 * Fetches available variable collections and sends them to the UI.
 */
async function handleInitRequest(): Promise<void> {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    // Simplify collections for UI consumption
    const simplifiedCollections = collections.map(c => ({
      id: c.id,
      name: c.name,
      modes: c.modes.map(m => ({ modeId: m.modeId, name: m.name }))
    }));
    figma.ui.postMessage({ type: "init-data", collections: simplifiedCollections });
  } catch (e) {
    console.error('Error during initialization:', e);
    const t = translations[currentLang] || translations.en;
    figma.notify(t.initError + (e instanceof Error ? e.message : String(e)));
  }
}

/**
 * Handles the export request from the UI.
 * @param config Export configuration from the UI
 */
async function handleExportRequest(config: any): Promise<void> {
  try {
    await exportTokens(config);
  } catch (e) {
    console.error('Error during export:', e);
    const t = translations[currentLang] || translations.en;
    figma.notify(t.exportError + (e instanceof Error ? e.message : String(e)));
  }
}