/**
 * @fileoverview Utility Functions for Raw System Application
 * 
 * This module provides common utility functions used throughout the application.
 * Currently includes:
 * - Class name merging utility for Tailwind CSS
 * - Conditional class application with proper conflict resolution
 * 
 * The utilities help maintain consistent styling and reduce code duplication
 * across components while ensuring proper Tailwind CSS class precedence.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges class names with proper Tailwind CSS conflict resolution
 * 
 * @param inputs - Variable number of class values to merge
 * @returns {string} Merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
