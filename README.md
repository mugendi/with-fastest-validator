# with-fastest-validator

A lightweight wrapper around fastest-validator that provides automatic parameter validation, default values, and type checking for JavaScript functions with zero configuration.

## Features

- 🚀 Zero configuration required
- 💪 Powered by fastest-validator
- 🎯 Automatic function parameter validation 
- 🔄 Smart default value handling
- 🌳 Deep object validation
- 🔍 Type checking and conversion
- 🎁 Works with all function types (regular, arrow, class methods)

## Installation

```bash
npm install with-fastest-validator fastest-validator
```

## Quick Start

```javascript
import { withValidation } from 'with-fastest-validator';

// Create a validated function
const createUser = withValidation(
  {
    username: 'string|min:3',
    email: 'email',
    options: {
      type: 'object',
      default: { sendEmail: true }
    }
  },
  function(username, email, options) {
    // Your implementation here
  }
);

// Use it normally - validation and defaults are automatic
createUser('john_doe', 'john@example.com');
createUser('john_doe', 'john@example.com', { sendEmail: false });
```

## Schema Types

### Basic Types
```javascript
const fn = withValidation({
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  email: 'email',
  date: 'date',
  enum: 'enum|values:foo,bar,baz'
}, function(string, number, boolean, email, date, enum) {
  // All parameters are validated
});
```

### Optional Fields & Default Values
```javascript
const fn = withValidation({
  // Required field
  username: 'string',
  
  // Optional with default
  role: 'string|optional|default:user',
  
  // Object with defaults
  options: {
    type: 'object',
    default: {
      notify: true,
      retries: 3
    }
  }
}, function(username, role, options) {
  // options is automatically populated
});

// These are equivalent:
fn('john');  // role = 'user', options = { notify: true, retries: 3 }
fn('john', 'admin');  // options = { notify: true, retries: 3 }
fn('john', 'admin', { notify: false });  // options = { notify: false, retries: 3 }
```

### Deep Object Validation

```javascript
const createPost = withValidation(
  {
    title: 'string',
    metadata: {
      type: 'object',
      default: {
        status: 'draft',
        seo: {
          title: '',
          tags: []
        }
      },
      props: {
        status: 'string|optional|default:draft',
        seo: {
          type: 'object',
          optional: true,
          props: {
            title: 'string|optional|default:',
            tags: { 
              type: 'array', 
              optional: true,
              default: [],
              items: 'string'
            }
          }
        }
      }
    }
  },
  function(title, metadata) {
    // metadata is fully validated with defaults
  }
);

// All valid:
createPost('Hello');
createPost('Hello', { status: 'published' });
createPost('Hello', { seo: { title: 'SEO Title' } });
```

### Array Validation

```javascript
const createTags = withValidation({
  tags: {
    type: 'array',
    items: 'string',
    min: 1,
    max: 5
  }
}, function(tags) {
  // tags is validated as an array of strings
});
```

### Custom Validation Rules

```javascript
const processPayment = withValidation({
  amount: { 
    type: 'number',
    positive: true,
    custom: (value, errors) => {
      if (value > 10000) {
        errors.push({ type: 'highAmount', actual: value });
        return value;
      }
      return value;
    },
    messages: {
      highAmount: 'Amount exceeds maximum allowed (10000)'
    }
  }
}, function(amount) {
  // amount is validated with custom rules
});
```

## Class Usage

### Validating Constructor Arguments

You can validate class constructor arguments using two approaches:

#### 1. Using a Base Validated Class (Recommended)

```javascript
// Base class to extend from
class ValidatedClass {
  constructor(validationSchema, ...args) {
    const validate = withValidation(
      validationSchema,
      (...params) => params
    );
    return validate(...args);
  }
}

// Your class extends ValidatedClass
class User extends ValidatedClass {
  constructor(username, email, options = {}) {
    // Validate constructor arguments
    const [validUsername, validEmail, validOptions] = super(
      {
        username: 'string|min:3|max:20',
        email: 'email',
        options: {
          type: 'object',
          default: {
            isAdmin: false,
            notifications: true,
            language: 'en'
          },
          props: {
            isAdmin: 'boolean|optional|default:false',
            notifications: 'boolean|optional|default:true',
            language: 'string|optional|default:en'
          }
        }
      },
      username,
      email,
      options
    );

    // Use validated values
    this.username = validUsername;
    this.email = validEmail;
    this.options = validOptions;
  }
}

// Usage
const user = new User('john_doe', 'john@example.com', { isAdmin: true });
```

#### 2. Direct Validation in Constructor

```javascript
class Product {
  constructor(name, price, metadata = {}) {
    const validate = withValidation(
      {
        name: {
          type: 'string',
          min: 2,
          pattern: /^[a-zA-Z0-9\s-]+$/
        },
        price: {
          type: 'number',
          positive: true,
          precision: 2
        },
        metadata: {
          type: 'object',
          default: {
            category: 'uncategorized',
            inStock: true
          }
        }
      },
      (...params) => params
    );
    
    const [validName, validPrice, validMetadata] = validate(name, price, metadata);
    
    this.name = validName;
    this.price = validPrice;
    this.metadata = validMetadata;
  }
}
```

### Validating Class Methods

```javascript
class UserService {
  constructor() {
    this.createUser = withValidation({
      username: 'string|min:3',
      email: 'email'
    }, this.createUser.bind(this));
  }

  createUser(username, email) {
    // Method is validated
  }
}
```

## Error Handling

The validator provides detailed error messages:

```javascript
try {
  await createUser('a', 'invalid-email');
} catch (error) {
  console.error(error.message);
  // {
  //   "validationErrors": [
  //     { "field": "username", "message": "String length must be greater than 3" },
  //     { "field": "email", "message": "Invalid email format" }
  //   ]
  // }
}
```

## Best Practices

1. Use shorthand notation for simple rules:
```javascript
// Good - concise
field: 'string|min:3|max:20|optional|default:guest'

// Also good, but verbose
field: {
  type: 'string',
  min: 3,
  max: 20,
  optional: true,
  default: 'guest'
}
```

2. Set meaningful defaults for optional fields:
```javascript
options: {
  type: 'object',
  default: {
    retry: true,
    timeout: 5000
  }
}
```

3. Use custom validators for complex rules:
```javascript
password: {
  type: 'string',
  custom: (value, errors) => {
    if (!/[A-Z]/.test(value)) {
      errors.push({ type: 'uppercase', message: 'Missing uppercase letter' });
    }
    return value;
  }
}
```

## TypeScript Support

The package includes TypeScript type definitions:

```typescript
import { withValidation } from 'with-fastest-validator';

const createUser = withValidation({
  username: 'string',
  age: 'number'
}, (username: string, age: number) => {
  // Types are inferred
});
```

## Credits

This package is built on top of the excellent [fastest-validator](https://github.com/icebob/fastest-validator) library.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.