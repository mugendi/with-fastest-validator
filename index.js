/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */
import Validator from 'fastest-validator';

// Create a validator instance with options
const v = new Validator({
  useNewCustomCheckerFunction: true,
  defaults: true,
});

// Helper to extract default values from schema
function extractDefaults(schema) {
  const defaults = {};

  for (const [key, value] of Object.entries(schema)) {
    if (value.default !== undefined) {
      defaults[key] = value.default;
    } else if (value.type === 'object' && value.props) {
      defaults[key] = extractDefaults(value.props);
    } else if (typeof value === 'string' && value.includes('default:')) {
      const defaultValue = value.split('default:')[1].split('|')[0];
      defaults[key] = convertDefaultValue(defaultValue);
    }
  }

  return defaults;
}

// Helper to convert string default values to proper types
function convertDefaultValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(value)) return Number(value);
  return value;
}

// Helper to validate the type of a value against a schema
function validateType(value, schema) {
  if (typeof schema === 'string') {
    const type = schema.split('|')[0];
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return true; // Let fastest-validator handle complex types
    }
  }

  if (schema.type === 'object') {
    return typeof value === 'object' && value !== null;
  }

  return true; // Let fastest-validator handle other cases
}

// Validation wrapper factory
export function withValidation(schema, fn) {
  // Compile the schema once
  const check = v.compile(schema);

  // Extract default values from schema
  const defaultValues = extractDefaults(schema);

  return function (...args) {
    // Get parameter names using reflection
    const paramNames =
      fn
        .toString()
        .match(/\((.*?)\)/)?.[1]
        .split(',')
        .map((param) => param.trim()) || [];

    // Create object from parameters for validation
    const paramsObject = paramNames.reduce((obj, param, index) => {
      const schemaForParam = schema[param];
      const providedValue = args[index];

      // If parameter wasn't provided or is undefined
      if (index >= args.length || providedValue === undefined) {
        // Use default if available
        if (defaultValues[param] !== undefined) {
          obj[param] = structuredClone(defaultValues[param]);
        }
        return obj;
      }

      // Validate type before processing
      if (!validateType(providedValue, schemaForParam)) {
        throw new Error(
          JSON.stringify(
            {
              validationErrors: [
                {
                  field: param,
                  type: 'typeError',
                  message: `Invalid type for parameter "${param}"`,
                },
              ],
            },
            null,
            2
          )
        );
      }

      // Handle object types with defaults
      if (
        schemaForParam.type === 'object' &&
        typeof providedValue === 'object'
      ) {
        const defaultForParam = defaultValues[param] || {};
        obj[param] = {
          ...structuredClone(defaultForParam),
          ...providedValue,
        };
      } else {
        obj[param] = providedValue;
      }

      return obj;
    }, {});

    // Validate using fastest-validator
    const validationResult = check(paramsObject);

    // If validation fails, throw error
    if (validationResult !== true) {
      throw new Error(
        JSON.stringify(
          {
            validationErrors: validationResult,
          },
          null,
          2
        )
      );
    }

    // Call original function with validated parameters
    return fn.apply(
      this,
      paramNames.map((param) => paramsObject[param])
    );
  };
}

