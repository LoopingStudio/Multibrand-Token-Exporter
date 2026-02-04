import { parseColorValue } from './utils';

/**
 * Color resolution functions for handling Figma variable aliases and primitives
 */

/**
 * Interface for color resolution result
 */
export interface ColorResult {
  hex: string;
  primitiveName: string;
}

/**
 * Checks if a value is a variable alias
 */
function isVariableAlias(value: any): value is VariableAlias {
  return value && value.type === "VARIABLE_ALIAS";
}

/**
 * Creates a fallback color result for unresolved cases
 */
function createFallbackResult(primitiveName: string): ColorResult {
  return { hex: "#FF00FF", primitiveName }; // Magenta for debugging
}

/**
 * Attempts to resolve a variable value using a specific mode
 */
async function resolveVariableValue(
  variable: Variable, 
  modeId: string, 
  modeName?: string
): Promise<ColorResult | null> {
  const value = variable.valuesByMode[modeId];
  
  if (!value) return null;
  
  if (!isVariableAlias(value)) {
    const suffix = modeName ? ` (${modeName})` : '';
    return {
      hex: parseColorValue(value),
      primitiveName: `${variable.name}${suffix}`
    };
  }
  
  return null;
}

/**
 * Finds a matching mode in a collection based on mode type (light/dark)
 */
async function findMatchingMode(
  variable: Variable, 
  brandModeType: 'light' | 'dark'
): Promise<{ modeId: string; modeName: string } | null> {
  if (!variable.variableCollectionId) return null;
  
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    if (!collection) return null;
    
    const matchingMode = collection.modes.find(mode => 
      mode.name.toLowerCase().includes(brandModeType)
    );
    
    return matchingMode ? { modeId: matchingMode.modeId, modeName: matchingMode.name } : null;
  } catch (error) {
    console.warn("Error accessing variable collection:", error);
    return null;
  }
}

/**
 * Resolves the color value for a variable in a given mode, handling aliases and primitives.
 * This function handles both direct color values and variable aliases that point to primitive colors.
 * It also handles recursive resolution when the "primitive" is actually a token with modes.
 * @param variable The Figma variable to resolve
 * @param modeId The mode ID to resolve for (e.g., light/dark)
 * @param primitiveModeId The primitive mode ID for alias resolution
 * @param brandModeType The mode type ('light' or 'dark') to use for recursive token resolution
 * @returns Object with hex color and primitive name
 */
export async function resolveColor(
  variable: Variable, 
  modeId: string, 
  primitiveModeId: string,
  brandModeType?: 'light' | 'dark'
): Promise<ColorResult> {
  const value = variable.valuesByMode[modeId];
  
  // Handle direct color values (non-alias)
  if (!isVariableAlias(value)) {
    return { 
      hex: parseColorValue(value), 
      primitiveName: "Raw" 
    };
  }
  
  // Resolve variable alias
  const aliasId = (value as VariableAlias).id;
  const primitiveVar = await figma.variables.getVariableByIdAsync(aliasId);
  
  if (!primitiveVar) {
    return createFallbackResult("Unresolved");
  }
  
  // Try to resolve using the specified primitive mode
  const directResult = await resolveVariableValue(primitiveVar, primitiveModeId);
  if (directResult) {
    return directResult;
  }
  
  // If brandModeType is provided, try to find a matching mode
  if (brandModeType) {
    const matchingMode = await findMatchingMode(primitiveVar, brandModeType);
    if (matchingMode) {
      const modeResult = await resolveVariableValue(primitiveVar, matchingMode.modeId, matchingMode.modeName);
      if (modeResult) {
        return modeResult;
      }
      
      // Handle recursive alias resolution
      const modeValue = primitiveVar.valuesByMode[matchingMode.modeId];
      if (isVariableAlias(modeValue)) {
        const nestedResult = await resolveColor(primitiveVar, matchingMode.modeId, matchingMode.modeId, brandModeType);
        return {
          hex: nestedResult.hex,
          primitiveName: `${primitiveVar.name} → ${nestedResult.primitiveName}`
        };
      }
    }
  }
  
  // Fallback: use the first available mode
  const availableModes = Object.keys(primitiveVar.valuesByMode);
  if (availableModes.length > 0) {
    const fallbackResult = await resolveVariableValue(primitiveVar, availableModes[0], "fallback");
    if (fallbackResult) {
      return fallbackResult;
    }
  }
  
  return createFallbackResult(`Unresolved: ${primitiveVar.name}`);
}

/**
 * Resolves color values for all modes of a brand configuration.
 * @param variable The Figma variable to resolve
 * @param brand Brand configuration with light/dark mode settings
 * @returns Object with resolved colors and primitive names for available modes
 */
export async function resolveBrandColors(
  variable: Variable, 
  brand: any
): Promise<any> {
  const brandResult: any = {};
  
  if (brand.light?.modeId) {
    // Resolve color for light mode with brand mode type for recursive token resolution
    const res = await resolveColor(variable, brand.light.modeId, brand.light.primitiveModeId, 'light');
    brandResult.light = res;
  }
  
  if (brand.dark?.modeId) {
    // Resolve color for dark mode with brand mode type for recursive token resolution
    const res = await resolveColor(variable, brand.dark.modeId, brand.dark.primitiveModeId, 'dark');
    brandResult.dark = res;
  }
  
  return brandResult;
}