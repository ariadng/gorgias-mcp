export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateInput(input: any, schema: any): ValidationResult {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return { isValid: false, errors };
  }

  // Check required properties
  if (schema.required && Array.isArray(schema.required)) {
    for (const required of schema.required) {
      if (!(required in input)) {
        errors.push(`Missing required property: ${required}`);
      }
    }
  }

  // Check property types and constraints
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (key in input) {
        const value = input[key];
        const propSchema = prop as any;
        
        // Type validation
        if (propSchema.type) {
          if (!validateType(value, propSchema.type)) {
            errors.push(`Property ${key} must be of type ${propSchema.type}`);
          }
        }
        
        // Enum validation
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(`Property ${key} must be one of: ${propSchema.enum.join(', ')}`);
        }
        
        // Number constraints
        if (propSchema.type === 'number' && typeof value === 'number') {
          if (propSchema.minimum !== undefined && value < propSchema.minimum) {
            errors.push(`Property ${key} must be >= ${propSchema.minimum}`);
          }
          if (propSchema.maximum !== undefined && value > propSchema.maximum) {
            errors.push(`Property ${key} must be <= ${propSchema.maximum}`);
          }
        }
        
        // String constraints
        if (propSchema.type === 'string' && typeof value === 'string') {
          if (propSchema.pattern) {
            const regex = new RegExp(propSchema.pattern);
            if (!regex.test(value)) {
              errors.push(`Property ${key} does not match required pattern`);
            }
          }
        }
        
        // Array validation
        if (propSchema.type === 'array' && Array.isArray(value)) {
          if (propSchema.items) {
            for (let i = 0; i < value.length; i++) {
              const itemResult = validateInput({ item: value[i] }, { 
                properties: { item: propSchema.items },
                required: []
              });
              if (!itemResult.isValid) {
                errors.push(`Property ${key}[${i}]: ${itemResult.errors.join(', ')}`);
              }
            }
          }
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially harmful characters and trim
    return input.replace(/[<>]/g, '').trim();
  } else if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  } else if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

export function createValidationError(message: string): Error {
  const error = new Error(message);
  error.name = 'ValidationError';
  return error;
}