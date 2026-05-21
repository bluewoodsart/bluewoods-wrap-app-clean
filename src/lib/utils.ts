import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert custom string ID to valid UUID v4 format
export function stringToUuid(str: string): string {
  // Create a hash from the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to positive number and pad with zeros
  const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
  
  // Create UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Use the hash to generate consistent UUIDs for the same input
  const uuid = [
    hashStr.slice(0, 8),
    hashStr.slice(0, 4),
    '4' + hashStr.slice(1, 4), // Version 4
    ((parseInt(hashStr[0], 16) & 0x3) | 0x8).toString(16) + hashStr.slice(1, 4), // Variant bits
    (hashStr + hashStr).slice(0, 12)
  ].join('-');
  
  return uuid;
}
