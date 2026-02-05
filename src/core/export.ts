import { sanitizeName, insertTokenIntoTree, toKebabCase, sanitizeFolderName, sortTokensAlphabetically, createExportMetadata } from './utils';
import { resolveBrandColors } from './resolve';

// Translations for notifications
const translations: Record<string, { analyzing: string; exportFinished: string }> = {
  fr: {
    analyzing: "⏳ Analyse en cours...",
    exportFinished: "✅ Export terminé !"
  },
  en: {
    analyzing: "⏳ Analysing...",
    exportFinished: "✅ Export finished!"
  }
};

/**
 * Export configuration interface
 */
export interface ExportConfig {
  tokenCollectionId: string;
  primitiveCollectionId: string;
  brands: Array<{
    name: string;
    light?: { modeId: string; primitiveModeId: string };
    dark?: { modeId: string; primitiveModeId: string };
  }>;
  lang?: string;
}

/**
 * Token object structure
 */
export interface TokenObject {
  name: string;
  type: "token";
  path: string;
  modes: Record<string, any>;
}

/**
 * Exports color tokens from the specified Figma variable collections and organizes them into a nested array structure.
 * This is the main export function that processes all variables and creates the final token structure.
 * @param config Configuration object containing collection IDs and brand definitions
 */
export async function exportTokens(config: ExportConfig): Promise<void> {
  const lang = config.lang || 'en';
  const t = translations[lang] || translations.en;

  figma.notify(t.analyzing); // Notify user that analysis has started

  const { tokenCollectionId, primitiveCollectionId, brands } = config;

  // Validate and retrieve collections
  const { variables } = await validateAndGetCollections(tokenCollectionId, primitiveCollectionId);

  // Process variables and build token structure
  const rootArray = await processVariables(variables, brands);

  // Sort tokens and categories alphabetically
  const sortedTokens = sortTokensAlphabetically(rootArray);

  // Create final export structure with metadata
  const exportData = {
    metadata: createExportMetadata(),
    tokens: sortedTokens
  };

  // Send the exported data to the UI for download
  figma.ui.postMessage({ type: "download-json", data: exportData });
  figma.notify(t.exportFinished);
}

/**
 * Validates collection IDs and retrieves the relevant variables.
 * @param tokenCollectionId ID of the token collection
 * @param primitiveCollectionId ID of the primitive collection
 * @returns Object containing the validated collections and filtered variables
 */
async function validateAndGetCollections(tokenCollectionId: string, primitiveCollectionId: string) {
  // Fetch all local variable collections
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  
  // Find the collections for primitives and tokens
  const primitivesColl = collections.find(c => c.id === primitiveCollectionId);
  const tokensColl = collections.find(c => c.id === tokenCollectionId);

  if (!primitivesColl || !tokensColl) {
    throw new Error("Collections not found - please check your collection IDs");
  }

  // Get all variables and filter to only those in the token collection
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const variables = allVariables.filter(v => v.variableCollectionId === tokenCollectionId);

  return { primitivesColl, tokensColl, variables };
}

/**
 * Processes all variables and builds the nested token structure.
 * @param variables Array of Figma variables to process
 * @param brands Array of brand configurations
 * @returns Root array containing the organized token structure
 */
async function processVariables(variables: Variable[], brands: any[]): Promise<any[]> {
  // Root array to hold the nested token structure
  const rootArray: any[] = [];

  // Iterate through each variable in the token collection
  for (const variable of variables) {
    // Only process color variables
    if (variable.resolvedType !== 'COLOR') continue;

    const tokenObj = await createTokenObject(variable, brands);
    const { folders } = parseVariablePath(variable.name);
    
    // Insert the token into the correct nested group structure
    insertTokenIntoTree(rootArray, folders, tokenObj);
  }
  
  return rootArray;
}

/**
 * Creates a token object from a Figma variable.
 * @param variable The Figma variable to process
 * @param brands Array of brand configurations
 * @returns Token object with resolved colors
 */
async function createTokenObject(variable: Variable, brands: any[]): Promise<TokenObject> {
  const { filename } = parseVariablePath(variable.name);
  
  // Build the token object with metadata and resolved color modes
  const tokenObj: TokenObject = {
    name: filename,
    type: "token", // Explicit marker for token type
    path: variable.name,
    modes: {}
  };

  // Resolve color values for each brand and mode
  for (const brand of brands) {
    const brandResult = await resolveBrandColors(variable, brand);
    tokenObj.modes[brand.name] = brandResult;
  }
  
  return tokenObj;
}

/**
 * Parses a variable name into folder path and filename.
 * @param variableName Full variable name with path separators
 * @returns Object with folders array and filename
 */
function parseVariablePath(variableName: string): { folders: string[]; filename: string } {
  // Split the variable name into folder path and filename
  const parts = variableName.split("/");
  const folders = parts.slice(0, -1).map(sanitizeFolderName);
  let filename = toKebabCase(parts[parts.length - 1]);

  // If filename is numeric, prepend previous folder name for clarity
  if (/^\d+$/.test(parts[parts.length - 1]) && parts.length > 1) {
    const previousFolderName = toKebabCase(parts[parts.length - 2]);
    filename = `${previousFolderName}-${parts[parts.length - 1]}`;
  }
  
  return { folders, filename };
}